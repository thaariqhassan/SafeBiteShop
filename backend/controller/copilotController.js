require("dotenv").config();

// The AI Health Co-pilot runs on Gemini (kept separate from the Groq-backed
// flows in aiController.js, which are unchanged).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const list = (arr) =>
  arr && arr.length
    ? arr.filter((x) => x && x !== "None").join(", ") || "none"
    : "none";

const buildSystemPrompt = (userProfile = {}, recentScans = []) => {
  const scans =
    Array.isArray(recentScans) && recentScans.length
      ? recentScans
          .slice(0, 15)
          .map((s) => `- ${s.name}${s.note ? ` — ${s.note}` : ""}`)
          .join("\n")
      : "none yet";

  return `You are "SafeBite Co-pilot", a warm, practical health assistant living inside a food-safety app. You help ${userProfile.name || "the user"} decide what is safe to eat for THEIR body.

USER HEALTH PROFILE:
- Allergies: ${list(userProfile.allergies)}
- Medical conditions: ${list(userProfile.conditions)}
- Medications: ${list(userProfile.medications)}
- Dietary restrictions: ${list(userProfile.dietary)}

RECENTLY SCANNED PRODUCTS:
${scans}

HOW TO ANSWER:
- Always reason about THIS user's specific allergies, conditions, and medications. Watch for food–drug interactions (e.g. warfarin + vitamin K / leafy greens, statins + grapefruit, MAOIs + aged cheese).
- If they ask about something they scanned, use the list above.
- Be concise and mobile-friendly: short paragraphs or simple "- " dashes. No markdown tables, no big headings, no code blocks.
- If a food is risky for them, say so clearly up front, then suggest a safer alternative.
- You are NOT a doctor. For serious symptoms (trouble breathing, severe reaction, chest pain) tell them to seek emergency medical help immediately.
- If you don't have enough info, ask one short follow-up question.`;
};

// Calls the Gemini REST API with the running chat history and returns the
// assistant's reply text.
const consultCopilot = async (messages, userProfile, recentScans) => {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const contents = (messages || [])
    .filter((m) => m && m.content)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content) }],
    }));

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(userProfile, recentScans) }],
    },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const reply =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return (
    reply.trim() ||
    "Sorry, I couldn't put together an answer just now. Please try rephrasing."
  );
};

module.exports = { consultCopilot };
