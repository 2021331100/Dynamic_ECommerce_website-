import test from "node:test";
import assert from "node:assert/strict";
import { generatePaymentIntent } from "../utils/generatePaymentIntent.js";

test("payment intent creation fails safely when Stripe secret is missing", async () => {
  const original = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const result = await generatePaymentIntent("test-order", 100);
    assert.equal(result.success, false);
    assert.equal(result.clientSecret, undefined);
  } finally {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = original;
  }
});
