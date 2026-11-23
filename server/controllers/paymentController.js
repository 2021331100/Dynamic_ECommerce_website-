import Stripe from "stripe";
import database from "../database/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const paymentWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).send("Invalid webhook signature.");
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const client = await database.connect();
      let stockUnavailable = false;

      try {
        await client.query("BEGIN");
        const paymentResult = await client.query(
          `SELECT p.order_id, p.payment_status
           FROM payments p
           JOIN orders o ON o.id = p.order_id
           WHERE p.payment_intent_id = $1
           FOR UPDATE OF p, o`,
          [intent.id]
        );

        if (!paymentResult.rows[0]) {
          throw new Error("Payment record is not available yet.");
        }

        const { order_id: orderId, payment_status: paymentStatus } = paymentResult.rows[0];
        if (paymentStatus === "Paid") {
          await client.query("COMMIT");
          return res.status(200).json({ received: true, duplicate: true });
        }

        const items = await client.query(
          `SELECT oi.product_id, oi.quantity, p.stock
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = $1
           FOR UPDATE OF p`,
          [orderId]
        );

        if (!items.rows.length || items.rows.some((item) => Number(item.stock) < Number(item.quantity))) {
          stockUnavailable = true;
          await client.query("ROLLBACK");
        } else {
          for (const item of items.rows) {
            const updated = await client.query(
              "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id",
              [item.quantity, item.product_id]
            );
            if (!updated.rows.length) {
              stockUnavailable = true;
              break;
            }
          }

          if (stockUnavailable) {
            await client.query("ROLLBACK");
          } else {
            await client.query(
              "UPDATE payments SET payment_status = 'Paid' WHERE payment_intent_id = $1",
              [intent.id]
            );
            await client.query(
              "UPDATE orders SET paid_at = COALESCE(paid_at, NOW()) WHERE id = $1",
              [orderId]
            );
            await client.query("COMMIT");
          }
        }

        if (stockUnavailable) {
          // Payment was captured but stock is no longer available. Refund rather than
          // confirming an order that cannot be fulfilled.
          await stripe.refunds.create({ payment_intent: intent.id });
          await client.query(
            "UPDATE payments SET payment_status = 'Failed' WHERE payment_intent_id = $1 AND payment_status = 'Pending'",
            [intent.id]
          );
          await client.query(
            "UPDATE orders SET order_status = 'Cancelled' WHERE id = $1 AND paid_at IS NULL",
            [orderId]
          );
        }
      } finally {
        client.release();
      }
    } else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      const intent = event.data.object;
      await database.query(
        "UPDATE payments SET payment_status = 'Failed' WHERE payment_intent_id = $1 AND payment_status = 'Pending'",
        [intent.id]
      );
      await database.query(
        "UPDATE orders SET order_status = 'Cancelled' WHERE id = (SELECT order_id FROM payments WHERE payment_intent_id = $1) AND paid_at IS NULL",
        [intent.id]
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error.message);
    // A non-2xx response tells Stripe to retry transient processing failures.
    return res.status(500).json({ received: false });
  }
};
