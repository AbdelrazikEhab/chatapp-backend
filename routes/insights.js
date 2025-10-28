// backend/src/routes/ai/insights.ts
import { Router } from "express";
import { Pool } from "pg";
import OpenAI from "openai";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  try {
    const { rows: messages } = await pool.query(
      "SELECT sender_id, text AS content, created_at FROM messages WHERE room = $1 ORDER BY created_at ASC",
      [conversationId]
    );

    if (messages.length === 0) {
      return res
        .status(404)
        .json({ error: "No messages found for this conversation." });
    }

    const conversationText = messages
      .map((m) => `${m.sender_id === 1 ? "User" : "Agent"}: ${m.content}`)
      .join("\n");

    const prompt = `
Summarize the following chat conversation into 3 sections:
1. Summary — concise overview (max 5 sentences)
2. Tags — relevant topics or labels (comma-separated)
3. Sentiment — overall tone (positive, negative, neutral)

Chat conversation:
${conversationText}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a chat summarizer." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0].message?.content || "";
    res.json({ insights: content });
  } catch (err) {
    console.error("AI Insights Error:", err);
    res
      .status(500)
      .json({ error: "AI Insights generation failed", details: err.message });
  }
});

export default router;
