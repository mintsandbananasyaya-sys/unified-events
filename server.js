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
===================== */
try {
  require("./bot.js");
  console.log("Bot loaded");
} catch (err) {
  console.log("Bot failed:", err.message);
}

/* =====================
   ONE-TIME SLASH COMMAND DEPLOY
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

    const player = result.rows[0];

    // Fetch Discord roles
    let roles = [];
    if (process.env.GUILD_ID && BOT_TOKEN) {
      try {
        const [memberRes, rolesRes] = await Promise.all([
          axios.get(
            `https://discord.com/api/guilds/${process.env.GUILD_ID}/members/${player.discord_id}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
          ),
          axios.get(
            `https://discord.com/api/guilds/${process.env.GUILD_ID}/roles`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
          ),
        ]);
        const memberRoleIds = memberRes.data.roles || [];
        const allRoles = rolesRes.data || [];
        roles = allRoles
          .filter(r => memberRoleIds.includes(r.id) && r.name !== "@everyone")
          .map(r => ({ id: r.id, name: r.name, color: r.color }));
      } catch (err) {
        console.error("Discord roles fetch failed:", err.message);
      }
    }

    // Fetch MCTiers and PvPTiers in parallel using the player's IGN
    let mctiers = null;
    let pvptiers = null;

    if (player.ign) {
      // Strip leading dot for Bedrock players
      const ign = player.ign.startsWith(".") ? player.ign.slice(1) : player.ign;

      const [mctiersRes, pvptiersRes] = await Promise.allSettled([
        axios.get(`https://mctiers.com/api/v2/profile/by-name/${encodeURIComponent(ign)}`),
        axios.get(`https://pvptiers.com/api/search_profile/${encodeURIComponent(ign)}`),
      ]);

      if (mctiersRes.status === "fulfilled") {
        mctiers = mctiersRes.value.data;
      } else {
        console.error("MCTiers fetch failed:", mctiersRes.reason?.message);
      }

      if (pvptiersRes.status === "fulfilled") {
        pvptiers = pvptiersRes.value.data;
      } else {
        console.error("PvPTiers fetch failed:", pvptiersRes.reason?.message);
      }
    }

    return res.json({ ...player, roles, mctiers, pvptiers });
  } catch (err) {
    console.error("Player lookup error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   STAFF AUTH HELPER
===================== */
async function requireStaff(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });

  const guildId = process.env.GUILD_ID;
  if (!guildId) return res.status(500).json({ error: "GUILD_ID not configured" });

  try {
    const memberRes = await axios.get(
      `https://discord.com/api/guilds/${guildId}/members/${req.session.user.id}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );

    const roles = memberRes.data.roles;

    const rolesRes = await axios.get(
      `https://discord.com/api/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );

    const staffRole = rolesRes.data.find(
      (r) => r.name.toLowerCase() === "staff"
    );

    if (!staffRole || !roles.includes(staffRole.id)) {
      return res.status(403).json({ error: "Forbidden — Staff only" });
    }

    next();
  } catch (err) {
    console.error("Staff auth check failed:", err.message);
    return res.status(403).json({ error: "Could not verify staff role" });
  }
}

/* =====================
   STAFF — TICKETS
===================== */
app.get("/api/staff/tickets", requireStaff, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const { rows: tickets } = await db.query(
      `SELECT t.id, t.user_id, t.kind, t.status, t.created_at, t.closed_at,
              u.username, u.avatar
       FROM tickets t
       LEFT JOIN users u ON u.discord_id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM tickets`);
    const total = parseInt(countRows[0].count);

    const ticketsWithMessages = await Promise.all(
      tickets.map(async (ticket) => {
        const { rows: messages } = await db.query(
          `SELECT sender, content, created_at
           FROM ticket_messages
           WHERE ticket_id = $1
           ORDER BY created_at ASC`,
          [ticket.id]
        );
        return { ...ticket, messages };
      })
    );

    res.json({
      tickets: ticketsWithMessages,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Staff tickets error:", err.message);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

/* =====================
   STAFF — LOGS
===================== */
app.get("/api/staff/logs", requireStaff, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  const typeFilter = req.query.type || null;

  try {
    const { rows: logs } = await db.query(
      `SELECT id, type, actor_id, actor_tag, target_id, target_tag, detail, guild_id, channel_id, created_at
       FROM logs
       ${typeFilter ? "WHERE type = $3" : ""}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      typeFilter ? [limit, offset, typeFilter] : [limit, offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM logs ${typeFilter ? "WHERE type = $1" : ""}`,
      typeFilter ? [typeFilter] : []
    );
    const total = parseInt(countRows[0].count);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Staff logs error:", err.message);
    res.status(500).json({ error: "Failed to load logs" });
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
   INTERNAL NOTIFICATIONS API
   Called by Unified Applications when an application
   is accepted or rejected. Protected by a shared secret.
===================== */
app.post("/api/notifications/internal", async (req, res) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId, title, description } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: "Missing userId or title" });
  }

  try {
    await db.query(
      `INSERT INTO notifications (scope, user_id, title, description, sent_by, created_at)
       VALUES ('user', $1, $2, $3, 'unified-applications', $4)`,
      [userId, title, description || "", Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Internal notification failed:", err.message);
    res.status(500).json({ error: "Failed to create notification" });
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
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
