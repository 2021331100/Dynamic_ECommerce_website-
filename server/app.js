import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import authRoutes from "./router/authRoutes.js";
import productRoutes from "./router/productRoutes.js";
import orderRoutes from "./router/orderRoutes.js";
import adminRoutes from "./router/adminRoutes.js";
import { paymentWebhook } from "./controllers/paymentController.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

const app = express();

const allowedOrigins = [process.env.FRONTEND_URL, process.env.DASHBOARD_URL]
  .filter(Boolean)
  .map((value) => new URL(value).origin);


app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Basic browser security headers. HTTPS should also be enforced by the hosting platform.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Origin is not allowed." });
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header (health checks and server-to-server calls) are allowed.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
}));

app.post("/api/v1/payment/webhook", express.raw({ type: "application/json" }), paymentWebhook);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: process.env.UPLOAD_TEMP_DIR || "/tmp/ecommerce-uploads",
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true,
}));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorMiddleware);

export default app;
