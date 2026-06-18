require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");

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
// LOAD SETTINGS
// =====================
async function loadSettings() {
  try {
    const res = await axios.get(
      "https://unified-events.onrender.com/api/settings/1517281649375707176"
    );

    if (res.data) {
      settings = res.data;
    }

    console.log("✅ Settings updated");
  } catch (err) {
    console.log("❌ Settings load failed:", err.message);
  }
}

// initial + interval refresh
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
  if (!message || message.author.bot) return;

  const staffChannelId = settings.staffChannelId;

  // =====================
  // DM HANDLING
  // =====================
  if (message.channel.type === 1) {
    try {
      if (!staffChannelId) return;

      // first-time DM reply
      await message.reply("👮 Staff received your message, hang tight...");

      const channel = await client.channels.fetch(staffChannelId).catch(() => null);
      if (!channel) return;

      await channel.send(
        `📩 **New DM from <@${message.author.id}>**\n\n${message.content || "*no content*"}`
      );
    } catch (err) {
      console.log("❌ DM handler error:", err.message);
    }
  }

  // =====================
  // STAFF REPLY SYSTEM
  // =====================
  if (!message.guild) return;
  if (message.channel.id !== staffChannelId) return;

  if (!message.content.startsWith("/reply")) return;

  const args = message.content.split(" ");
  const userId = args[1];
  const text = args.slice(2).join(" ");

  if (!userId || !text) return message.reply("Usage: /reply <userId> <message>");

  try {
    const user = await client.users.fetch(userId);
    await user.send(`👮 Staff: ${text}`);

    message.reply("✅ Sent");
  } catch (err) {
    console.log("❌ Reply error:", err.message);
    message.reply("❌ Failed to send DM");
  }
});

// =====================
// LOGIN
// =====================
client.login(process.env.BOT_TOKEN);
