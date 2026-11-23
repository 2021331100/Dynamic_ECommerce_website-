import jwt from "jsonwebtoken";

export const sendToken = (user, statusCode, message, res) => {
  if (!process.env.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY.length < 32) {
    throw new Error("JWT_SECRET_KEY must be configured with at least 32 characters.");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const cookieDays = Number(process.env.COOKIE_EXPIRES_IN || 1);
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "none" : "lax";
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn });

  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.reset_password_token;
  delete safeUser.reset_password_expire;

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: cookieDays * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      user: safeUser,
      message,
    });
};
