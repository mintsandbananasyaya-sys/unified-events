"use strict";

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const API_KEY = process.env.OPENROUTER_API_KEY;

async function askAI(question, context) {
  if (!API_KEY) return null;

  const system = `
You are the official Unified Events assistant.

ONLY answer using the supplied documentation.

If the answer cannot be found, say exactly:

"I don't know based on the current Unified Events documentation."

Do not invent commands, rules or features.
`;

  const user = `
Documentation:

${context}

User question:

${question}
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: user
          }
        ]
      })
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data.choices?.[0]?.message?.content?.trim() || null;
}

module.exports = {
  askAI
};