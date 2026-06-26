const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL — set this to your Render Postgres Internal Database URL."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err.message);
});

(async () => {
  try {
    // Core users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        discord_id TEXT PRIMARY KEY,
        username   TEXT,
        avatar     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // IGN verification columns — safe to run every boot
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ign      TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ign ON users(ign) WHERE ign IS NOT NULL`);

    // Audit log table — every moderation action, edit, delete, and command use
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id          SERIAL PRIMARY KEY,
        type        TEXT        NOT NULL,
        actor_id    TEXT,
        actor_tag   TEXT,
        target_id   TEXT,
        target_tag  TEXT,
        detail      TEXT,
        guild_id    TEXT,
        channel_id  TEXT,
        created_at  BIGINT      NOT NULL
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_type    ON logs(type)`);

    // Auto-delete logs older than 30 days on every boot
    await pool.query(`
      DELETE FROM logs
      WHERE created_at < $1
    `, [Date.now() - 30 * 24 * 60 * 60 * 1000]);

    console.log("Database ready");
  } catch (err) {
    console.error("Database setup failed:", err.message);
  }
})();

module.exports = pool;
