require("dotenv").config();

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();

// =====================
// BASIC SETUP
// =====================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// SESSION CONFIG
// =====================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// =====================
// DISCORD CONFIG (.env)
// =====================
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// =====================
// HOME ROUTE
// =====================
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================
// LOGIN REDIRECT
// =====================
app.get("/auth/discord", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=identify`;

  res.redirect(url);
});

// =====================
// DISCORD CALLBACK
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
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenRes.data.access_token}`,
      },
    });

    // SAVE USER IN SESSION 👇
    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      global_name: userRes.data.global_name,
      avatar: userRes.data.avatar,
    };

    return res.redirect("/dashboard");
  } catch (err) {
    console.log("OAuth error:", err.response?.data || err.message);
    return res.redirect("/login?error=oauth");
  }
});

// =====================
// LOGIN PAGE
// =====================
app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// =====================
// DASHBOARD PAGE (PROTECTED)
// =====================
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// =====================
// API: CURRENT USER
// =====================
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    id: req.session.user.id,
    username: req.session.user.global_name || req.session.user.username,
    avatar: req.session.user.avatar,
  });
});

// =====================
// LOGOUT
// =====================
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
