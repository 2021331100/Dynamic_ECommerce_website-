class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  const statusCode = Number(err.statusCode) || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(err);
  } else if (statusCode >= 500) {
    console.error("Request failed:", {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
    });
  }

  const message = isProduction && statusCode >= 500
    ? "Internal server error."
    : (err.message || "Internal server error.");

  res.status(statusCode).json({ success: false, message });
};

export default ErrorHandler;
