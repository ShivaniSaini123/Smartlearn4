const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chat = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question text is required",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "AI service is currently not configured",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });

    const result = await model.generateContent(question);
    const answer = result.response.text();

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("AI chat error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI response. Please try again later.",
    });
  }
};