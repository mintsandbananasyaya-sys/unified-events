require("dotenv").config();
 
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
} = require("discord.js");
 
const { getResponse } = require("./brain");
 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel], // REQUIRED for DMs
});
 
const APPLY_URL = process.env.APPLY_URL || "https://unified-events.onrender.com/apply.html";
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID; // where anonymous threads get created
 
/* =====================
   STATE (in-memory)
===================== */
 
// userId -> { expiresAt } — user just ran /forms, awaiting a 1-4 reply
const pendingMenu = new Map();
 
// userId -> threadId — active anonymous relay session
const userToThread = new Map();
 
// threadId -> { userId, type } — reverse lookup for staff-side messages
const threadToUser = new Map();
 
const MENU_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
 
const MENU_TEXT =
  `**How can we help you today?** Reply with a number:\n\n` +
  `1️⃣ Make a ticket\n` +
  `2️⃣ Report a player\n` +
  `3️⃣ Submit an application\n` +
  `4️⃣ Talk to Unified Events (anonymous staff chat)\n\n` +
  `Anything else you ask me normally still works as the Historian chatbot.`;
 
const TYPE_LABELS = {
  ticket: "🎫 Ticket",
  report: "🚩 Player Report",
  other: "💬 General Contact",
};
 
/* =====================
   HELPERS
===================== */
 
function cleanupExpiredMenus() {
  const now = Date.now();
  for (const [userId, data] of pendingMenu) {
    if (now > data.expiresAt) pendingMenu.delete(userId);
  }
}
 
async function openAnonymousThread(user, type) {
  if (!STAFF_CHANNEL_ID) {
    throw new Error("STAFF_CHANNEL_ID not configured");
  }
 
  const channel = await client.channels.fetch(STAFF_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("STAFF_CHANNEL_ID is not a valid text channel");
  }
 
  const thread = await channel.threads.create({
    name: `${type}-${user.id.slice(-5)}`,
    autoArchiveDuration: 1440,
    reason: `Anonymous ${type} session`,
  });
 
  await thread.send({
    content:
      `${TYPE_LABELS[type]} — new anonymous session opened.\n` +
      `Reply in this thread to respond. The user will see your messages as **"Unified Events Staff"** — your identity is not shown to them.\n` +
      `Type \`close\` in this thread to end the session.`,
  });
 
  userToThread.set(user.id, thread.id);
  threadToUser.set(thread.id, { userId: user.id, type });
 
  return thread;
}
 
async function closeSession(userId, threadId, { notifyUser = true, notifyThread = true } = {}) {
  userToThread.delete(userId);
  threadToUser.delete(threadId);
 
  if (notifyUser) {
    try {
      const user = await client.users.fetch(userId);
      await user.send("🔒 This session has been closed. DM me again or use `/forms` to start a new one.");
    } catch (err) {
      console.log("Could not notify user of close:", err.message);
    }
  }
 
  if (notifyThread) {
    try {
      const thread = await client.channels.fetch(threadId);
      await thread.send("🔒 Session closed.");
      await thread.setArchived(true);
    } catch (err) {
      console.log("Could not archive thread:", err.message);
    }
  }
}
 
/* =====================
   READY EVENT
===================== */
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
 
/* =====================
   SLASH COMMAND HANDLER
===================== */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
 
  if (interaction.commandName === "forms") {
    try {
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({ content: MENU_TEXT });
 
      cleanupExpiredMenus();
      pendingMenu.set(interaction.user.id, { expiresAt: Date.now() + MENU_TIMEOUT_MS });
 
      await interaction.reply({
        content: "Check your DMs — I've sent you the options! 📨",
        ephemeral: true,
      });
    } catch (err) {
      console.log("Forms command error:", err);
      await interaction.reply({
        content: "I couldn't DM you. Please enable DMs from server members and try again.",
        ephemeral: true,
      });
    }
  }
});
 
/* =====================
   MESSAGE HANDLER
===================== */
client.on("messageCreate", async (message) => {
  try {
    if (!message) return;
    if (message.author.bot) return;
 
    const content = message.content?.trim();
    if (!content) return;
 
    /* ---------- GUILD-SIDE: staff replying inside an anonymous thread ---------- */
    if (message.guild) {
      const session = threadToUser.get(message.channelId);
      if (!session) return; // not a tracked thread, ignore
 
      if (content.toLowerCase() === "close") {
        await closeSession(session.userId, message.channelId, { notifyThread: false });
        await message.reply("🔒 Session closed.");
        return;
      }
 
      try {
        const user = await client.users.fetch(session.userId);
        await user.send(`**Unified Events Staff:** ${content}`);
        await message.react("✅").catch(() => {});
      } catch (err) {
        console.log("Failed to forward staff message to user:", err.message);
        await message.reply("⚠️ Couldn't deliver that to the user (they may have DMs closed).");
      }
      return;
    }
 
    /* ---------- DM-SIDE ---------- */
 
    // 1) active anonymous relay session — forward everything to the thread
    if (userToThread.has(message.author.id)) {
      const threadId = userToThread.get(message.author.id);
 
      if (content.toLowerCase() === "close") {
        await closeSession(message.author.id, threadId, { notifyUser: false });
        await message.reply("🔒 Session closed.");
        return;
      }
 
      try {
        const thread = await client.channels.fetch(threadId);
        await thread.send(`**Anonymous:** ${content}`);
        await message.react("✅").catch(() => {});
      } catch (err) {
        console.log("Failed to forward DM to thread:", err.message);
        await message.reply("⚠️ Something went wrong delivering that — the session may have expired.");
      }
      return;
    }
 
    // 2) user just ran /forms and is picking an option
    cleanupExpiredMenus();
    if (pendingMenu.has(message.author.id) && ["1", "2", "3", "4"].includes(content)) {
      pendingMenu.delete(message.author.id);
 
      if (content === "1" || content === "2" || content === "4") {
        const type = content === "1" ? "ticket" : content === "2" ? "report" : "other";
        try {
          await openAnonymousThread(message.author, type);
          await message.reply(
            "You're connected to staff. Send your message here and they'll respond anonymously as **Unified Events Staff**. Type `close` anytime to end the session."
          );
        } catch (err) {
          console.log("Failed to open anonymous thread:", err.message);
          await message.reply("⚠️ Couldn't open a staff session right now. Please try again shortly.");
        }
      } else if (content === "3") {
        await message.reply(`Here's the application page: ${APPLY_URL}`);
      }
      return;
    }
 
    // 3) fallback — normal chatbot brain
    const reply = getResponse(content);
    if (!reply) return;
 
    await message.reply({
      content: reply,
      allowedMentions: { repliedUser: false },
    });
 
  } catch (err) {
    console.log("Bot error:", err);
  }
});
 
/* =====================
   LOGIN
===================== */
client.login(process.env.BOT_TOKEN);
