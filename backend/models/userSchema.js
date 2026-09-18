const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: "Student",
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum: ["Student", "Professor"],
  },
  identifier: {
    type: String, 
    required: false,
  },
  yearOfStudy: {
    type: String,
  },
  semester: {
    type: String,
  },
  department: {
    type: String,
  },
  college: {
    type: String,
  },
  phone: {
    type: String,
    
  },
  otp: {
    type: String, 
  },
  otpExpiresAt: {
    type: Date, 
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
   contacts: [{ type: String }],  // array of emails or user IDs
  connectionRequests: [{ type: String }],  // emails of users who sent request
  
});

module.exports = mongoose.model("User", userSchema);

