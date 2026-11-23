import jwt from "jsonwebtoken";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./errorMiddleware.js";
import database from "../database/db.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource.", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    return next(new ErrorHandler("Your session is invalid or expired. Please login again.", 401));
  }

  const result = await database.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [decoded.id]
  );
  if (!result.rows[0]) {
    return next(new ErrorHandler("User account no longer exists. Please login again.", 401));
  }

  req.user = result.rows[0];
  next();
});

export const authorizedRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ErrorHandler("You are not authorized to access this resource.", 403));
  }
  next();
};
