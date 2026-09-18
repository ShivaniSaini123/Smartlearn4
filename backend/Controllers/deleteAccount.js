// backend/Controllers/deleteAccount.js
const User = require("../models/userSchema");

const deleteAccount = async (req, res) => {
  try {
    // Determine target user from authenticated context or validated body email
    const authenticatedEmail = req.user?.email;
    const bodyEmail = req.body?.email?.trim().toLowerCase();

    // If authenticated, enforce that the user can only delete their own account
    const targetEmail = authenticatedEmail || bodyEmail;

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: "Email is required to identify account." });
    }

    if (authenticatedEmail && bodyEmail && authenticatedEmail !== bodyEmail) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot delete another user's account.",
      });
    }

    const user = await User.findOneAndDelete({ email: targetEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Clear cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    console.error("Delete account error:", err.message);
    return res.status(500).json({ success: false, message: "Delete account failed.", error: err.message });
  }
};

module.exports = deleteAccount;

