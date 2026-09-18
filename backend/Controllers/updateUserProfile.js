const User = require("../models/userSchema");

const ALLOWED_UPDATE_FIELDS = [
  "name",
  "department",
  "college",
  "phone",
  "semester",
  "yearOfStudy",
  "identifier",
];

const updateUserProfile = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email parameter is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // IDOR protection: if user is authenticated, ensure they can only update their own profile
    if (req.user && req.user.email.toLowerCase() !== normalizedEmail) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot update another user's profile.",
      });
    }

    // Mass-assignment protection: filter req.body to allowed fields only
    const updatePayload = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updatePayload[field] = req.body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: "No valid profile fields provided for update." });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { password, otp, otpExpiresAt, ...userDetails } = updatedUser.toObject();
    res.status(200).json({ success: true, ...userDetails });
  } catch (error) {
    console.error("Error updating user profile:", error.message);
    res.status(500).json({ success: false, message: "Failed to update user details.", error: error.message });
  }
};

module.exports = updateUserProfile;

