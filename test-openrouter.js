"use strict";

require("dotenv").config();

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || "openrouter/free";

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is missing from your .env file.");
}

async function testOpenRouter() {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Follow the user's formatting instruction exactly.",
          },
          {
            role: "user",
            content: "Reply with exactly: OpenRouter connection successful",
          },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `OpenRouter error ${response.status}:\n${JSON.stringify(data, null, 2)}`
    );
  }

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(
      `OpenRouter returned no answer:\n${JSON.stringify(data, null, 2)}`
    );
  }

  console.log(text);
}

testOpenRouter().catch((error) => {
  console.error("\nOpenRouter test failed:");
  console.error(error.message);
  process.exitCode = 1;
});