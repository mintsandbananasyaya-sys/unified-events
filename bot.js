require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");

const {
  getBestAnswer,
  searchKnowledge,
  addKnowledgeArticle,
  removeKnowledgeArticle,
  setDatabaseKnowledge,
} = require("./bot/search");

const {
  askAI,
  askGeneralAI,
} = require("./bot/ai");

const db = require("./database");

/* ================= ENV VALIDATION ================= */

const REQUIRED_ENV = ["BOT_TOKEN", "STAFF_CHANNEL_ID"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}`
  );
}

const APPLY_URL = process.env.APPLY_URL || "https://unified-events.onrender.com/apply.html";
const SITE_URL = process.env.SITE_URL || "https://unified-events.onrender.com";
const BOT_MESSAGE_LOGO_PATH = process.env.BOT_MESSAGE_LOGO_PATH || "logo.png";
const UNIFIED_APPLY_URL = process.env.UNIFIED_APPLY_URL || "https://unified-apply.onrender.com";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "";

const EMBED_COLOR_PRESETS = {
  blue: 0x4169ff,
  red: 0xff3b4e,
};

const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || null;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID || null;

const SETIGN_CHANNEL_ID = process.env.SETIGN_CHANNEL_ID || null;
const GUILD_ID = process.env.GUILD_ID || null;
const FAQ_CHANNEL_ID = process.env.FAQ_CHANNEL_ID || null;
const MUTED_ROLE_ID = process.env.MUTED_ROLE_ID || null;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || null;

const STAFF_ROLE_IDS = (process.env.STAFF_ROLE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const FORMS_KEYWORDS = ["support", "help", "staff", "apply"];
const MAX_RELAY_LENGTH = 1800;

/* ================= AI CONVERSATION MEMORY ================= */

const conversationMemory = new Map();

const MEMORY_TTL_MS = 10 * 60 * 1000;
const MAX_MEMORY_EXCHANGES = 3;

function getConversationMemory(userId) {
  const memory = conversationMemory.get(userId);

  if (!memory) {
    return [];
  }

  if (Date.now() - memory.updatedAt > MEMORY_TTL_MS) {
    conversationMemory.delete(userId);
    return [];
  }

  return memory.messages;
}

function saveConversationExchange(userId, question, answer) {
  const messages = getConversationMemory(userId);

  messages.push({
    question,
    answer,
  });

  while (messages.length > MAX_MEMORY_EXCHANGES) {
    messages.shift();
  }

  conversationMemory.set(userId, {
    messages,
    updatedAt: Date.now(),
  });
}

function formatConversationMemory(messages) {
  if (!messages.length) {
    return "No previous conversation.";
  }

  return messages
    .map((entry, index) => {
      return [
        `Previous exchange ${index + 1}:`,
        `User: ${entry.question}`,
        `Assistant: ${entry.answer}`,
      ].join("\n");
    })
    .join("\n\n");
}

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

/* ================= DATABASE SETUP ================= */

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

  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);

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

  await db.query(`
  CREATE TABLE IF NOT EXISTS knowledge_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    content TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )
`);

const { rows: savedKnowledge } = await db.query(`
  SELECT id, title, aliases, content
  FROM knowledge_articles
  ORDER BY id ASC
`);

setDatabaseKnowledge(savedKnowledge);

console.log(
  `Loaded ${savedKnowledge.length} database knowledge article(s)`
);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ign TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ign ON users(ign) WHERE ign IS NOT NULL`);

  // Auto-delete logs older than 30 days
  await db.query(`
    DELETE FROM logs
    WHERE created_at < $1
  `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]);

  console.log("Database tables ready");
}

const tablesReady = setupTables().catch((err) => {
  console.error("Failed to set up bot.js tables:", err.message);
  throw err;
});

/* ================= AUDIT LOG HELPER ================= */

async function createLog({ type, actorId, actorTag, targetId, targetTag, detail, guildId, channelId }) {
  try {
    await db.query(
      `INSERT INTO logs (type, actor_id, actor_tag, target_id, target_tag, detail, guild_id, channel_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [type, actorId || null, actorTag || null, targetId || null, targetTag || null, detail || null, guildId || null, channelId || null, Date.now()]
    );
  } catch (err) {
    console.error("createLog failed:", err.message);
  }
}

/* ================= STATE HELPERS ================= */

const MENU_TIMEOUT_MS = 5 * 60 * 1000;

async function setPendingMenu(userId) {
  await db.query(
    `INSERT INTO pending_menu (user_id, expires_at) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
    [userId, Date.now() + MENU_TIMEOUT_MS]
  );
}

async function getPendingMenu(userId) {
  const { rows } = await db.query(`SELECT * FROM pending_menu WHERE user_id = $1`, [userId]);
  return rows[0];
}

async function deletePendingMenu(userId) {
  await db.query(`DELETE FROM pending_menu WHERE user_id = $1`, [userId]);
}

async function cleanupMenus() {
  await db.query(`DELETE FROM pending_menu WHERE expires_at < $1`, [Date.now()]);
}

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

const NO_PING = { allowedMentions: { parse: [] } };

async function memberHasStaffRole(guild, userId) {
  if (!STAFF_ROLE_ID) return true;
  try {
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(STAFF_ROLE_ID);
  } catch {
    return false;
  }
}

function memberCanNotify(member) {
  if (STAFF_ROLE_IDS.length === 0) return false;
  return member.roles.cache.some((role) => STAFF_ROLE_IDS.includes(role.id));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mentionsFormsKeyword(text) {
  const lower = text.toLowerCase();
  return FORMS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const DURATION_UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDuration(input) {
  const match = /^(\d+)\s*([smhd])$/i.exec(input.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return amount * DURATION_UNIT_MS[unit];
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

async function notifyTargetBeforeAction(target, dmText, notifTitle, notifBody, sentBy) {
  let dmSucceeded = true;
  try {
    const dm = await target.createDM();
    await dm.send({ content: dmText, ...NO_PING });
  } catch {
    dmSucceeded = false;
  }
  await createUserNotification(target.id, notifTitle, notifBody, sentBy);
  return dmSucceeded;
}

const MAX_LOG_FIELD_LENGTH = 800;

function truncateForLog(text) {
  if (!text) return "*(empty)*";
  if (text.length <= MAX_LOG_FIELD_LENGTH) return text;
  return text.slice(0, MAX_LOG_FIELD_LENGTH) + "…(truncated)";
}

async function postToLogsChannel(content) {
  if (!STAFF_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(STAFF_CHANNEL_ID);
    await channel?.send({ content, allowedMentions: { parse: [] } });
  } catch (err) {
    console.error("Failed to post to logs channel:", err.message);
  }
}

function locationLabel(message) {
  if (message.guild) return `${message.guild.name} → #${message.channel?.name || message.channelId}`;
  return "Direct Message";
}

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ================= EDIT / DELETE LOGGING ================= */

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    const author = newMessage.author?.tag || oldMessage.author?.tag || "Unknown user";
    const authorId = newMessage.author?.id || oldMessage.author?.id;
    const oldContent = oldMessage.partial ? null : oldMessage.content;
    const newContent = newMessage.partial ? null : newMessage.content;

    if (oldContent !== null && newContent !== null && oldContent === newContent) return;

    const location = locationLabel(newMessage);
    const beforeText = oldContent !== null ? truncateForLog(oldContent) : "*(not cached)*";
    const afterText = newContent !== null ? truncateForLog(newContent) : "*(not cached)*";

    await createLog({
      type: "MESSAGE_EDIT",
      actorId: authorId,
      actorTag: author,
      detail: `Before: ${beforeText} | After: ${afterText}`,
      guildId: newMessage.guild?.id,
      channelId: newMessage.channelId,
    });

    await postToLogsChannel(
      `✏️ **Message edited** — ${author} in ${location}\n**Before:** ${beforeText}\n**After:** ${afterText}`
    );
  } catch (err) {
    console.error("messageUpdate logging error:", err);
  }
});

client.on("messageDelete", async (message) => {
  try {
    const author = message.author?.tag || "Unknown user";
    const authorId = message.author?.id;
    const location = locationLabel(message);
    const content = message.partial ? null : message.content;
    const contentText = content !== null && content !== "" ? truncateForLog(content) : "*(not cached)*";

    await createLog({
      type: "MESSAGE_DELETE",
      actorId: authorId,
      actorTag: author,
      detail: contentText,
      guildId: message.guild?.id,
      channelId: message.channelId,
    });

    await postToLogsChannel(
      `🗑️ **Message deleted** — ${author} in ${location}\n**Content:** ${contentText}`
    );
  } catch (err) {
    console.error("messageDelete logging error:", err);
  }
});

/* ================= WELCOME MESSAGE ================= */

client.on("guildMemberAdd", async (member) => {
  if (!WELCOME_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR_PRESETS.blue)
      .setTitle("Welcome!")
      .setDescription(`Welcome to the server, <@${member.id}>! Run **/setign <your minecraft username>** to verify and unlock the server.`)
      .setThumbnail(`${SITE_URL}/${BOT_MESSAGE_LOGO_PATH}`);

    await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
  } catch (err) {
    console.error("Welcome message failed:", err);
  }
});

/* ================= SLASH COMMANDS ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  /* ================= /setign ================= */
  if (interaction.commandName === "setign") {
    if (SETIGN_CHANNEL_ID && interaction.channelId !== SETIGN_CHANNEL_ID) {
      return safeReply(interaction, {
        content: `❌ You can only use this command in <#${SETIGN_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const ign = interaction.options.getString("ign").trim();

    let verifiedIgn;

    if (ign.startsWith(".")) {
      verifiedIgn = ign;
    } else {
      let mojangData;
      try {
        const axios = require("axios");
        const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`);
        mojangData = res.data;
      } catch (err) {
        if (err.response?.status === 404) {
          return safeReply(interaction, {
            content: `❌ **${ign}** doesn't exist on Mojang. Check the spelling and try again.\n\nIf you're on Bedrock, prefix your username with a dot — e.g. \`.${ign}\``,
            flags: MessageFlags.Ephemeral,
          });
        }
        console.error("Mojang API error:", err.message);
        return safeReply(interaction, {
          content: "⚠️ Couldn't reach Mojang's servers right now. Try again in a moment.",
          flags: MessageFlags.Ephemeral,
        });
      }
      verifiedIgn = mojangData.name;
    }

    const { rows: existing } = await db.query(
      `SELECT discord_id FROM users WHERE ign ILIKE $1`,
      [verifiedIgn]
    );

    if (existing.length > 0 && existing[0].discord_id !== interaction.user.id) {
      return safeReply(interaction, {
        content: `❌ **${verifiedIgn}** is already linked to another account. If this is a mistake, open a ticket with staff.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await db.query(
      `INSERT INTO users (discord_id, username, avatar, ign, verified)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (discord_id) DO UPDATE SET ign = EXCLUDED.ign, verified = TRUE`,
      [interaction.user.id, interaction.user.username, interaction.user.avatar, verifiedIgn]
    );

    if (VERIFIED_ROLE_ID && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(VERIFIED_ROLE_ID);
      } catch (err) {
        console.error("Failed to assign verified role:", err.message);
        return safeReply(interaction, {
          content: `✅ IGN set to **${verifiedIgn}** — but I couldn't assign your role. Ask a staff member to sort it.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await createLog({
      type: "SETIGN",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      detail: `Set IGN to ${verifiedIgn}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `✅ <@${interaction.user.id}> verified as **${verifiedIgn}**`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return safeReply(interaction, {
      content: `✅ Verified! Your IGN has been set to **${verifiedIgn}**. You now have access to the server.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  /* ================= /unsetign ================= */
  if (interaction.commandName === "unsetign") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, {
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { rows } = await db.query(
      `SELECT ign FROM users WHERE discord_id = $1`,
      [target.id]
    );
    const oldIgn = rows[0]?.ign || null;

    if (!oldIgn) {
      return interaction.editReply(`⚠️ <@${target.id}> doesn't have an IGN linked.`);
    }

    await db.query(
      `UPDATE users SET ign = NULL, verified = FALSE WHERE discord_id = $1`,
      [target.id]
    );

    if (VERIFIED_ROLE_ID && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(target.id);
        await member.roles.remove(VERIFIED_ROLE_ID);
      } catch (err) {
        console.error("Failed to remove verified role:", err.message);
      }
    }

    try {
      const dm = await target.createDM();
      await dm.send({
        content: `Your IGN (**${oldIgn}**) has been unlinked from your account by staff. Reason: ${reason}\n\nRun **/setign** again when you're ready to re-verify.`,
        ...NO_PING,
      });
    } catch {}

    await createUserNotification(
      target.id,
      "IGN unlinked by staff",
      `Your IGN (${oldIgn}) was removed. Reason: ${reason}`,
      interaction.user.id
    );

    await createLog({
      type: "UNSETIGN",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      targetId: target.id,
      targetTag: target.tag,
      detail: `Removed IGN: ${oldIgn} | Reason: ${reason}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({
          content: `🔗 ${interaction.user.tag} unlinked IGN **${oldIgn}** from <@${target.id}>. Reason: ${reason}`,
          allowedMentions: { parse: [] },
        }))
        .catch(() => {});
    }

    return interaction.editReply(
      `✅ Removed IGN **${oldIgn}** from <@${target.id}> and revoked their verified role.`
    );
  }

  /* ================= /addknowledge ================= */
if (interaction.commandName === "addknowledge") {
  if (!memberCanNotify(interaction.member)) {
    return safeReply(interaction, {
      content: "You don't have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const title = interaction.options.getString("title").trim();
  const answer = interaction.options.getString("answer").trim();

  const aliasesInput =
    interaction.options.getString("aliases") || "";

  const aliases = aliasesInput
    .split(",")
    .map((alias) => alias.trim().toLowerCase())
    .filter(Boolean);

  const now = Date.now();

  const { rows } = await db.query(
  `
    INSERT INTO knowledge_articles
      (title, aliases, content, created_by, created_at, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $5)
    RETURNING id, title, aliases, content
  `,
  [
    title,
    aliases,
    answer,
    interaction.user.id,
    now,
  ]
);

addKnowledgeArticle(rows[0]);

await createLog({
  type: "ADD_KNOWLEDGE",
  actorId: interaction.user.id,
  actorTag: interaction.user.tag,
  detail:
    `Article ID: ${rows[0].id} | ` +
    `Title: ${title} | ` +
    `Aliases: ${aliases.length ? aliases.join(", ") : "None"} | ` +
    `Answer: ${answer}`,
  guildId: interaction.guild?.id,
  channelId: interaction.channelId,
});

await postToLogsChannel(
  `🧠 **Knowledge added** — ${interaction.user.tag}\n` +
  `**ID:** ${rows[0].id}\n` +
  `**Title:** ${title}\n` +
  `**Aliases:** ${aliases.length ? aliases.join(", ") : "None"}\n` +
  `**Answer:** ${truncateForLog(answer)}`
);

return safeReply(interaction, {
  content:
    `✅ Added knowledge article **#${rows[0].id} — ${title}**.\n` +
    `Aliases: ${aliases.length ? aliases.join(", ") : "None"}`,
  flags: MessageFlags.Ephemeral,
});

  return safeReply(interaction, {
    content:
      `✅ Added knowledge article **#${rows[0].id} — ${title}**.\n` +
      `Aliases: ${aliases.length ? aliases.join(", ") : "None"}`,
    flags: MessageFlags.Ephemeral,
  });
}

/* ================= /removeknowledge ================= */
if (interaction.commandName === "removeknowledge") {
  if (!memberCanNotify(interaction.member)) {
    return safeReply(interaction, {
      content: "You don't have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const articleId = interaction.options.getInteger("id");

  const { rows } = await db.query(
    `
      DELETE FROM knowledge_articles
      WHERE id = $1
      RETURNING id, title
    `,
    [articleId]
  );

  if (rows.length === 0) {
    return safeReply(interaction, {
      content: `⚠️ No staff-added knowledge article with ID **#${articleId}** exists.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  removeKnowledgeArticle(articleId);

  return safeReply(interaction, {
    content: `✅ Removed knowledge article **#${articleId} — ${rows[0].title}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

  /* ================= /forms ================= */
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
      return safeReply(interaction, { content: "Check your DMs 📩", flags: MessageFlags.Ephemeral });
    } catch {
      return safeReply(interaction, { content: "Turn on DMs bro 😭", flags: MessageFlags.Ephemeral });
    }
  }

  /* ================= /schedule ================= */
  if (interaction.commandName === "schedule") {
    return safeReply(interaction, { content: "No schedule has been confirmed yet." });
  }

  /* ================= /status ================= */
  if (interaction.commandName === "status") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const res = await fetch(
        `${UNIFIED_APPLY_URL}/api/applications/status/${interaction.user.id}`,
        {
          headers: {
            "x-internal-secret": INTERNAL_SECRET,
          },
        }
      );

      if (!res.ok) {
        return interaction.editReply("⚠️ Couldn't reach the applications server. Try again later.");
      }

      const data = await res.json();

      if (!data.success) {
        return interaction.editReply("⚠️ Something went wrong checking your status. Try again later.");
      }

      // No application at all
      if (data.status === "none") {
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\nYou haven't submitted an application yet.\n\nApply here: ${UNIFIED_APPLY_URL}`
        );
      }

      const app = data.application;
      const submittedDate = new Date(app.createdAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });

      // Pending
      if (app.status === "pending") {
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\n🕐 **Pending review**\n\nYour application (attempt ${app.attemptNumber}) was submitted on ${submittedDate} and is waiting to be reviewed by staff. You'll receive a DM when a decision is made — this usually takes 24–72 hours.`
        );
      }

      // Accepted
      if (app.status === "accepted") {
        const note = app.reviewNote ? `\n\n📝 Note from staff: *${app.reviewNote}*` : "";
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\n✅ **Accepted!**\n\nCongratulations — your application was accepted. You should have been given the Season 1 Participant role. Check your roles in the server and your DMs for any additional information.${note}`
        );
      }

      // Rejected — blocked (used both attempts)
      if (app.status === "rejected" && app.blocked) {
        const note = app.reviewNote ? `\n\n📝 Note from staff: *${app.reviewNote}*` : "";
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\n❌ **Not accepted**\n\nUnfortunately your application wasn't successful and you've used both attempts for this season. You won't be able to reapply until a new season opens.${note}`
        );
      }

      // Rejected — can reapply
      if (app.status === "rejected" && app.canReapply) {
        const note = app.reviewNote ? `\n\n📝 Note from staff: *${app.reviewNote}*` : "";
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\n🔄 **Not accepted — second attempt granted**\n\nYour first application wasn't successful, but staff have granted you a second attempt. Head to the applications portal to reapply.\n\n${UNIFIED_APPLY_URL}${note}`
        );
      }

      // Rejected — waiting to hear if they get a second attempt
      if (app.status === "rejected") {
        const note = app.reviewNote ? `\n\n📝 Note from staff: *${app.reviewNote}*` : "";
        return interaction.editReply(
          `📋 **Application Status — Season 1**\n\n❌ **Not accepted**\n\nUnfortunately your application wasn't successful this time. Staff may grant you a second attempt — keep an eye on your DMs and notifications.${note}`
        );
      }

      return interaction.editReply("⚠️ Couldn't determine your application status. Try again later.");

    } catch (err) {
      console.error("[/status]", err);
      return interaction.editReply("⚠️ Something went wrong. Try again later.");
    }
  }

  /* ================= /bot-message ================= */
  if (interaction.commandName === "bot-message") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const targetChannel = interaction.options.getChannel("channel");
    const title = interaction.options.getString("title");
    const messageText = interaction.options.getString("message");
    const colorKey = interaction.options.getString("color");
    const color = EMBED_COLOR_PRESETS[colorKey];

    if (!color) return safeReply(interaction, { content: `⚠️ Unknown color "${colorKey}".`, flags: MessageFlags.Ephemeral });
    if (!targetChannel.isTextBased()) return safeReply(interaction, { content: "⚠️ Pick a text channel.", flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(messageText)
      .setThumbnail(`${SITE_URL}/${BOT_MESSAGE_LOGO_PATH}`);

    try {
      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("bot-message send failed:", err);
      return safeReply(interaction, { content: "⚠️ Failed to send. Check bot permissions.", flags: MessageFlags.Ephemeral });
    }

    await createLog({
      type: "BOT_MESSAGE",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      detail: `Title: ${title} | Color: ${colorKey} | Channel: #${targetChannel.name}`,
      guildId: interaction.guild?.id,
      channelId: targetChannel.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `📨 ${interaction.user.tag} posted a ${colorKey} bot-message to <#${targetChannel.id}>: **${title}**`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return safeReply(interaction, { content: `Sent to <#${targetChannel.id}>.`, flags: MessageFlags.Ephemeral });
  }


/* ================= /ask ================= */
if (interaction.commandName === "ask") {
  const q = interaction.options.getString("question", true).trim();

  const askReply =
    getBestAnswer(q) ??
    "I couldn't find anything about that. Try rewording your question.";

  return safeReply(interaction, {
    content: askReply,
    flags: MessageFlags.Ephemeral,
  });
}

  /* ================= /notify ================= */
  if (interaction.commandName === "notify") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser("user");
    const role   = interaction.options.getRole("role");
    const title   = interaction.options.getString("title");
    const message = interaction.options.getString("message");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target) {
      let dmFailed = false;
      try {
        const dm = await target.createDM();
        await dm.send({ content: `📢 **${title}**\n${message}`, ...NO_PING });
      } catch { dmFailed = true; }

      await createUserNotification(target.id, title, message, interaction.user.id);

      await createLog({
        type: "NOTIFY",
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        targetId: target.id,
        targetTag: target.tag,
        detail: `Title: ${title} | Message: ${message}${dmFailed ? " | DM failed" : ""}`,
        guildId: interaction.guild?.id,
      });

      if (STAFF_CHANNEL_ID) {
        await client.channels.fetch(STAFF_CHANNEL_ID)
          .then((ch) => ch?.send({ content: `🔔 ${interaction.user.tag} notified <@${target.id}>: **${title}**${dmFailed ? "\n⚠️ DM failed." : ""}`, allowedMentions: { parse: [] } }))
          .catch(() => {});
      }

      return interaction.editReply(dmFailed ? `Saved to dashboard, DM failed.` : `Notified <@${target.id}>.`);
    }

    if (!GUILD_ID) return interaction.editReply("⚠️ GUILD_ID isn't configured.");

    const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    if (!guild) return interaction.editReply("⚠️ Couldn't fetch the configured guild.");

    let members;
    try {
      members = await guild.members.fetch();
    } catch (err) {
      console.error("members.fetch failed:", err);
      return interaction.editReply("⚠️ Couldn't fetch server members. Enable the Server Members Intent.");
    }

    if (role) {
      const roleMembers = members.filter((m) => !m.user.bot && m.roles.cache.has(role.id));

      if (roleMembers.size === 0) {
        return interaction.editReply(`⚠️ No members found with the role **${role.name}**.`);
      }

      let sent = 0, failed = 0;
      for (const member of roleMembers.values()) {
        try {
          const dm = await member.user.createDM();
          await dm.send({ content: `📢 **${title}**\n${message}`, ...NO_PING });
          await createUserNotification(member.id, title, message, interaction.user.id);
          sent++;
        } catch { failed++; }
        await sleep(300);
      }

      await createLog({
        type: "NOTIFY_ROLE",
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        detail: `Role: ${role.name} | Title: ${title} | Message: ${message} | Sent: ${sent} | Failed: ${failed}`,
        guildId: interaction.guild?.id,
      });

      if (STAFF_CHANNEL_ID) {
        await client.channels.fetch(STAFF_CHANNEL_ID)
          .then((ch) => ch?.send({ content: `🔔 ${interaction.user.tag} notified **@${role.name}**: **${title}**\nSent: ${sent} · Failed: ${failed}`, allowedMentions: { parse: [] } }))
          .catch(() => {});
      }

      return interaction.editReply(`Role notification sent. ${sent} delivered, ${failed} failed.`);
    }

    const recipients = members.filter((m) => !m.user.bot);
    let sent = 0, failed = 0;

    for (const member of recipients.values()) {
      try {
        const dm = await member.user.createDM();
        await dm.send({ content: `📢 **${title}**\n${message}`, ...NO_PING });
        sent++;
      } catch { failed++; }
      await sleep(300);
    }

    await createBroadcastNotification(title, message, interaction.user.id);

    await createLog({
      type: "NOTIFY_ALL",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      detail: `Title: ${title} | Message: ${message} | Sent: ${sent} | Failed: ${failed}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `🔔 ${interaction.user.tag} broadcasted to ${guild.name}: **${title}**\nSent: ${sent} · Failed: ${failed}`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return interaction.editReply(`Broadcast sent. ${sent} delivered, ${failed} failed.`);
  }

  /* ================= /purge ================= */
  if (interaction.commandName === "purge") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const amount = interaction.options.getInteger("amount");
    const lockdownInput = interaction.options.getString("lockdown");

    if (amount < 1 || amount > 100) {
      return safeReply(interaction, { content: "⚠️ Amount must be between 1 and 100.", flags: MessageFlags.Ephemeral });
    }

    let lockdownMs = null;
    if (lockdownInput) {
      lockdownMs = parseDuration(lockdownInput);
      if (lockdownMs === null) {
        return safeReply(interaction, { content: "⚠️ Couldn't parse duration. Use e.g. `10m`, `2h`, `1d`.", flags: MessageFlags.Ephemeral });
      }
    }

    const channel = interaction.channel;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let deletedCount = 0;
    try {
      const deleted = await channel.bulkDelete(amount, true);
      deletedCount = deleted.size;
    } catch (err) {
      console.error("purge bulkDelete failed:", err);
      return interaction.editReply("⚠️ Failed to delete messages. Check bot permissions.");
    }

    let lockdownNote = "";
    if (lockdownMs !== null) {
      const everyoneRole = interaction.guild.roles.everyone;
      const existingOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
      const priorSendMessages = existingOverwrite
        ? existingOverwrite.deny.has("SendMessages") ? false : existingOverwrite.allow.has("SendMessages") ? true : null
        : null;

      try {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
        lockdownNote = `\n🔒 Channel locked for ${formatDuration(lockdownMs)}.`;
        setTimeout(async () => {
          try {
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: priorSendMessages });
            await channel.send("🔓 Lockdown lifted.").catch(() => {});
          } catch (err) { console.error("purge lockdown auto-restore failed:", err); }
        }, lockdownMs);
      } catch (err) {
        console.error("purge lockdown failed:", err);
        lockdownNote = "\n⚠️ Deleted messages, but failed to lock the channel.";
      }
    }

    await createLog({
      type: "PURGE",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      detail: `Deleted ${deletedCount} messages${lockdownMs ? ` | Locked for ${formatDuration(lockdownMs)}` : ""}`,
      guildId: interaction.guild?.id,
      channelId: channel.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `🧹 ${interaction.user.tag} purged ${deletedCount} message(s) in <#${channel.id}>${lockdownMs ? ` and locked it for ${formatDuration(lockdownMs)}.` : "."}`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return interaction.editReply(`Deleted ${deletedCount} message(s).${lockdownNote}`);
  }

  /* ================= /mute ================= */
  if (interaction.commandName === "mute") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }
    if (!MUTED_ROLE_ID) {
      return safeReply(interaction, { content: "⚠️ MUTED_ROLE_ID isn't configured.", flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const timeInput = interaction.options.getString("time");
    const muteMs = parseDuration(timeInput);

    if (muteMs === null) {
      return safeReply(interaction, { content: "⚠️ Couldn't parse duration. Use e.g. `10m`, `2h`, `1d`.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let member;
    try {
      member = await interaction.guild.members.fetch(target.id);
      await member.roles.add(MUTED_ROLE_ID);
    } catch (err) {
      console.error("mute role assignment failed:", err);
      return interaction.editReply("⚠️ Failed to apply the muted role. Check bot permissions.");
    }

    const durationLabel = formatDuration(muteMs);
    let dmFailed = false;
    try {
      const dm = await target.createDM();
      await dm.send({ content: `You've been muted for ${durationLabel} for: ${reason}`, ...NO_PING });
    } catch { dmFailed = true; }

    await createUserNotification(target.id, "You've been muted", `Muted for ${durationLabel} for: ${reason}`, interaction.user.id);

    await createLog({
      type: "MUTE",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      targetId: target.id,
      targetTag: target.tag,
      detail: `Duration: ${durationLabel} | Reason: ${reason}${dmFailed ? " | DM failed" : ""}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `🔇 ${interaction.user.tag} muted <@${target.id}> for ${durationLabel}: ${reason}${dmFailed ? "\n⚠️ DM failed." : ""}`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return interaction.editReply(dmFailed ? `Muted <@${target.id}> for ${durationLabel}. DM failed.` : `Muted <@${target.id}> for ${durationLabel}.`);
  }

  /* ================= /kick ================= */
  if (interaction.commandName === "kick") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const timeInput = interaction.options.getString("time");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const dmSucceeded = await notifyTargetBeforeAction(
      target,
      `You've been kicked from the server for ${timeInput}: ${reason}`,
      "You've been kicked",
      `Kicked (${timeInput}) for: ${reason}`,
      interaction.user.id
    );

    let member;
    try {
      member = await interaction.guild.members.fetch(target.id);
      await member.kick(reason);
    } catch (err) {
      console.error("kick failed:", err);
      return interaction.editReply("⚠️ Failed to kick. Check bot permissions.");
    }

    await createLog({
      type: "KICK",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      targetId: target.id,
      targetTag: target.tag,
      detail: `Duration: ${timeInput} | Reason: ${reason}${!dmSucceeded ? " | DM failed" : ""}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `👋 ${interaction.user.tag} kicked <@${target.id}> (${timeInput}): ${reason}${!dmSucceeded ? "\n⚠️ DM failed." : ""}`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return interaction.editReply(!dmSucceeded ? `Kicked <@${target.id}>. DM failed.` : `Kicked <@${target.id}>.`);
  }

  /* ================= /ban ================= */
  if (interaction.commandName === "ban") {
    if (!memberCanNotify(interaction.member)) {
      return safeReply(interaction, { content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const timeInput = interaction.options.getString("time");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const dmSucceeded = await notifyTargetBeforeAction(
      target,
      `You've been banned from the server for ${timeInput}: ${reason}`,
      "You've been banned",
      `Banned (${timeInput}) for: ${reason}`,
      interaction.user.id
    );

    try {
      await interaction.guild.members.ban(target.id, { reason });
    } catch (err) {
      console.error("ban failed:", err);
      return interaction.editReply("⚠️ Failed to ban. Check bot permissions.");
    }

    await createLog({
      type: "BAN",
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      targetId: target.id,
      targetTag: target.tag,
      detail: `Duration: ${timeInput} | Reason: ${reason}${!dmSucceeded ? " | DM failed" : ""}`,
      guildId: interaction.guild?.id,
    });

    if (STAFF_CHANNEL_ID) {
      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then((ch) => ch?.send({ content: `🔨 ${interaction.user.tag} banned <@${target.id}> (${timeInput}): ${reason}${!dmSucceeded ? "\n⚠️ DM failed." : ""}`, allowedMentions: { parse: [] } }))
        .catch(() => {});
    }

    return interaction.editReply(!dmSucceeded ? `Banned <@${target.id}>. DM failed.` : `Banned <@${target.id}>.`);
  }
});

/* ================= MESSAGE HANDLER ================= */

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    const content = message.content?.trim();
    if (!content) return;

if (
  message.guild &&
  FAQ_CHANNEL_ID &&
  message.channelId === FAQ_CHANNEL_ID
) {
const previousMessages = getConversationMemory(message.author.id);

const searchQuestion = content;
const results = searchKnowledge(searchQuestion, 5);

if (results.length === 0) {
  const conversationContext =
    formatConversationMemory(previousMessages);

  const generalReply = await askGeneralAI(
    content,
    conversationContext
  );

  if (!generalReply) {
    return message.reply(
      "Sorry, I couldn't generate a response right now."
    );
  }

  const finalReply = generalReply.slice(0, 2000);

  saveConversationExchange(
    message.author.id,
    content,
    finalReply
  );

  return message.reply(finalReply);
}

  const conversationContext =
  formatConversationMemory(previousMessages);

  const context = results
    .map((result, index) => {
      return [
        `Document ${index + 1}`,
        `Title: ${result.title}`,
        `Category: ${result.category}`,
        result.content,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const aiReply = await askAI(
  content,
  [
    "Recent conversation:",
    conversationContext,
    "",
    "Retrieved Unified Events documentation:",
    context,
  ].join("\n")
);

  if (aiReply) {
  const finalReply = aiReply.slice(0, 2000);

  saveConversationExchange(
    message.author.id,
    content,
    finalReply
  );

  return message.reply(finalReply);
}

// OpenRouter unavailable or free quota reached.
const fallbackReply = results[0].content.slice(0, 2000);

saveConversationExchange(
  message.author.id,
  content,
  fallbackReply
);

return message.reply(fallbackReply);
}

if (message.guild) {
      const session = await getSessionByThread(message.channelId);
      if (!session) return;

      const isStaff = await memberHasStaffRole(message.guild, message.author.id);
      if (!isStaff) return;

      if (content === "close") {
        if (session.ticket_id) await closeTicket(session.ticket_id);
        await deleteSessionByThread(message.channelId);
        return message.reply("closed 🔒");
      }

      const user = await client.users.fetch(session.user_id).catch(() => null);
      if (!user) return message.reply("⚠️ couldn't reach that user (left/blocked the bot).");

      const staffSender = `staff:${message.author.username}`;
      if (session.ticket_id) await logTicketMessage(session.ticket_id, staffSender, content);

      await user.send({ content: `Staff: ${truncate(content)}`, ...NO_PING }).catch(() => {
        message.reply("user DM closed 💀");
      });
      return;
    }

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
        await deleteSessionByUser(message.author.id);
        return message.reply("⚠️ That session no longer exists. Run `/forms` to start a new one.");
      }

      if (activeSession.ticket_id) await logTicketMessage(activeSession.ticket_id, "user", content);

      await thread.send({ content: `${label}: ${truncate(content)}`, ...NO_PING }).catch(() => {});
      return;
    }

    await cleanupMenus();

    if (await getPendingMenu(message.author.id)) {
      await deletePendingMenu(message.author.id);

      if (["1", "2", "4"].includes(content)) {
        const kind = content === "2" ? "report" : "support";
        const channel = await client.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!channel) return message.reply("⚠️ Staff channel is unavailable right now.");

        const threadName = kind === "report"
          ? `report-${Date.now().toString(36)}`
          : `support-${message.author.id.slice(-4)}`;

        const thread = await channel.threads.create({ name: threadName, type: ChannelType.PrivateThread });

        const ticketId = await createTicket(message.author.id, thread.id, kind);
        await createSession(message.author.id, thread.id, kind, ticketId);

        const announceMention = STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}> ` : "";
        const announceLabel = kind === "report" ? "anonymous report" : "ticket";
        await channel.send({
          content: `${announceMention}New ${announceLabel} opened: ${thread}`,
          allowedMentions: STAFF_ROLE_ID ? { roles: [STAFF_ROLE_ID] } : { parse: [] },
        }).catch(() => {});

        if (kind === "report") {
          await thread.send("📩 New anonymous report opened. Reply here to respond — the reporter only sees you as **Staff**.");
          await message.reply("connected anonymously to staff 🔒");
        } else {
          await message.reply("connected to staff 🔥");
        }
        return;
      }

      if (content === "3") return message.reply(APPLY_URL);
      return message.reply("Didn't catch that — please reply with a number from 1 to 4, or run `/forms` again.");
    }

       if (mentionsFormsKeyword(content)) {
      return message.reply(
        "Looking for support, staff, or to apply? Run `/forms` to get started."
      );
    }

const reply = getBestAnswer(content);

if (reply) {
  // If Fuse found a good answer, use it.
  return message.reply(reply);
}

// Nothing found? Let the AI try.
const aiReply = await askAI(
  content,
  "No relevant documentation was found."
);

if (aiReply) {
  return message.reply(aiReply);
}

return message.reply(
  "I couldn't find anything about that."
);

  } catch (err) {
    console.error("bot error:", err);
  }
});

/* ================= START ================= */

tablesReady
  .then(() => client.login(process.env.BOT_TOKEN))
  .catch((err) => { console.error("bot.js failed to start:", err.message); });
