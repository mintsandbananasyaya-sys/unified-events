const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

const CLIENT_ID = "1516940820106838106";
const CLIENT_SECRET = "r7gPl_0HqiMqXgbB2nB3ie7csPuR6tw5";
const REDIRECT_URI = "http://localhost:3000/auth/discord/callback";

let processing = false;

app.get("/auth/discord/callback", async (req, res) => {
  if (processing) return;
  processing = true;

  const code = req.query.code;

  try {
    // your token exchange code here
  } finally {
    processing = false;
  }
});

app.use(session({
  secret: "unified-events-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));

// Home — redirect based on auth state
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Discord OAuth redirect
app.get("/auth/discord", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(url);
});

// Discord callback — exchange code for user
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    req.session.user = userRes.data;
    res.redirect("/dashboard");
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.redirect("/login?error=1");
  }
});

// Dashboard — protected
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// API route — lets your HTML pages read session user data
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ loggedIn: false });
  }
  res.json({
    loggedIn: true,
    id: req.session.user.id,
    username: req.session.user.username,
    avatar: req.session.user.avatar
  });
});

// Login page
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
