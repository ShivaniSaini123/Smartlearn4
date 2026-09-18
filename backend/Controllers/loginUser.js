const User = require("../models/userSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified.",
        redirectTo: "/verify-otp",
        email: user.email,
      });
    }

    // Generate signed JWT token
    const secret = process.env.JWT_SECRET || "smartlearn_default_jwt_secret";
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || "Student" },
      secret,
      { expiresIn: "7d" }
    );

    // Set HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Sanitize user object (exclude password, otp, otpExpiresAt)
    const { password: _p, otp: _o, otpExpiresAt: _oe, ...safeUser } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

module.exports = loginUser;

