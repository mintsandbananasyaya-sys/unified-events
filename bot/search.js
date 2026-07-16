"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Fuse = require("fuse.js");

const knowledgeDirectory = path.join(__dirname, "knowledge");

function parseAliases(text) {
  const match = text.match(/<!--\s*aliases:\s*(.*?)\s*-->/i);

  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/`([^`]+)`/g)]
    .map((result) => result[1].trim().toLowerCase())
    .filter(Boolean);
}

function cleanSectionContent(text) {
  return text
    .replace(/<!--\s*aliases:.*?-->/gis, "")
    .replace(/<!--\s*source:.*?-->/gis, "")
    .replace(/^\s*---\s*$/gm, "")
    .trim();
}

function splitMarkdownIntoSections(fileName, markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const sections = [];

  let currentTitle = path.basename(fileName, ".md");
  let currentLines = [];

  function saveSection() {
    const rawContent = currentLines.join("\n").trim();
    const content = cleanSectionContent(rawContent);
    const aliases = parseAliases(rawContent);

    if (!content) {
      return;
    }

    sections.push({
      id: `${fileName}-${sections.length + 1}`,
      title: currentTitle,
      category: path.basename(fileName, ".md"),
      aliases,
      content,
      source: fileName,
    });
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      saveSection();
      currentTitle = headingMatch[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  saveSection();

  return sections;
}

function loadKnowledge() {
  if (!fs.existsSync(knowledgeDirectory)) {
    throw new Error(
      `Knowledge folder not found:\n${knowledgeDirectory}`
    );
  }

  const files = fs
    .readdirSync(knowledgeDirectory)
    .filter((file) => file.toLowerCase().endsWith(".md"));

  const documents = [];

  for (const file of files) {
    const filePath = path.join(knowledgeDirectory, file);
    const markdown = fs.readFileSync(filePath, "utf8");

    documents.push(
      ...splitMarkdownIntoSections(file, markdown)
    );
  }

  if (documents.length === 0) {
    throw new Error(
      `No Markdown knowledge was found in:\n${knowledgeDirectory}`
    );
  }

  return documents;
}

const knowledge = loadKnowledge();

const fuse = new Fuse(knowledge, {
  includeScore: true,
  threshold: 0.5,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    {
      name: "aliases",
      weight: 0.55,
    },
    {
      name: "title",
      weight: 0.3,
    },
    {
      name: "category",
      weight: 0.05,
    },
    {
      name: "content",
      weight: 0.1,
    },
  ],
});

function searchKnowledge(question, limit = 3) {
  if (typeof question !== "string" || !question.trim()) {
    return [];
  }

  return fuse.search(question.trim(), { limit }).map((result) => ({
    id: result.item.id,
    title: result.item.title,
    category: result.item.category,
    aliases: result.item.aliases,
    content: result.item.content,
    source: result.item.source,
    score: result.score,
  }));
}

function getBestAnswer(question) {
  const [best] = searchKnowledge(question, 1);

  if (!best) {
    return null;
  }

  // Lower score means a better match.
  if (best.score > 0.4) {
    return null;
  }

  return best.content;
}

module.exports = {
  searchKnowledge,
  getBestAnswer,
};