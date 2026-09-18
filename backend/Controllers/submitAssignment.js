const Assignment = require('../models/assignment');
const Submission = require('../models/submission');

const submitAssignment = async (req, res) => {
  try {
    const email = (req.user?.email || req.body.email || '').trim().toLowerCase();
    const { assignmentNumber, branch, subject, chapter } = req.body;

    if (!email || !assignmentNumber) {
      return res.status(400).json({ success: false, message: 'Email and assignment number are required.' });
    }

    // Find the corresponding assignment to attach metadata
    const query = { assignmentNumber: Number(assignmentNumber) };
    if (branch) query.branch = branch;
    const assignment = await Assignment.findOne(query);

    // Create or update student submission record
    const submission = await Submission.findOneAndUpdate(
      { email, assignmentNumber: Number(assignmentNumber) },
      {
        $set: {
          email,
          assignmentNumber: Number(assignmentNumber),
          branch: branch || assignment?.branch || 'General',
          subject: subject || assignment?.subject || '',
          chapter: chapter || assignment?.chapter || '',
          deadline: assignment?.deadline,
          professorName: assignment?.professorName || '',
          submitted: true,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      submission,
    });
  } catch (error) {
    console.error('Error submitting assignment:', error.message);
    res.status(500).json({ success: false, error: 'Server error. Could not submit assignment.' });
  }
};

module.exports = { submitAssignment };