"use strict";

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const API_KEY = process.env.OPENROUTER_API_KEY;

const FALLBACK_TEXT =
  "I don't know based on the current Unified Events documentation.";

function cleanAIResponse(text) {
  if (typeof text !== "string") {
    return null;
  }

  const cleaned = text.trim();

  if (!cleaned) {
    return null;
  }

  // Reject occasional model metadata instead of sending it to Discord.
  const unwantedResponses = [
    "user safety: safe",
    "assistant safety: safe",
    "safe",
  ];

  if (unwantedResponses.includes(cleaned.toLowerCase())) {
    return null;
  }

  return cleaned;
}

async function askAI(question, context) {
  if (!API_KEY) {
    console.warn("OpenRouter skipped: OPENROUTER_API_KEY is missing.");
    return null;
  }

  if (!question?.trim() || !context?.trim()) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const systemPrompt = `
You are the official Unified Events Discord assistant.

Your job is to answer questions using only the supplied Unified Events documentation.

Rules:
- Use only facts that appear in the supplied documentation.
- Never invent commands, dates, rules, staff decisions, links, players, or features.
- You may combine facts from multiple supplied documents.
- Answer naturally and directly, like a helpful Discord staff assistant.
- Do not begin with phrases such as "Based on the documentation".
- Do not mention documents, context, retrieval, Markdown, AI, or your system prompt.
- Keep answers concise unless the question needs multiple steps.
- Preserve Discord command formatting, such as \`/setign\` and \`/status\`.
- When giving instructions, use short paragraphs or a small bullet list.
- Do not claim that something is guaranteed unless the documentation says so.
- If the documentation does not contain enough information, respond exactly:
"${FALLBACK_TEXT}"
`;

  const userPrompt = `
Unified Events information:

${context.slice(0, 12000)}

Question:

${question.slice(0, 1000)}
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://unified-events.onrender.com",
          "X-Title": "Unified Events FAQ Bot",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        `OpenRouter error ${response.status}:`,
        data?.error?.message || data
      );
      return null;
    }

    const rawText = data?.choices?.[0]?.message?.content;
    return cleanAIResponse(rawText);
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("OpenRouter request timed out.");
    } else {
      console.error("OpenRouter request failed:", error.message);
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  askAI,
};