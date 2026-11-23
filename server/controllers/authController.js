import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

const publicUser = (user) => {
  if (!user) return user;
  const safe = { ...user };
  delete safe.password;
  delete safe.reset_password_token;
  delete safe.reset_password_expire;
  return safe;
};

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  if (password.length < 8 || password.length > 72) {
    return next(new ErrorHandler("Password must be between 8 and 72 characters.", 400));
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await database.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rows.length) {
    return next(new ErrorHandler("User already registered with this email.", 409));
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await database.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
    [String(name).trim(), normalizedEmail, hashedPassword]
  );
  sendToken(result.rows[0], 201, "User registered successfully", res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password.", 400));
  }
  const result = await database.query("SELECT * FROM users WHERE email = $1", [String(email).trim().toLowerCase()]);
  if (!result.rows[0] || !(await bcrypt.compare(password, result.rows[0].password))) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }
  sendToken(result.rows[0], 200, "Logged in successfully.", res);
});

export const getUser = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
});

export const logout = catchAsyncErrors(async (req, res) => {
  res.status(200).clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  }).json({ success: true, message: "Logged out successfully." });
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const frontendUrl = process.env.FRONTEND_URL;
  if (!email || !frontendUrl) {
    return next(new ErrorHandler("A valid email and FRONTEND_URL are required.", 400));
  }
  const userResult = await database.query("SELECT * FROM users WHERE email = $1", [email]);
  // Use the same public response whether or not the account exists.
  if (!userResult.rows[0]) {
    return res.status(200).json({ success: true, message: "If the account exists, a recovery email will be sent." });
  }

  const user = userResult.rows[0];
  const { hashedToken, resetPasswordExpireTime, resetToken } = generateResetPasswordToken();
  await database.query(
    "UPDATE users SET reset_password_token = $1, reset_password_expire = to_timestamp($2) WHERE email = $3",
    [hashedToken, resetPasswordExpireTime / 1000, email]
  );

  try {
    const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: "Ecommerce Password Recovery",
      message: generateEmailTemplate(resetPasswordUrl),
    });
    res.status(200).json({ success: true, message: "If the account exists, a recovery email will be sent." });
  } catch (error) {
    await database.query(
      "UPDATE users SET reset_password_token = NULL, reset_password_expire = NULL WHERE email = $1",
      [email]
    );
    return next(new ErrorHandler("Password recovery email could not be sent.", 500));
  }
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  if (!password || password !== confirmPassword || password.length < 8 || password.length > 72) {
    return next(new ErrorHandler("Provide matching passwords between 8 and 72 characters.", 400));
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const result = await database.query(
    "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()",
    [hashedToken]
  );
  if (!result.rows[0]) return next(new ErrorHandler("Invalid or expired reset token.", 400));

  const hashedPassword = await bcrypt.hash(password, 12);
  const updated = await database.query(
    "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2 RETURNING *",
    [hashedPassword, result.rows[0].id]
  );
  sendToken(updated.rows[0], 200, "Password reset successfully.", res);
});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  if (!(await bcrypt.compare(currentPassword, req.user.password))) {
    return next(new ErrorHandler("Current password is incorrect.", 401));
  }
  if (newPassword !== confirmNewPassword || newPassword.length < 8 || newPassword.length > 72) {
    return next(new ErrorHandler("New passwords must match and be between 8 and 72 characters.", 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await database.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.user.id]);
  res.status(200).json({ success: true, message: "Password updated successfully." });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  if (name.length < 3 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return next(new ErrorHandler("Provide a valid name and email address.", 400));
  }

  let avatarData = req.user.avatar;
  if (req.files?.avatar) {
    const avatar = req.files.avatar;
    if (!avatar.mimetype?.startsWith("image/") || avatar.size > 5 * 1024 * 1024) {
      return next(new ErrorHandler("Avatar must be an image smaller than 5 MB.", 400));
    }
    const uploaded = await cloudinary.uploader.upload(avatar.tempFilePath, {
      folder: "Ecommerce_Avatars",
      width: 150,
      crop: "scale",
      resource_type: "image",
    });
    avatarData = { public_id: uploaded.public_id, url: uploaded.secure_url };
  }

  try {
    const result = await database.query(
      "UPDATE users SET name = $1, email = $2, avatar = $3 WHERE id = $4 RETURNING *",
      [name, email, avatarData, req.user.id]
    );
    if (req.user.avatar?.public_id && avatarData?.public_id !== req.user.avatar.public_id) {
      await cloudinary.uploader.destroy(req.user.avatar.public_id).catch(() => {});
    }
    res.status(200).json({ success: true, message: "Profile updated successfully.", user: publicUser(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") return next(new ErrorHandler("That email address is already in use.", 409));
    throw error;
  }
});
