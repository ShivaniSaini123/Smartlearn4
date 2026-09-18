const Assignment = require('../models/assignment');
const Submission = require('../models/submission');

const getAllAssignments = async (req, res) => {
  try {
    const { branch } = req.query;
    const userEmail = req.user?.email || req.query.email;

    const filter = {};
    if (branch) filter.branch = branch;

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 }).lean();

    // If a user email is available, dynamically annotate individual submission status
    if (userEmail && assignments.length > 0) {
      const userSubmissions = await Submission.find({
        email: userEmail.trim().toLowerCase(),
      }).lean();

      const submittedNumbers = new Set(
        userSubmissions.map((s) => `${s.branch}_${s.assignmentNumber}`)
      );

      const annotated = assignments.map((a) => ({
        ...a,
        submitted: submittedNumbers.has(`${a.branch}_${a.assignmentNumber}`),
      }));

      return res.status(200).json(annotated);
    }

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error.message);
    res.status(500).json({ success: false, error: 'Could not fetch assignments.' });
  }
};

module.exports = { getAllAssignments };

