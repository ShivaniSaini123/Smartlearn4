const bcrypt = require('bcryptjs');
const User = require("../models/userSchema");

const submitUserDetails = async (req, res) => {
  console.log("Incoming request body:", req.body);

  const { email, name, yearOfStudy, department, college, phone, password, semester, role, identifier } = req.body;
if (!email || email.trim() === "") {
    return res.status(400).json({ message: "Email is required" });
}
  try {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // Check if a user with the same email already exists
    let user = await User.findOne({ email });

    if (!user) {
      // If user does not exist, create a new user
      user = new User({
        name: name || "Anonymous",
        email,
        password: hashedPassword, 
        role: role || "Student",
        identifier: identifier || null,
        yearOfStudy: role === "Student" ? (yearOfStudy || "1") : undefined, // ✅ Year of Study only for Students
        semester: semester || "1", // ✅ Semester stored for both Students & Professors
        department: department || "General Studies",
        college: college || "Unknown College",
        phone: phone || null,
      });
      console.log("Final User Object before saving:", user);
      await user.save();
      return res.status(201).json({ message: "New user created successfully!" });
    }

    // If the user already exists, check if the phone number is already associated with a different user
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.email !== email) {
      return res.status(409).json({
        message: "A user with this phone number already exists.",
      });
    }

    // At this point, we have a valid 'user' object to update
    user.name = name || user.name;
    user.role = role || user.role;
    user.identifier = identifier || user.identifier;

    // ✅ Year of Study stored only for Students
    if (user.role === "Student") {
      user.yearOfStudy = yearOfStudy || user.yearOfStudy;
    } else {
      user.yearOfStudy = undefined; // Remove yearOfStudy if the user is not a Student
    }

    // ✅ Semester stored for both Students & Professors
    if (semester !== undefined) {
      user.semester = semester;
    } else if (!user.semester) {
      user.semester = "1";  // Set a default if missing
    }
    

    user.department = department || user.department;
    user.college = college || user.college;
    user.phone = phone || user.phone;

    // Update password if provided and not already set
    if (password && !user.password) {
      user.password = hashedPassword;
    }

    // Save the updated user object to the database
    await user.save();

    // Send a success response
    res.status(200).json({ message: "User details updated successfully!" });
    console.log("User details:", user);

  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({
      message: "Failed to update user details.",
      error: error.message,
    });
  }
};

module.exports = submitUserDetails;
