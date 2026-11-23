import Stripe from "stripe";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export async function generatePaymentIntent(orderId, totalPrice) {
  try {
    const multiplier = Number(process.env.STRIPE_AMOUNT_MULTIPLIER || 1);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error("STRIPE_AMOUNT_MULTIPLIER must be a positive number.");
    }
    const amount = Math.round(Number(totalPrice) * multiplier * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("Payment amount must be a positive valid amount.");
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: (process.env.STRIPE_CURRENCY || "usd").toLowerCase(),
      metadata: { orderId: String(orderId) },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error("Payment intent creation failed:", error.message);
    return { success: false, message: "Payment could not be initialized." };
  }
}
