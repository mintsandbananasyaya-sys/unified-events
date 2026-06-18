require("dotenv").config();

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();

// =====================
// CORE
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// =====================
// TRUST PROXY (RENDER FIX)
// =====================
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
// AUTH CHECK
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
  if (req.session.user) return res.redirect("/dashboard");
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
    `&scope=identify`;

  res.redirect(url);
});

// =====================
// CALLBACK
// =====================
app.get("/auth/discord/callback", async (req, res) => {

    console.log("🔥 CALLBACK HIT");
    console.log("code:", req.query.code);
    console.log("CLIENT_ID:", CLIENT_ID);
    console.log("CLIENT_SECRET exists:", !!CLIENT_SECRET);
    console.log("REDIRECT_URI:", JSON.stringify(REDIRECT_URI));
  const code = req.query.code;
  if (!code) return res.redirect("/login");

  try {
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    const tokenRes = await axios.post(
      "https://discord.com/api/v10/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const userRes = await axios.get(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
        },
      }
    );

    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      avatar: userRes.data.avatar,
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error(
      "OAuth ERROR:",
      err.response?.data || err.message
    );
    res.redirect("/login");
  }
});

// =====================
// API: ME
// =====================
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    id: req.session.user.id,
    username: req.session.user.username,
    avatar: req.session.user.avatar,
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
