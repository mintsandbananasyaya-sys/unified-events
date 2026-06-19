const Database = require("better-sqlite3");

const db = new Database("database.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

console.log("Database ready");

module.exports = db;