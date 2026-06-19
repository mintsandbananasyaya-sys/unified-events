require("dotenv").config();
 
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  MessageFlags,
} = require("discord.js");
 
const { getResponse } = require("./brain");
const db = require("./database");
 
/* ================= ENV VALIDATION ================= */
 
const REQUIRED_ENV = ["BOT_TOKEN", "STAFF_CHANNEL_ID"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
 
if (missing.length) {
  console.error(
    `❌ Missing required environment variable(s): ${missing.join(", ")}`
  );
  process.exit(1);
}
 
const APPLY_URL =
  process.env.APPLY_URL ||
  "https://unified-events.onrender.com/apply.html";
 
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID;
 
// Optional: if set, only members with this role can interact with
// staff-side threads (close them, see them as "staff"). If unset,
// the gate is skipped (anyone who can post in the staff channel/thread
// is treated as staff, same as the original behavior).
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || null;
 
const MAX_RELAY_LENGTH = 1800; // keep headroom under Discord's 2000 char cap
 
/* ================= CLIENT ================= */
 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});
 
/* ================= STATE (SQLite) ================= */
 
db.prepare(`
CREATE TABLE IF NOT EXISTS pending_menu (
  user_id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
)
`).run();
 
db.prepare(`
CREATE TABLE IF NOT EXISTS sessions (
  user_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL
)
`).run();
 
const MENU_TIMEOUT_MS = 5 * 60 * 1000;
 
// -- pending menu helpers --
function setPendingMenu(userId) {
  db.prepare(
    `INSERT INTO pending_menu (user_id, expires_at) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET expires_at = excluded.expires_at`
  ).run(userId, Date.now() + MENU_TIMEOUT_MS);
}
 
function getPendingMenu(userId) {
  return db.prepare(`SELECT * FROM pending_menu WHERE user_id = ?`).get(userId);
}
 
function deletePendingMenu(userId) {
  db.prepare(`DELETE FROM pending_menu WHERE user_id = ?`).run(userId);
}
 
function cleanupMenus() {
  db.prepare(`DELETE FROM pending_menu WHERE expires_at < ?`).run(Date.now());
}
 
// -- session helpers --
function createSession(userId, threadId, kind) {
  db.prepare(
    `INSERT INTO sessions (user_id, thread_id, kind) VALUES (?, ?, ?)`
  ).run(userId, threadId, kind);
}
 
function getSessionByUser(userId) {
  return db.prepare(`SELECT * FROM sessions WHERE user_id = ?`).get(userId);
}
 
function getSessionByThread(threadId) {
  return db.prepare(`SELECT * FROM sessions WHERE thread_id = ?`).get(threadId);
}
 
function deleteSessionByUser(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}
 
function deleteSessionByThread(threadId) {
  db.prepare(`DELETE FROM sessions WHERE thread_id = ?`).run(threadId);
}
 
const MENU_TEXT =
  `**How can we help you?**\n\n` +
  `1️⃣ Ticket\n2️⃣ Report (anonymous)\n3️⃣ Apply\n4️⃣ Staff Chat\n\n` +
  `Reply with a number (1-4).`;
 
/* ================= HELPERS ================= */
 
async function safeReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) return;
  return interaction.reply(payload);
}
 
function truncate(text) {
  if (text.length <= MAX_RELAY_LENGTH) return text;
  return text.slice(0, MAX_RELAY_LENGTH) + "\n…(truncated)";
}
 
// Strict: never let relayed user content trigger pings.
const NO_PING = { allowedMentions: { parse: [] } };
 
async function memberHasStaffRole(guild, userId) {
  if (!STAFF_ROLE_ID) return true; // gate disabled
  try {
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(STAFF_ROLE_ID);
  } catch {
    return false;
  }
}
 
/* ================= READY ================= */
 
// "ready" is the stable, documented event for discord.js v14.
// ("clientReady" is an alias added in very recent v14 patch releases —
// listening on "ready" works across all v14 versions, so it's the safer bet.)
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
 
/* ================= SLASH COMMANDS ================= */
 
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
 
  if (interaction.commandName === "forms") {
    if (getSessionByUser(interaction.user.id)) {
      return safeReply(interaction, {
        content: "You already have an open session. DM me `close` to end it first.",
        flags: MessageFlags.Ephemeral,
      });
    }
 
    try {
      const dm = await interaction.user.createDM();
      await dm.send(MENU_TEXT);
 
      setPendingMenu(interaction.user.id);
 
      return safeReply(interaction, {
        content: "Check your DMs 📩",
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      return safeReply(interaction, {
        content: "Turn on DMs bro 😭",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
 
  if (interaction.commandName === "ask") {
    const q = interaction.options.getString("question");
    const reply = getResponse(q);
 
    return safeReply(interaction, {
      content: reply,
      flags: MessageFlags.Ephemeral,
    });
  }
});
 
/* ================= MESSAGE HANDLER ================= */
 
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
 
    const content = message.content?.trim();
    if (!content) return;
 
    /* ========== STAFF THREAD SIDE ========== */
    if (message.guild) {
      const session = getSessionByThread(message.channelId);
      if (!session) return;
 
      const isStaff = await memberHasStaffRole(message.guild, message.author.id);
      if (!isStaff) return; // silently ignore non-staff posting in a staff thread
 
      if (content === "close") {
        deleteSessionByThread(message.channelId);
        return message.reply("closed 🔒");
      }
 
      const user = await client.users.fetch(session.user_id).catch(() => null);
      if (!user) {
        return message.reply("⚠️ couldn't reach that user (left/blocked the bot).");
      }
 
      await user.send({ content: `Staff: ${truncate(content)}`, ...NO_PING }).catch(() => {
        message.reply("user DM closed 💀");
      });
 
      return;
    }
 
    /* ========== DM SIDE ========== */
 
    // active session
    const activeSession = getSessionByUser(message.author.id);
    if (activeSession) {
      const threadId = activeSession.thread_id;
 
      if (content === "close") {
        deleteSessionByUser(message.author.id);
        return message.reply("closed 🔒");
      }
 
      const label = activeSession.kind === "report" ? "Reporter" : "Anon";
 
      const thread = await client.channels.fetch(threadId).catch(() => null);
      if (!thread) {
        // Thread is gone (deleted/archived past recovery) — clean up state.
        deleteSessionByUser(message.author.id);
        return message.reply("⚠️ That session no longer exists. Run `/forms` to start a new one.");
      }
 
      await thread
        .send({ content: `${label}: ${truncate(content)}`, ...NO_PING })
        .catch(() => {});
 
      return;
    }
 
    // menu selection
    cleanupMenus();
 
    if (getPendingMenu(message.author.id)) {
      deletePendingMenu(message.author.id);
 
      if (["1", "2", "4"].includes(content)) {
        const kind = content === "2" ? "report" : "support";
 
        const channel = await client.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!channel) {
          return message.reply("⚠️ Staff channel is unavailable right now. Please try again later.");
        }
 
        // For reports, avoid embedding any part of the user ID in the
        // visible thread name so it's not trivially identifiable at a glance.
        const threadName =
          kind === "report"
            ? `report-${Date.now().toString(36)}`
            : `support-${message.author.id.slice(-4)}`;
 
        const thread = await channel.threads.create({
          name: threadName,
          type: ChannelType.PrivateThread,
        });
 
        createSession(message.author.id, thread.id, kind);
 
        if (kind === "report") {
          await thread.send(
            "📩 New anonymous report opened. Reply here to respond — the reporter only sees you as **Staff**."
          );
          await message.reply("connected anonymously to staff 🔒");
        } else {
          await message.reply("connected to staff 🔥");
        }
        return;
      }
 
      if (content === "3") {
        return message.reply(APPLY_URL);
      }
 
      // Anything else: invalid selection, don't just go silent.
      return message.reply(
        "Didn't catch that — please reply with a number from 1 to 4, or run `/forms` again."
      );
    }
 
    /* ========== FALLBACK AI ========== */
    const reply = getResponse(content);
    return message.reply(reply);
  } catch (err) {
    console.error("bot error:", err);
  }
});
 
client.login(process.env.BOT_TOKEN);
 
