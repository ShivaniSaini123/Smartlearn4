const DailyChallenge = require("../models/DailyChallenge");
const ChallengeAttempt = require("../models/ChallengeAttempt");
const { GoogleGenAI } = require("@google/genai");
const { applyStreakPing } = require("./streakController");
const { checkAndAwardBadges } = require("./achievementController");

const apiKey = process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY;
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;
const todayStr = () => new Date().toISOString().split("T")[0];

/* Generates a fresh MCQ via Gemini and caches it for the day */
async function generateChallenge(date) {
  if (!client) {
    throw new Error("Gemini API key is not configured");
  }

  const categories = ["aptitude", "dsa", "subject"];
  const category = categories[new Date(date).getDate() % categories.length];

  const prompt = `You generate one multiple-choice question for engineering students preparing for placements.
Category: ${category}.
Respond ONLY with valid JSON, no markdown, no preamble, in this exact shape:
{"question": "...", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": "exact text of correct option", "explanation": "1-2 sentence explanation"}

Generate today's question of the day for category: ${category}`;

  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    contents: prompt,
  });

  const raw = response.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(raw);

  try {
    const challenge = await DailyChallenge.create({
      date,
      category,
      question: parsed.question,
      options: parsed.options,
      correctAnswer: parsed.correctAnswer,
      explanation: parsed.explanation,
    });
    return challenge;
  } catch (err) {
    // Another request generated + saved the same day's challenge first
    // (date has a unique index, so this is a duplicate-key error, code 11000).
    if (err.code === 11000) {
      const existing = await DailyChallenge.findOne({ date });
      if (existing) return existing;
    }
    throw err;
  }
}

/* GET /challenge/today */
exports.getTodayChallenge = async (req, res) => {
  try {
    const date = todayStr();
    let challenge = await DailyChallenge.findOne({ date });
    if (!challenge) {
      challenge = await generateChallenge(date);
    }

    // Don't leak the correct answer to the client until they answer
    const { correctAnswer, ...safe } = challenge.toObject();
    res.json(safe);
  } catch (err) {
    console.error("Daily challenge error:", err);
    res.status(500).json({ error: "Could not load today's challenge" });
  }
};

/* POST /challenge/:userId/attempt  body: { selectedAnswer } */
exports.submitAttempt = async (req, res) => {
  try {
    const { userId } = req.params;
    const { selectedAnswer } = req.body;
    const date = todayStr();

    const challenge = await DailyChallenge.findOne({ date });
    if (!challenge) return res.status(404).json({ error: "No challenge for today" });

    const isCorrect = selectedAnswer === challenge.correctAnswer;

    const attempt = await ChallengeAttempt.findOneAndUpdate(
      { userId, date },
      { userId, date, challengeId: challenge._id, selectedAnswer, isCorrect },
      { upsert: true, new: true }
    );

    // Streak counts on any attempt today, correct or not.
    const streak = await applyStreakPing(userId);
    await checkAndAwardBadges(userId);

    res.json({ isCorrect, correctAnswer: challenge.correctAnswer, explanation: challenge.explanation, attempt, streak });
  } catch (err) {
    console.error("Submit challenge attempt error:", err.message);
    res.status(500).json({ error: "Failed to submit challenge attempt" });
  }
};

/* GET /challenge/:userId/attempt-today */
exports.getTodayAttempt = async (req, res) => {
  try {
    const { userId } = req.params;
    const date = todayStr();
    const attempt = await ChallengeAttempt.findOne({ userId, date });
    if (!attempt) return res.json(null);

    // Pull the actual correct answer + explanation so a page reload
    // shows the real result, not just what the user picked.
    const challenge = await DailyChallenge.findById(attempt.challengeId);

    res.json({
      selectedAnswer: attempt.selectedAnswer,
      isCorrect: attempt.isCorrect,
      correctAnswer: challenge ? challenge.correctAnswer : null,
      explanation: challenge ? challenge.explanation : null,
    });
  } catch (err) {
    console.error("Get today attempt error:", err.message);
    res.status(500).json({ error: "Failed to fetch today's attempt" });
  }
};