const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const HEALTH_SYSTEM_PROMPT = `You are a warm, intelligent health assistant in a patient portal. Answer every question helpfully and conversationally.

Guidelines:
- Be friendly and supportive; address users personally
- Provide clear, practical, evidence-based information
- Answer general health questions about wellness, nutrition, sleep, exercise, stress, symptoms, medications
- For specific diagnoses or urgent issues, advise seeing a doctor while still offering useful context
- Keep responses 2-4 short paragraphs; use simple language
- Never prescribe; always suggest professional care when needed
- Handle greetings, thanks, and follow-ups naturally`;

// Optional auth - try to authenticate but don't block if token is missing/invalid
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (e) {
    // Invalid/expired token - continue without user
  }
  next();
};

// POST /api/chat - Send message and get AI response (patients preferred, falls back for guests)
router.post("/", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "patient") {
      return res.status(403).json({ message: "Chat is only available for patients" });
    }

    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: "Health assistant is temporarily unavailable. Please try again later or contact your healthcare provider for immediate questions.",
        fallback: true,
      });
    }

    const messages = [
      { role: "system", content: HEALTH_SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: message.trim() },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", response.status, errData);
      return res.status(502).json({
        message: "Unable to process your question right now. Please try again shortly.",
        fallback: true,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({
        message: "Could not generate a response. Please try rephrasing your question.",
        fallback: true,
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      message: "Something went wrong. Please try again.",
      fallback: true,
    });
  }
});

module.exports = router;
