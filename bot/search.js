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



const markdownKnowledge = loadKnowledge();

let knowledge = [...markdownKnowledge];
let fuse;

const fuseOptions = {
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
};

function rebuildFuse() {
  fuse = new Fuse(knowledge, fuseOptions);
}

function formatDatabaseArticle(article) {
  return {
    id: `database-${article.id}`,
    title: article.title,
    category: "staff-added",
    aliases: Array.isArray(article.aliases)
      ? article.aliases.map((alias) => alias.toLowerCase())
      : [],
    content: article.content,
    source: "database",
  };
}

function addKnowledgeArticle(article) {
  const formatted = formatDatabaseArticle(article);

  // Remove an older copy if this article is being reloaded.
  knowledge = knowledge.filter(
    (item) => item.id !== formatted.id
  );

  knowledge.push(formatted);
  rebuildFuse();
}

function setDatabaseKnowledge(articles) {
  const databaseArticles = articles.map(formatDatabaseArticle);

  knowledge = [
    ...markdownKnowledge,
    ...databaseArticles,
  ];

  rebuildFuse();
}

rebuildFuse();

function searchKnowledge(question, limit = 3) {
  if (typeof question !== "string" || !question.trim()) {
    return [];
  }

  const cleanedQuestion = question.trim();

  const stopWords = new Set([
    "what", "when", "where", "which", "who", "why", "how",
    "does", "did", "have", "with", "from", "that", "this",
    "should", "would", "could", "about", "your", "their",
    "been", "were", "was", "are", "and", "the", "for",
    "but", "not", "can", "into", "then"
  ]);

  const terms = cleanedQuestion
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));

  const merged = new Map();

  function addResults(results) {
    for (const result of results) {
      const existing = merged.get(result.item.id);

      if (!existing || result.score < existing.score) {
        merged.set(result.item.id, result);
      }
    }
  }

  // Search the full question.
  addResults(fuse.search(cleanedQuestion, { limit: 10 }));

  // Also search important words separately.
  for (const term of terms) {
    addResults(fuse.search(term, { limit: 5 }));
  }

  return [...merged.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((result) => ({
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
  addKnowledgeArticle,
  setDatabaseKnowledge,
};
