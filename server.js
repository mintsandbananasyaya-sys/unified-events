require("dotenv").config();
require("./bot.js");

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();

// =====================
// BASIC SETUP
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

// =====================
// SESSION
// =====================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  })
);

// =====================
// ENV
// =====================
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// =====================
// BOT SETTINGS (GLOBAL MEMORY)
// =====================
let settings = {
  staffChannelId: "",
  staffRoleId: "",
  formsEnabled: true,
  ticketsEnabled: true,
};

// =====================
// AUTH MIDDLEWARE
// =====================
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// =====================
// PAGES
// =====================
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

// =====================
// DISCORD LOGIN
// =====================
app.get("/auth/discord", (req, res) => {
  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=identify guilds`;

  res.redirect(url);
});

// =====================
// CALLBACK
// =====================
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
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenRes.data.access_token}`,
      },
    });

    req.session.accessToken = tokenRes.data.access_token;

    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      avatar: userRes.data.avatar,
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.redirect("/login");
  }
});

// =====================
// API - GET SETTINGS
// =====================
app.get("/api/settings/:guildId", (req, res) => {
  const guildId = req.params.guildId;

  res.json(settings[guildId] || {});
});

// =====================
// API - SAVE SETTINGS
// =====================
app.post("/api/settings", (req, res) => {
  const { guildId, ...data } = req.body;

  settings[guildId] = data;

  res.json({
    ok: true,
    settings: settings[guildId]
  });
});

// =====================
// USER INFO
// =====================
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  const avatarURL = req.session.user.avatar
    ? `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png`
    : null;

  res.json({
    loggedIn: true,
    ...req.session.user,
    avatar: avatarURL,
  });
});

// =====================
// LOGOUT
// =====================
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/api/guild/:guildId/channels", async (req, res) => {
  try {
    const channels = await axios.get(
      `https://discord.com/api/guilds/${req.params.guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`,
        },
      }
    );

    res.json(channels.data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch channels" });
  }
});

app.get("/bot-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "bot-dashboard.html"));
<<<<<<< HEAD
});
=======
});
>>>>>>> 9d3c923b9a64bb0393372fd5ef35f9939242526e
