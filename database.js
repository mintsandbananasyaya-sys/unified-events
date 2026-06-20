const { Pool } = require("pg");
 
if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL — set this to your Render Postgres Internal Database URL."
  );
}
 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's internal Postgres connections don't require SSL, but the
  // external URL (or other hosts) often does. This accepts either without
  // needing to know in advance which one is configured.
  ssl: process.env.DATABASE_URL.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});
 
pool.on("error", (err) => {
  // A background/idle client error should not crash the whole process —
  // log it and let the pool recover, same spirit as the try/catch around
  // bot.js in server.js (one bad connection shouldn't take the site down).
  console.error("Unexpected Postgres pool error:", err.message);
});
 
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        discord_id TEXT PRIMARY KEY,
        username TEXT,
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("Database ready");
  } catch (err) {
    console.error("Database setup failed:", err.message);
  }
})();
 
module.exports = pool;
 
