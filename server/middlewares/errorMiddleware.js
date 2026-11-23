class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  const databaseErrors = {
    "23505": [409, "A record with this value already exists."],
    "23503": [400, "The request references a record that does not exist."],
    "23514": [400, "The supplied data does not meet the required constraints."],
    "23502": [400, "A required field is missing."],
    "22P02": [400, "A supplied value has an invalid format."],
  };
  const mapped = databaseErrors[err.code];
  const statusCode = mapped?.[0] || Number(err.statusCode) || 500;
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

  const message = mapped?.[1] || (isProduction && statusCode >= 500
    ? "Internal server error."
    : (err.message || "Internal server error."));

  res.status(statusCode).json({ success: false, message });
};

export default ErrorHandler;
