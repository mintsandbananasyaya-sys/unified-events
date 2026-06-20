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
  // Note: this file is loaded via require("./bot.js") inside server.js,
  // wrapped in a try/catch so a bot misconfiguration doesn't take the
  // whole website down. process.exit() would bypass that try/catch
  // entirely (it kills the process immediately, uncatchable) — so we
  // throw instead, letting the caller decide what to do.
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}`
  );
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

// Comma-separated list of role IDs allowed to run /notify.
// e.g. STAFF_ROLE_IDS=111111111111111111,222222222222222222
// If unset, /notify is disabled (command handler will refuse everyone).
const STAFF_ROLE_IDS = (process.env.STAFF_ROLE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// The single guild /notify all targets.
const GUILD_ID = process.env.GUILD_ID || null;

const MAX_RELAY_LENGTH = 1800; // keep headroom under Discord's 2000 char cap

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // required for guild.members.fetch() in /notify all
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
  kind TEXT NOT NULL,
  ticket_id INTEGER
)
`).run();

// Permanent ticket log — survives even after the session/thread closes.
// One row per ticket ever opened.
db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  closed_at INTEGER
)
`).run();

// One row per message exchanged within a ticket, in order.
db.prepare(`
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
)
`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)`).run();

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
function createSession(userId, threadId, kind, ticketId) {
  db.prepare(
    `INSERT INTO sessions (user_id, thread_id, kind, ticket_id) VALUES (?, ?, ?, ?)`
  ).run(userId, threadId, kind, ticketId);
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

// -- ticket log helpers (permanent record, independent of session lifecycle) --
function createTicket(userId, threadId, kind) {
  const result = db
    .prepare(
      `INSERT INTO tickets (user_id, thread_id, kind, status, created_at) VALUES (?, ?, ?, 'open', ?)`
    )
    .run(userId, threadId, kind, Date.now());
  return result.lastInsertRowid;
}

function closeTicket(ticketId) {
  db.prepare(`UPDATE tickets SET status = 'closed', closed_at = ? WHERE id = ?`).run(
    Date.now(),
    ticketId
  );
}

function logTicketMessage(ticketId, sender, content) {
  db.prepare(
    `INSERT INTO ticket_messages (ticket_id, sender, content, created_at) VALUES (?, ?, ?, ?)`
  ).run(ticketId, sender, content, Date.now());
}

// -- notification helpers --
function createUserNotification(userId, title, description, sentBy) {
  const result = db
    .prepare(
      `INSERT INTO notifications (scope, user_id, title, description, sent_by, created_at)
       VALUES ('user', ?, ?, ?, ?, ?)`
    )
    .run(userId, title, description, sentBy, Date.now());
  return result.lastInsertRowid;
}

function createBroadcastNotification(title, description, sentBy) {
  const result = db
    .prepare(
      `INSERT INTO notifications (scope, user_id, title, description, sent_by, created_at)
       VALUES ('broadcast', NULL, ?, ?, ?, ?)`
    )
    .run(title, description, sentBy, Date.now());
  return result.lastInsertRowid;
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

// Used for the /notify command specifically — separate from the staff-thread
// gate above since the allowed role list is configured independently
// (STAFF_ROLE_IDS, plural, vs STAFF_ROLE_ID for thread access).
function memberCanNotify(member) {
  if (STAFF_ROLE_IDS.length === 0) return false; // disabled if unconfigured
  return member.roles.cache.some((role) => STAFF_ROLE_IDS.includes(role.id));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  if (interaction.commandName === "notify") {
    // --- permission gate ---
    // Guild-only command (see command definition), so interaction.member
    // is always populated here — no DM-context fallback needed.
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, {
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const target = interaction.options.getUser("user"); // null for /notify all
    const title = interaction.options.getString("title");
    const message = interaction.options.getString("message");

    // Defer immediately — /notify all can take a while to DM everyone,
    // and Discord requires a response within 3 seconds otherwise.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target) {
      // ---- /notify (single user) ----
      let dmFailed = false;
      try {
        const dm = await target.createDM();
        await dm.send({
          content: `📢 **${title}**\n${message}`,
          ...NO_PING,
        });
      } catch {
        dmFailed = true;
      }

      createUserNotification(target.id, title, message, interaction.user.id);

      if (STAFF_CHANNEL_ID) {
        await client.channels
          .fetch(STAFF_CHANNEL_ID)
          .then((ch) =>
            ch?.send({
              content:
                `🔔 ${interaction.user.tag} notified <@${target.id}>: **${title}**` +
                (dmFailed ? "\n⚠️ DM failed (closed DMs or left server)." : ""),
              allowedMentions: { parse: [] },
            })
          )
          .catch(() => {});
      }

      return interaction.editReply(
        dmFailed
          ? `Saved to their dashboard, but the DM failed (they may have DMs off).`
          : `Notified <@${target.id}>.`
      );
    }

    // ---- /notify all ----
    if (!GUILD_ID) {
      return interaction.editReply(
        "⚠️ GUILD_ID isn't configured — can't determine which server's members to notify."
      );
    }

    const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    if (!guild) {
      return interaction.editReply(
        "⚠️ Couldn't fetch the configured guild. Check GUILD_ID and that the bot is in that server."
      );
    }

    let members;
    try {
      members = await guild.members.fetch(); // requires GuildMembers privileged intent
    } catch (err) {
      console.error("members.fetch failed:", err);
      return interaction.editReply(
        "⚠️ Couldn't fetch server members. Make sure the 'Server Members Intent' is enabled for this bot in the Discord Developer Portal."
      );
    }

    const recipients = members.filter((m) => !m.user.bot);

    let sent = 0;
    let failed = 0;

    for (const member of recipients.values()) {
      try {
        const dm = await member.user.createDM();
        await dm.send({
          content: `📢 **${title}**\n${message}`,
          ...NO_PING,
        });
        sent++;
      } catch {
        failed++;
      }
      // Small delay between DMs to stay well clear of Discord's rate limits
      // when notifying a large member list.
      await sleep(300);
    }

    createBroadcastNotification(title, message, interaction.user.id);

    if (STAFF_CHANNEL_ID) {
      await client.channels
        .fetch(STAFF_CHANNEL_ID)
        .then((ch) =>
          ch?.send({
            content:
              `🔔 ${interaction.user.tag} broadcasted to ${guild.name}: **${title}**\n` +
              `Sent: ${sent} · Failed: ${failed} (DMs off / left server)`,
            allowedMentions: { parse: [] },
          })
        )
        .catch(() => {});
    }

    return interaction.editReply(
      `Broadcast sent. ${sent} delivered, ${failed} failed (DMs off or left server).`
    );
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
        if (session.ticket_id) closeTicket(session.ticket_id);
        deleteSessionByThread(message.channelId);
        return message.reply("closed 🔒");
      }

      const user = await client.users.fetch(session.user_id).catch(() => null);
      if (!user) {
        return message.reply("⚠️ couldn't reach that user (left/blocked the bot).");
      }

      if (session.ticket_id) {
        logTicketMessage(session.ticket_id, "staff", content);
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
        if (activeSession.ticket_id) closeTicket(activeSession.ticket_id);
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

      if (activeSession.ticket_id) {
        logTicketMessage(activeSession.ticket_id, "user", content);
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

        const ticketId = createTicket(message.author.id, thread.id, kind);
        createSession(message.author.id, thread.id, kind, ticketId);

        // Private threads don't show up for anyone automatically — post a
        // visible notice in the parent channel so staff actually notice a
        // new thread exists, and ping the staff role if one is configured.
        const announceMention = STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}> ` : "";
        const announceLabel = kind === "report" ? "anonymous report" : "ticket";
        await channel
          .send({
            content: `${announceMention}New ${announceLabel} opened: ${thread}`,
            allowedMentions: STAFF_ROLE_ID ? { roles: [STAFF_ROLE_ID] } : { parse: [] },
          })
          .catch(() => {});

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
