import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import { generatePaymentIntent } from "../utils/generatePaymentIntent.js";

export const placeNewOrder = catchAsyncErrors(async (req, res, next) => {
  const { full_name, state, city, country, address, pincode, phone, orderedItems } = req.body;
  if (![full_name, state, city, country, address, pincode, phone].every((value) => typeof value === "string" && value.trim())) {
    return next(new ErrorHandler("Please provide complete shipping details.", 400));
  }

  let items;
  try {
    items = Array.isArray(orderedItems)
      ? orderedItems
      : JSON.parse(orderedItems);
  } catch {
    return next(new ErrorHandler("Cart items must be valid JSON.", 400));
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return next(new ErrorHandler("Cart must contain between 1 and 50 items.", 400));
  }

  const normalizedItems = [];
  for (const item of items) {
    const productId = item?.product?.id;
    const quantity = Number(item?.quantity);
    if (
      typeof productId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return next(new ErrorHandler("Cart contains an invalid product or quantity.", 400));
    }
    normalizedItems.push({ productId, quantity });
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const client = await database.connect();
  let paymentResponse;

  try {
    await client.query("BEGIN");
    const productResult = await client.query(
      "SELECT id, price, stock, name, images FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE",
      [productIds]
    );
    const productMap = new Map(productResult.rows.map((product) => [product.id, product]));

    if (productMap.size !== productIds.length) {
      throw new ErrorHandler("One or more products no longer exist.", 404);
    }

    const requestedByProduct = new Map();
    for (const item of normalizedItems) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) || 0) + item.quantity
      );
    }

    for (const [productId, quantity] of requestedByProduct) {
      const product = productMap.get(productId);
      if (quantity > Number(product.stock)) {
        throw new ErrorHandler(`Only ${product.stock} units available for ${product.name}.`, 400);
      }
    }

    const subtotal = normalizedItems.reduce((sum, item) => {
      return sum + Number(productMap.get(item.productId).price) * item.quantity;
    }, 0);
    const taxRate = 0.18;
    const shippingPrice = subtotal >= 5000 ? 0 : 200;
    const totalPrice = Math.round(subtotal + subtotal * taxRate + shippingPrice);

    const orderResult = await client.query(
      "INSERT INTO orders (buyer_id, total_price, tax_price, shipping_price) VALUES ($1, $2, $3, $4) RETURNING id",
      [req.user.id, totalPrice, taxRate, shippingPrice]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      const imageUrl = Array.isArray(product.images) ? product.images[0]?.url || "" : "";
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price, image, title) VALUES ($1, $2, $3, $4, $5, $6)",
        [orderId, product.id, item.quantity, product.price, imageUrl, product.name]
      );
    }

    await client.query(
      "INSERT INTO shipping_info (order_id, full_name, state, city, country, address, pincode, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [orderId, full_name.trim(), state.trim(), city.trim(), country.trim(), address.trim(), pincode.trim(), phone.trim()]
    );

    // The order, line items, shipping data and payment record are committed together.
    paymentResponse = await generatePaymentIntent(orderId, totalPrice);
    if (!paymentResponse.success) {
      throw new ErrorHandler("Payment could not be initialized. Please try again.", 502);
    }

    await client.query(
      "INSERT INTO payments (order_id, payment_type, payment_status, payment_intent_id) VALUES ($1, $2, $3, $4)",
      [orderId, "Online", "Pending", paymentResponse.paymentIntentId]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      message: "Order created. Complete payment to confirm it.",
      paymentIntent: paymentResponse.clientSecret,
      total_price: totalPrice,
      orderId,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (paymentResponse?.paymentIntentId) {
      // Best-effort cancellation if the database transaction did not commit.
      // The Stripe secret is read from the environment by the payment utility.
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.paymentIntents.cancel(paymentResponse.paymentIntentId);
      } catch (cancelError) {
        console.error("Could not cancel orphaned payment intent:", cancelError.message);
      }
    }
    return next(error);
  } finally {
    client.release();
  }
});

export const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const result = await database.query(
    `
    SELECT
      o.*,
      COALESCE(
        json_agg(json_build_object(
          'order_item_id', oi.id,
          'order_id', oi.order_id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'price', oi.price,
          'image', oi.image,
          'title', oi.title
        )) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS order_items,
      json_build_object(
        'full_name', s.full_name,
        'state', s.state,
        'city', s.city,
        'country', s.country,
        'address', s.address,
        'pincode', s.pincode,
        'phone', s.phone
      ) AS shipping_info
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN shipping_info s ON o.id = s.order_id
    WHERE o.id = $1 AND o.buyer_id = $2
    GROUP BY o.id, s.id
    `,
    [orderId, req.user.id]
  );

  if (!result.rows[0]) {
    return next(new ErrorHandler("Order not found.", 404));
  }

  res.status(200).json({
    success: true,
    message: "Order fetched.",
    orders: result.rows[0],
  });
});

export const fetchMyOrders = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `
  SELECT o.*, COALESCE(
 json_agg(
  json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'image', oi.image,
 'title', oi.title
  ) 
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone
 ) AS shipping_info 
 FROM orders o
 LEFT JOIN order_items oi ON o.id = oi.order_id
 LEFT JOIN shipping_info s ON o.id = s.order_id
 WHERE o.buyer_id = $1 AND o.paid_at IS NOT NULL
 GROUP BY o.id, s.id
 `,
 [req.user.id]
);
// WHERE o.buyer_id = $1

res.status(200).json({
  success: true,
  message: "All your orders are fetched.",
  myOrders: result.rows,
  });
});
export const fetchAllOrders = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
            SELECT o.*,
 COALESCE(json_agg(
 json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'image', oi.image,
 'title', oi.title
)
) FILTER (WHERE oi.id IS NOT NULL), '[]' ) AS order_items, json_build_object(
'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone 
) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.paid_at IS NOT NULL
GROUP BY o.id, s.id
        `);

  res.status(200).json({
    success: true,
    message: "All orders fetched.",
    orders: result.rows,
  });
});

export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
  if (!allowedStatuses.includes(status)) {
    return next(new ErrorHandler("Provide a valid order status.", 400));
  }
  const { orderId } = req.params;
  const results = await database.query(
    `
    SELECT * FROM orders WHERE id = $1
    `,
    [orderId]
  );

  if (results.rows.length === 0) {
    return next(new ErrorHandler("Invalid order ID.", 404));
  }

  const updatedOrder = await database.query(
    `
    UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *
    `,
    [status, orderId]
  );

  res.status(200).json({
    success: true,
    message: "Order status updated.",
    updatedOrder: updatedOrder.rows[0],
  });
});

export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const results = await database.query(
    `
        DELETE FROM orders WHERE id = $1 RETURNING *
        `,
    [orderId]
  );
  if (results.rows.length === 0) {
    return next(new ErrorHandler("Invalid order ID.", 404));
  }

  res.status(200).json({
    success: true,
    message: "Order deleted.",
    order: results.rows[0],
  });
});
