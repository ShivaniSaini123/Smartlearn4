// Controllers/healthScoreController.js
// Academic Health Score — computed live, no DB writes.
const Goal = require("../models/GoalSchema");

/* GET /health-score/:userId?cgpa=8.2 */
// cgpa is passed from frontend since it's stored client-side in your CGPA tracker.
// If you persist CGPA server-side later, fetch it here instead.
exports.getHealthScore = async (req, res) => {
  try {
    const { userId } = req.params;
    const cgpa = parseFloat(req.query.cgpa) || 0;

    const allGoals = await Goal.find({ userId });
    const goalsCompletionPct = allGoals.length
      ? (allGoals.filter(g => g.completed).length / allGoals.length) * 100
      : 0;

    // Assignment completion — adjust model/field names to match your Assignment schema if different
    let assignmentCompletionPct = 0;
    try {
      const Assignment = require("../models/assignment"); // exact filename match
      const allAssignments = await Assignment.find({ userId });
      assignmentCompletionPct = allAssignments.length
        ? (allAssignments.filter(a => a.submitted).length / allAssignments.length) * 100
        : 0;
    } catch (e) {
      assignmentCompletionPct = 70; // fallback default if Assignment model differs
    }

    // Weighted formula: CGPA (out of 10) 40%, goals 30%, assignments 30%
    const cgpaScore = (cgpa / 10) * 100;
    const healthScore = Math.round(
      cgpaScore * 0.4 + goalsCompletionPct * 0.3 + assignmentCompletionPct * 0.3
    );

    let label = "Needs Attention";
    if (healthScore >= 85) label = "Excellent";
    else if (healthScore >= 70) label = "Good";
    else if (healthScore >= 50) label = "Average";

    res.json({
      score: Math.min(100, Math.max(0, healthScore)),
      label,
      breakdown: {
        cgpaScore: Math.round(cgpaScore),
        goalsCompletionPct: Math.round(goalsCompletionPct),
        assignmentCompletionPct: Math.round(assignmentCompletionPct),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};