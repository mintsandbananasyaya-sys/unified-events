require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  MessageFlags,
} = require("discord.js");

const { getResponse } = require("./brain");
const db = require("./database"); // now a pg Pool, not better-sqlite3

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

// Channel where every message gets an automatic getResponse() reply,
// same brain as the DM fallback. Optional — if unset, this feature is
// simply inactive (no channel matches, so the check below never fires).
const FAQ_CHANNEL_ID = process.env.FAQ_CHANNEL_ID || null;

// If a DM (with no active session) contains any of these words anywhere
// in the message, nudge the user toward /forms instead of falling through
// to the generic AI/lore reply. Substring match, case-insensitive — e.g.
// "support" also matches inside "supporting" or "supportive". Intentionally
// loose per product decision; tighten to word-boundary matching later if
// false positives become annoying.
const FORMS_KEYWORDS = ["support", "help", "staff", "apply"];

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

/* ================= STATE (Postgres) =================
   All table creation + all helpers below are now async, since every
   pg query returns a Promise. Every call site elsewhere in this file
   has been updated to `await` these — there is no synchronous DB
   access anymore, unlike with better-sqlite3.
*/

async function setupTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_menu (
      user_id TEXT PRIMARY KEY,
      expires_at BIGINT NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      user_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      ticket_id INTEGER
    )
  `);

  // Permanent ticket log — survives even after the session/thread closes.
  // One row per ticket ever opened.
  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at BIGINT NOT NULL,
      closed_at BIGINT
    )
  `);

  // One row per message exchanged within a ticket, in order.
  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);

  // NOTE: this table wasn't found being created anywhere in the files
  // pasted so far (server.js/bot.js both query it, but neither's
  // visible CREATE TABLE covers it) — adding it here alongside the
  // other bot-owned tables. If it was actually created elsewhere
  // (a file not yet shared), let me know and we can remove this.
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      scope TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      sent_by TEXT,
      created_at BIGINT NOT NULL,
      read_at BIGINT
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)`);
}

// Table setup must finish before the bot starts handling events — queue
// it immediately, and other code awaits `tablesReady` before its first
// query. (See `client.login` at the very bottom, which now waits on this.)
const tablesReady = setupTables().catch((err) => {
  console.error("Failed to set up bot.js tables:", err.message);
  throw err;
});

const MENU_TIMEOUT_MS = 5 * 60 * 1000;

// -- pending menu helpers --
async function setPendingMenu(userId) {
  await db.query(
    `INSERT INTO pending_menu (user_id, expires_at) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
    [userId, Date.now() + MENU_TIMEOUT_MS]
  );
}

async function getPendingMenu(userId) {
  const { rows } = await db.query(
    `SELECT * FROM pending_menu WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

async function deletePendingMenu(userId) {
  await db.query(`DELETE FROM pending_menu WHERE user_id = $1`, [userId]);
}

async function cleanupMenus() {
  await db.query(`DELETE FROM pending_menu WHERE expires_at < $1`, [Date.now()]);
}

// -- session helpers --
async function createSession(userId, threadId, kind, ticketId) {
  await db.query(
    `INSERT INTO sessions (user_id, thread_id, kind, ticket_id) VALUES ($1, $2, $3, $4)`,
    [userId, threadId, kind, ticketId]
  );
}

async function getSessionByUser(userId) {
  const { rows } = await db.query(`SELECT * FROM sessions WHERE user_id = $1`, [userId]);
  return rows[0];
}

async function getSessionByThread(threadId) {
  const { rows } = await db.query(`SELECT * FROM sessions WHERE thread_id = $1`, [threadId]);
  return rows[0];
}

async function deleteSessionByUser(userId) {
  await db.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

async function deleteSessionByThread(threadId) {
  await db.query(`DELETE FROM sessions WHERE thread_id = $1`, [threadId]);
}

// -- ticket log helpers (permanent record, independent of session lifecycle) --
async function createTicket(userId, threadId, kind) {
  const { rows } = await db.query(
    `INSERT INTO tickets (user_id, thread_id, kind, status, created_at)
     VALUES ($1, $2, $3, 'open', $4)
     RETURNING id`,
    [userId, threadId, kind, Date.now()]
  );
  return rows[0].id;
}

async function closeTicket(ticketId) {
  await db.query(
    `UPDATE tickets SET status = 'closed', closed_at = $1 WHERE id = $2`,
    [Date.now(), ticketId]
  );
}

async function logTicketMessage(ticketId, sender, content) {
  await db.query(
    `INSERT INTO ticket_messages (ticket_id, sender, content, created_at) VALUES ($1, $2, $3, $4)`,
    [ticketId, sender, content, Date.now()]
  );
}

// -- notification helpers --
async function createUserNotification(userId, title, description, sentBy) {
  const { rows } = await db.query(
    `INSERT INTO notifications (scope, user_id, title, description, sent_by, created_at)
     VALUES ('user', $1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, title, description, sentBy, Date.now()]
  );
  return rows[0].id;
}

async function createBroadcastNotification(title, description, sentBy) {
  const { rows } = await db.query(
    `INSERT INTO notifications (scope, user_id, title, description, sent_by, created_at)
     VALUES ('broadcast', NULL, $1, $2, $3, $4)
     RETURNING id`,
    [title, description, sentBy, Date.now()]
  );
  return rows[0].id;
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

// Loose substring check against FORMS_KEYWORDS, case-insensitive.
function mentionsFormsKeyword(text) {
  const lower = text.toLowerCase();
  return FORMS_KEYWORDS.some((keyword) => lower.includes(keyword));
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
    if (await getSessionByUser(interaction.user.id)) {
      return safeReply(interaction, {
        content: "You already have an open session. DM me `close` to end it first.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const dm = await interaction.user.createDM();
      await dm.send(MENU_TEXT);

      await setPendingMenu(interaction.user.id);

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

      await createUserNotification(target.id, title, message, interaction.user.id);

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

    await createBroadcastNotification(title, message, interaction.user.id);

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

    /* ========== FAQ CHANNEL SIDE ==========
       Every message in this specific channel gets a getResponse() reply,
       same brain as the DM fallback further down. This check must come
       BEFORE the staff-thread session check below — otherwise a message
       posted here would hit `if (!session) return;` and be silently
       dropped, since this channel is never registered as a ticket thread.
    */
    if (message.guild && FAQ_CHANNEL_ID && message.channelId === FAQ_CHANNEL_ID) {
      const reply = getResponse(content);
      return message.reply(reply);
    }

    /* ========== STAFF THREAD SIDE ========== */
    if (message.guild) {
      const session = await getSessionByThread(message.channelId);
      if (!session) return;

      const isStaff = await memberHasStaffRole(message.guild, message.author.id);
      if (!isStaff) return; // silently ignore non-staff posting in a staff thread

      if (content === "close") {
        if (session.ticket_id) await closeTicket(session.ticket_id);
        await deleteSessionByThread(message.channelId);
        return message.reply("closed 🔒");
      }

      const user = await client.users.fetch(session.user_id).catch(() => null);
      if (!user) {
        return message.reply("⚠️ couldn't reach that user (left/blocked the bot).");
      }

      if (session.ticket_id) {
        await logTicketMessage(session.ticket_id, "staff", content);
      }

      await user.send({ content: `Staff: ${truncate(content)}`, ...NO_PING }).catch(() => {
        message.reply("user DM closed 💀");
      });

      return;
    }

    /* ========== DM SIDE ========== */

    // active session
    const activeSession = await getSessionByUser(message.author.id);
    if (activeSession) {
      const threadId = activeSession.thread_id;

      if (content === "close") {
        if (activeSession.ticket_id) await closeTicket(activeSession.ticket_id);
        await deleteSessionByUser(message.author.id);
        return message.reply("closed 🔒");
      }

      const label = activeSession.kind === "report" ? "Reporter" : "Anon";

      const thread = await client.channels.fetch(threadId).catch(() => null);
      if (!thread) {
        // Thread is gone (deleted/archived past recovery) — clean up state.
        await deleteSessionByUser(message.author.id);
        return message.reply("⚠️ That session no longer exists. Run `/forms` to start a new one.");
      }

      if (activeSession.ticket_id) {
        await logTicketMessage(activeSession.ticket_id, "user", content);
      }

      await thread
        .send({ content: `${label}: ${truncate(content)}`, ...NO_PING })
        .catch(() => {});

      return;
    }

    // menu selection
    await cleanupMenus();

    if (await getPendingMenu(message.author.id)) {
      await deletePendingMenu(message.author.id);

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

        const ticketId = await createTicket(message.author.id, thread.id, kind);
        await createSession(message.author.id, thread.id, kind, ticketId);

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

    /* ========== FALLBACK: KEYWORD NUDGE OR AI ==========
       By this point in a DM: no active session, no pending menu selection
       in progress. If the message mentions a forms-relevant keyword,
       nudge toward /forms instead of handing it to the generic AI reply.
    */
    if (mentionsFormsKeyword(content)) {
      return message.reply(
        "Looking for support, staff, or to apply? Run `/forms` to get started — it'll DM you a quick menu to pick from."
      );
    }

    const reply = getResponse(content);
    return message.reply(reply);
  } catch (err) {
    console.error("bot error:", err);
  }
});

// Wait for tables to exist before logging in / handling any events —
// otherwise an interaction could race ahead of CREATE TABLE finishing.
tablesReady
  .then(() => client.login(process.env.BOT_TOKEN))
  .catch((err) => {
    console.error("bot.js failed to start (table setup error):", err.message);
  });
