/* =====================================================
   UNIFIED EVENTS — SERVER
   Express app: auth, player lookup, tickets, notifications,
   guild settings, and bot bootstrapping.
===================================================== */

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const db = require("./database"); // pg Pool
const { getResponse } = require("./brain");

const app = express();

/* =====================
   CONFIG / ENV
===================== */
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";

const PUBLIC_DIR = path.join(__dirname, "public");

/* =====================
   MIDDLEWARE
===================== */
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 24h
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function sendPage(filename) {
  return (req, res) => res.sendFile(path.join(PUBLIC_DIR, filename));
}

/* =====================
   BOT BOOTSTRAP (SAFE)
   bot.js is required here so the website keeps running even
   if the Discord bot fails to start (bad token, missing env, etc).
===================== */
try {
  require("./bot.js");
  console.log("✅ Bot loaded");
} catch (err) {
  console.log("❌ Bot failed to load:", err.message);
}

/* =====================
   ONE-TIME SLASH COMMAND DEPLOY
   Set DEPLOY_COMMANDS=true in env to re-register slash commands
   with Discord on boot. Turn it back off once they've propagated.
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
   IN-MEMORY STORE
   Per-guild settings — resets on every restart/deploy. Fine for
   now, but move to Postgres if these need to persist long-term.
===================== */
const settingsStore = {};

/* =====================
   PAGES
===================== */
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  sendPage("index.html")(req, res);
});

app.get("/login", sendPage("login.html"));
app.get("/dashboard", requireAuth, sendPage("dashboard.html"));
app.get("/bot-dashboard", sendPage("bot-dashboard.html"));

app.get("/auth/discord", (req, res) => {
  const url =
    `https://discord.com/oauth2/authorize` +
    `?client_id=${DISCORD_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}` +
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
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
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

    await db.query(
      `INSERT INTO users (discord_id, username, avatar)
       VALUES ($1, $2, $3)
       ON CONFLICT (discord_id) DO UPDATE SET
         username = EXCLUDED.username,
         avatar = EXCLUDED.avatar`,
      [userRes.data.id, userRes.data.username, userRes.data.avatar]
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
   PLAYER LOOKUP
   Matches on Discord username OR Minecraft IGN (set via /setign),
   so players.html can find someone by either identifier.
===================== */
app.get("/api/player/:username", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { username } = req.params;

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const result = await db.query(
      `SELECT discord_id, username, avatar, created_at, ign, verified
       FROM users
       WHERE username ILIKE $1 OR ign ILIKE $1
       LIMIT 1`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Player lookup error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   CHATBOT API
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
===================== */
app.get("/api/tickets", requireAuth, async (req, res) => {
  try {
    const { rows: tickets } = await db.query(
      `SELECT id, kind, status, created_at, closed_at
       FROM tickets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.json({ tickets });
  } catch (err) {
    console.log("Failed to load tickets:", err.message);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

app.get("/api/tickets/:id", requireAuth, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }

    const { rows } = await db.query(
      `SELECT id, kind, status, created_at, closed_at, user_id FROM tickets WHERE id = $1`,
      [ticketId]
    );
    const ticket = rows[0];

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.user_id !== req.session.user.id) {
      return res.status(403).json({ error: "Not your ticket" });
    }

    const { rows: messages } = await db.query(
      `SELECT sender, content, created_at
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId]
    );

    res.json({
      id: ticket.id,
      kind: ticket.kind,
      status: ticket.status,
      created_at: ticket.created_at,
      closed_at: ticket.closed_at,
      messages,
    });
  } catch (err) {
    console.log("Failed to load ticket:", err.message);
    res.status(500).json({ error: "Failed to load ticket" });
  }
});

/* =====================
   DEBUG ROUTE (TEMPORARY)
===================== */
app.get("/api/debug/tickets", requireAuth, async (req, res) => {
  try {
    const { rows: allTickets } = await db.query(
      `SELECT id, user_id, kind, status, created_at FROM tickets ORDER BY created_at DESC`
    );

    res.json({
      yourSessionUserId: req.session.user.id,
      yourSessionUsername: req.session.user.username,
      allTicketsInDatabase: allTickets,
    });
  } catch (err) {
    console.log("Debug route failed:", err.message);
    res.status(500).json({ error: "Failed to load debug data" });
  }
});

/* =====================
   NOTIFICATIONS API
===================== */
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, scope, title, description, created_at, read_at
       FROM notifications
       WHERE scope = 'broadcast' OR user_id = $1
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    const notifications = rows.map((row) => ({
      id: row.id,
      icon: row.scope === "broadcast" ? "📢" : "🔔",
      title: row.title,
      description: row.description || "",
      timestamp: new Date(Number(row.created_at)).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: row.scope === "broadcast" ? true : Boolean(row.read_at),
    }));

    res.json({ notifications });
  } catch (err) {
    console.log("Failed to load notifications:", err.message);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notifId = Number(req.params.id);

    if (!Number.isInteger(notifId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const { rows } = await db.query(
      `SELECT id, scope, user_id FROM notifications WHERE id = $1`,
      [notifId]
    );
    const notif = rows[0];

    if (!notif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notif.scope !== "user" || notif.user_id !== req.session.user.id) {
      return res.status(403).json({ error: "Not your notification" });
    }

    await db.query(`UPDATE notifications SET read_at = $1 WHERE id = $2`, [
      Date.now(),
      notifId,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.log("Failed to mark notification read:", err.message);
    res.status(500).json({ error: "Failed to mark notification read" });
  }
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
