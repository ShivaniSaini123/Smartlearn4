const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentNumber: {
    type: Number,
    required: true,
    unique: false,
    // unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  chapter: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  professorName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Supports multiple attachments (e.g., PDFs, Word files)
  attachments: [
    {
      filename: { type: String, required: true },
      url: { type: String, required: true },
    },
  ],
  // Reference to User model
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  email: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,  // Add this if you want to make sure every assignment is tied to a branch
  },
});

module.exports = mongoose.model('Assignment', assignmentSchema);
