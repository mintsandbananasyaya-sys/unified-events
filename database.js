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
 
// Notifications shown on notifications.html and DMed by /notify.
// scope = 'user'      -> personal notification, tied to one user_id, tracks read_at
// scope = 'broadcast' -> /notify all, shown to everyone, always treated as read
db.prepare(`
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  sent_by TEXT,
  created_at INTEGER NOT NULL,
  read_at INTEGER
)
`).run();
 
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_scope ON notifications(scope)`).run();
 
console.log("Database ready");
 
module.exports = db;
