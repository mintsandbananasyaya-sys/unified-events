require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const axios = require("axios");

// =====================
// CLIENT SETUP
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// =====================
// SETTINGS CACHE
// =====================
let settings = {
  staffChannelId: null,
  staffRoleId: null,
};

// =====================
// LOAD SETTINGS (SAFE)
// =====================
async function loadSettings() {
  try {
    const res = await axios.get(
      "https://unified-events.onrender.com/api/settings/1517281649375707176"
    );

    if (res.data && typeof res.data === "object") {
      settings = res.data;
    }

    console.log("✅ Settings loaded");
  } catch (err) {
    console.log("❌ Settings fetch failed:", err.message);
  }
}

// initial load + interval refresh
loadSettings();
setInterval(loadSettings, 5000);

// =====================
// READY EVENT
// =====================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// =====================
// MESSAGE HANDLER
// =====================
client.on("messageCreate", async (message) => {
  try {
    if (!message || message.author.bot) return;

    const staffChannelId = settings.staffChannelId;

    // =====================
    // DM HANDLING (FIXED + RELIABLE)
    // =====================
    if (!message.guild) {
      console.log("📩 DM RECEIVED:", message.content);

      if (!staffChannelId) return;

      await message.reply("👮 Staff received your message, hang tight...");

      const channel = await client.channels
        .fetch(staffChannelId)
        .catch(() => null);

      if (!channel) {
        console.log("❌ Staff channel not found");
        return;
      }

      await channel.send(
        `📩 **New DM from <@${message.author.id}>**\n\n${message.content || "*no message content*"}`
      );

      return;
    }

    // =====================
    // STAFF REPLY SYSTEM
    // =====================
    if (!staffChannelId) return;
    if (message.channel.id !== staffChannelId) return;

    if (!message.content.startsWith("/reply")) return;

    const args = message.content.split(" ");
    const userId = args[1];
    const replyText = args.slice(2).join(" ");

    if (!userId || !replyText) {
      return message.reply("Usage: /reply <userId> <message>");
    }

    const user = await client.users.fetch(userId).catch(() => null);

    if (!user) {
      return message.reply("❌ User not found");
    }

    await user.send(`👮 Staff: ${replyText}`);
    await message.reply("✅ Sent");
  } catch (err) {
    console.log("❌ Handler error:", err.message);
  }
});

// =====================
// LOGIN
// =====================
client.login(process.env.BOT_TOKEN);
