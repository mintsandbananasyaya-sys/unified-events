require("dotenv").config();

const db = require("./database");
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const { getResponse } = require("./brain");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

/* =====================
   SESSION
===================== */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

/* =====================
   BOT LOAD (SAFE)
   bot.js runs in this same process so it can
   require("./brain") directly — same logic as /api/chat below.
===================== */
try {
  require("./bot.js");
  console.log("Bot loaded");
} catch (err) {
  console.log("Bot failed:", err.message);
}

/* =====================
   ONE-TIME SLASH COMMAND DEPLOY (RENDER WORKAROUND)
   Render's free tier has no persistent shell, so there's no way to run
   `node deploy-commands.js` directly. Instead: set DEPLOY_COMMANDS=true
   in Render's env vars, push/redeploy, watch the logs for confirmation,
   then DELETE that env var (or set it to anything else) so this doesn't
   re-register commands on every restart. Registering repeatedly is
   harmless to Discord but adds needless startup work and log noise.
===================== */
if (process.env.DEPLOY_COMMANDS === "true") {
  console.log("⏳ DEPLOY_COMMANDS=true detected — registering slash commands...");
  try {
    require("./deploy-commands.js");
  } catch (err) {
    console.log("❌ Slash command deploy failed:", err.message);
  }
}

/* =====================
   ENV
===================== */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

/* =====================
   IN-MEMORY STORE
   guildId -> settings (kept simple, not persisted to db)
===================== */
const settingsStore = {};

/* =====================
   AUTH HELPER
===================== */
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

/* =====================
   PAGES
===================== */
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/bot-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "bot-dashboard.html"));
});

/* =====================
   DISCORD OAUTH
===================== */
app.get("/auth/discord", (req, res) => {
  const url =
    `https://discord.com/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=identify guilds`;

  res.redirect(url);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/login");

  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenRes.data.access_token}`,
      },
    });

    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      avatar: userRes.data.avatar,
    };

    db.prepare(`
      INSERT OR REPLACE INTO users
      (discord_id, username, avatar)
      VALUES (?, ?, ?)
    `).run(
      userRes.data.id,
      userRes.data.username,
      userRes.data.avatar
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.log("OAuth error:", err.message);
    res.redirect("/login");
  }
});

/* =====================
   USER INFO
===================== */
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });

  const avatar = req.session.user.avatar
    ? `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png`
    : null;

  res.json({
    loggedIn: true,
    ...req.session.user,
    avatar,
  });
});

/* =====================
   CHATBOT API
   Shared brain with the Discord DM bot — both call getResponse()
   from brain.js, so website chat and DMs always answer identically.
===================== */
app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  const reply = getResponse(message.trim());
  res.json({ reply });
});

/* =====================
   TICKET LOG API
   Lets a logged-in user see every ticket/report they've ever opened
   through the Discord bot's /forms command, plus the full message
   transcript of each. Both routes are gated by requireAuth AND check
   that the ticket actually belongs to the requesting user — without
   that second check, anyone logged in could view anyone else's ticket
   just by guessing/incrementing the id in the URL.
===================== */

// List all tickets for the logged-in user, newest first.
app.get("/api/tickets", requireAuth, (req, res) => {
  const tickets = db
    .prepare(
      `SELECT id, kind, status, created_at, closed_at
       FROM tickets
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.session.user.id);

  res.json({ tickets });
});

// Full transcript of a single ticket — only if it belongs to this user.
app.get("/api/tickets/:id", requireAuth, (req, res) => {
  const ticketId = Number(req.params.id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  const ticket = db
    .prepare(
      `SELECT id, kind, status, created_at, closed_at, user_id FROM tickets WHERE id = ?`
    )
    .get(ticketId);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  // Ownership check — this is the line that actually protects privacy.
  if (ticket.user_id !== req.session.user.id) {
    return res.status(403).json({ error: "Not your ticket" });
  }

  const messages = db
    .prepare(
      `SELECT sender, content, created_at
       FROM ticket_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC`
    )
    .all(ticketId);

  res.json({
    id: ticket.id,
    kind: ticket.kind,
    status: ticket.status,
    created_at: ticket.created_at,
    closed_at: ticket.closed_at,
    messages,
  });
});

/* =====================
   TEMPORARY DEBUG ROUTE -- remove once the ticket sync issue is resolved.
   Shows your logged-in session's Discord ID side-by-side with every
   user_id currently stored in the tickets table, so we can see directly
   whether they match instead of guessing from logs.
===================== */
app.get("/api/debug/tickets", requireAuth, (req, res) => {
  const allTickets = db
    .prepare(`SELECT id, user_id, kind, status, created_at FROM tickets ORDER BY created_at DESC`)
    .all();

  res.json({
    yourSessionUserId: req.session.user.id,
    yourSessionUsername: req.session.user.username,
    allTicketsInDatabase: allTickets,
  });
});

/* =====================
   NOTIFICATIONS API
   Powers notifications.html. Two kinds of rows feed into one merged,
   newest-first list for the logged-in user:
     - scope='user'      rows where notifications.user_id matches them
     - scope='broadcast' rows (sent via /notify all) which everyone sees
   Broadcasts are always rendered as read (per product decision); only
   personal notifications carry real unread state via read_at.
===================== */
app.get("/api/notifications", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, scope, title, description, created_at, read_at
       FROM notifications
       WHERE scope = 'broadcast' OR user_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.session.user.id);

  const notifications = rows.map((row) => ({
    id: row.id,
    icon: row.scope === "broadcast" ? "📢" : "🔔",
    title: row.title,
    description: row.description || "",
    timestamp: new Date(row.created_at).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    // Broadcasts are always shown as read; personal notifications reflect
    // real read_at state (null = unread).
    read: row.scope === "broadcast" ? true : Boolean(row.read_at),
  }));

  res.json({ notifications });
});

// Mark a single personal notification as read. Broadcasts aren't
// markable (they're always shown as read), and a user can only mark
// their own — same ownership-check pattern as /api/tickets/:id.
app.post("/api/notifications/:id/read", requireAuth, (req, res) => {
  const notifId = Number(req.params.id);

  if (!Number.isInteger(notifId)) {
    return res.status(400).json({ error: "Invalid notification id" });
  }

  const notif = db
    .prepare(`SELECT id, scope, user_id FROM notifications WHERE id = ?`)
    .get(notifId);

  if (!notif) {
    return res.status(404).json({ error: "Notification not found" });
  }

  if (notif.scope !== "user" || notif.user_id !== req.session.user.id) {
    return res.status(403).json({ error: "Not your notification" });
  }

  db.prepare(`UPDATE notifications SET read_at = ? WHERE id = ?`).run(
    Date.now(),
    notifId
  );

  res.json({ ok: true });
});

/* =====================
   SETTINGS API
===================== */
app.get("/api/settings/:guildId", (req, res) => {
  const { guildId } = req.params;
  res.json(settingsStore[guildId] || {});
});

app.post("/api/settings", (req, res) => {
  console.log("🔥 SAVE REQUEST:", req.body);

  const {
    guildId,
    staffChannelId,
    staffRoleId,
    formsEnabled,
    ticketsEnabled,
  } = req.body;

  if (!guildId) {
    return res.status(400).json({ error: "Missing guildId" });
  }

  settingsStore[guildId] = {
    staffChannelId,
    staffRoleId,
    formsEnabled,
    ticketsEnabled,
  };

  console.log("✅ SAVED:", guildId, settingsStore[guildId]);

  res.json({
    ok: true,
    settings: settingsStore[guildId],
  });
});

/* =====================
   GUILD CHANNELS (BOT TOKEN)
===================== */
app.get("/api/guild/:guildId/channels", async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: "Missing BOT_TOKEN" });
    }

    const result = await axios.get(
      `https://discord.com/api/guilds/${req.params.guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    res.json(result.data);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "failed to fetch channels" });
  }
});

/* =====================
   LOGOUT
===================== */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* =====================
   START SERVER
===================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
