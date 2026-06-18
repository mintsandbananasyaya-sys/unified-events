require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const axios = require("axios");

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
let settings = {};

// =====================
// LOAD SETTINGS
// =====================
async function loadSettings() {
  try {
    const res = await axios.get(
      `https://unified-events.onrender.com/api/settings/1517281649375707176`
    );

    settings = res.data || {};
    console.log("Settings loaded:", settings);
  } catch (err) {
    console.log("Settings fetch failed:", err.message);
  }
}

setInterval(loadSettings, 5000);

// =====================
// TICKETS MEMORY
// =====================
const tickets = new Map();

// =====================
// READY
// =====================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  loadSettings();
});

// =====================
// MESSAGE HANDLER
// =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;

  // =====================
  // DM → STAFF FORWARD
  // =====================
  if (message.channel.isDMBased()) {
    try {
      if (!tickets.has(userId)) {
        tickets.set(userId, true);

        await message.reply(
          "👮 Staff received your message, hang tight..."
        );
      }

      if (!settings.staffChannelId) {
        console.log("No staffChannelId set");
        return;
      }

      const channel = await client.channels.fetch(settings.staffChannelId);

      if (!channel) {
        console.log("Staff channel not found");
        return;
      }

      await channel.send(
        `📩 **New DM from <@${userId}>**\n\n${message.content}`
      );
    } catch (err) {
      console.log("DM forward error:", err);
    }
  }

  // =====================
  // STAFF REPLY SYSTEM
  // =====================
  if (message.guild) {
    if (!settings.staffChannelId) return;
    if (message.channel.id !== settings.staffChannelId) return;

    if (message.content.startsWith("/reply")) {
      const args = message.content.split(" ");
      const targetId = args[1];
      const text = args.slice(2).join(" ");

      if (!targetId || !text) {
        return message.reply("Usage: /reply userId message");
      }

      try {
        const user = await client.users.fetch(targetId);

        await user.send(`👮 Staff: ${text}`);

        message.reply("sent ✔");
      } catch (err) {
        console.log(err);
        message.reply("failed to send 💀");
      }
    }
  }
});

// =====================
// LOGIN
// =====================
client.login(process.env.BOT_TOKEN);
