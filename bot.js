require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const axios = require("axios");

// =====================
// BOT SETUP
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

// =====================
// SETTINGS CACHE (GLOBAL)
// =====================
let settings = {};

// =====================
// LOAD SETTINGS FROM SERVER
// =====================
async function loadSettings() {
  try {
const res = await axios.get(
  "https://unified-events.onrender.com/api/settings/1517281649375707176"
);

settings = res.data;
  } catch (err) {
    console.log("settings fetch failed:", err.message);
  }
}

setInterval(loadSettings, 5000);

// =====================
// ACTIVE TICKETS
// =====================
const tickets = new Map();

// =====================
// BOT READY
// =====================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  loadSettings();
});

// =====================
// DM SYSTEM (/forms)
// =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // =====================
  // USER DM → CREATE TICKET
  // =====================
  if (message.channel.type === 1) {
    const userId = message.author.id;

    if (!tickets.has(userId)) {
      tickets.set(userId, true);

      await message.reply(
        "👮 Staff will respond here shortly. Please wait..."
      );
    }

    // forward to staff channel
    if (settings.staffChannelId) {
      const channel = await client.channels.fetch(settings.staffChannelId);

      channel.send(
        `📩 **New DM from <@${userId}>**\n\n${message.content}`
      );
    }
  }

  // =====================
  // STAFF REPLY SYSTEM
  // =====================
  if (message.guild) {
    if (!settings.staffChannelId) return;

    if (message.channel.id !== settings.staffChannelId) return;

    // format: /reply userId message
    if (message.content.startsWith("/reply")) {
      const args = message.content.split(" ");
      const userId = args[1];
      const text = args.slice(2).join(" ");

      try {
        const user = await client.users.fetch(userId);

        await user.send(`👮 Staff: ${text}`);

        message.reply("sent ✔");
      } catch (err) {
        message.reply("failed to send 💀");
      }
    }
  }
});

// =====================
// LOGIN
// =====================

client.login(process.env.BOT_TOKEN);