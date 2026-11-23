import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || "./config/config.env" });

const required = ["JWT_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "CLOUDINARY_CLIENT_NAME", "CLOUDINARY_CLIENT_API", "CLOUDINARY_CLIENT_SECRET"];
const databaseRequired = process.env.DATABASE_URL ? [] : ["DB_USER", "DB_NAME", "DB_PASSWORD"];
const missing = [...required, ...databaseRequired].filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}
if (process.env.JWT_SECRET_KEY.length < 32) {
  throw new Error("JWT_SECRET_KEY must contain at least 32 characters.");
}
if (process.env.NODE_ENV === "production") {
  const missingOrigins = ["FRONTEND_URL", "DASHBOARD_URL"].filter((key) => !process.env[key]);
  if (missingOrigins.length) {
    throw new Error(`Missing production origin configuration: ${missingOrigins.join(", ")}`);
  }
  if (!process.env.FRONTEND_URL.startsWith("https://") || !process.env.DASHBOARD_URL.startsWith("https://")) {
    throw new Error("Production FRONTEND_URL and DASHBOARD_URL must use HTTPS.");
  }
}

const [{ default: app }, { default: database }, { v2: cloudinary }] = await Promise.all([
  import("./app.js"),
  import("./database/db.js"),
  import("cloudinary"),
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
  secure: true,
});

await database.query("SELECT 1");

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
