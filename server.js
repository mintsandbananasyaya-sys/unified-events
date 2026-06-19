require("dotenv").config();

const db = require("./database");
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

/* =====================
   SESSION (SAFE)
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
   ENV
===================== */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

/* =====================
   MEMORY STORE
===================== */
// guildId -> settings
const settingsStore = {};

/* =====================
   AUTH CHECK
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
   SETTINGS API (FIXED — THIS WAS YOUR MAIN BUG)
===================== */

// GET SETTINGS
app.get("/api/settings/:guildId", (req, res) => {
  const { guildId } = req.params;

  res.json(settingsStore[guildId] || {});
});

// SAVE SETTINGS
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
