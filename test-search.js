"use strict";

const {
  searchKnowledge,
  getBestAnswer
} = require("./bot/search.js");

const question = process.argv.slice(2).join(" ");

if (!question) {
  console.log('Usage: node test-search.js "How do I verify?"');
  process.exit(1);
}

const results = searchKnowledge(question, 3);

console.log("\nQuestion:");
console.log(question);

console.log("\nBest answer:");
console.log(getBestAnswer(question) ?? "No confident answer found.");

console.log("\nTop matches:");
console.dir(results, { depth: null });