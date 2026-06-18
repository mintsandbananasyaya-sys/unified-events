const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

// ⚠️ IMPORTANT: move these to .env later
const CLIENT_ID = "1516940820106838106";
const CLIENT_SECRET = "r7gPl_0HqiMqXgbB2nB3ie7csPuR6tw5";

// CHANGE THIS when deploying to Render
const REDIRECT_URI =
  process.env.REDIRECT_URI || "https://unified-events.onrender.com/auth/discord/callback";

// ---------------- MIDDLEWARE ----------------

app.use(express.static("public"));

app.use(
  session({
    secret: "unified-events-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ---------------- HOME ----------------

app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- LOGIN START ----------------

app.get("/auth/discord", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=identify`;

  res.redirect(url);
});

// ---------------- CALLBACK ----------------

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

    const userRes = await axios.get(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
        },
      }
    );

    req.session.user = userRes.data;

    res.redirect("/dashboard");
  } catch (err) {
    console.log("OAuth error:", err.response?.data || err.message);
    res.redirect("/login?error=oauth");
  }
});

// ---------------- DASHBOARD ----------------

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- API ----------------

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    id: req.session.user.id,
    username: req.session.user.username,
    avatar: req.session.user.avatar,
  });
});

// ---------------- LOGIN PAGE ----------------

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---------------- LOGOUT ----------------

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------- START SERVER ----------------

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
