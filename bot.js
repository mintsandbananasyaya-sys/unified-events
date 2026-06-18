
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
// GLOBAL STATE
// =====================
let settings = {};
const tickets = new Map();

// =====================
// LOAD SETTINGS FROM SERVER
// =====================
async function loadSettings() {
  try {
    const res = await axios.get(
      "https://unified-events.onrender.com/api/settings/1517281649375707176"
    );

    settings = res.data || {};
  } catch (err) {
    console.log("settings fetch failed:", err.message);
  }
}

// refresh settings safely
setInterval(loadSettings, 5000);

// =====================
// READY EVENT
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

  const staffChannelId = settings.staffChannelId;

  // =====================
  // DM HANDLING (NEW TICKET)
  // =====================
  if (!message.guild) {
    const userId = message.author.id;

    if (!tickets.has(userId)) {
      tickets.set(userId, true);

      try {
        await message.reply(
          "👮 Staff got your message. Hang tight."
        );
      } catch {}

      if (staffChannelId) {
        try {
          const channel = await client.channels.fetch(staffChannelId);

          channel.send(
            `📩 New DM from <@${userId}>\n\n${message.content}`
          );
        } catch (err) {
          console.log("failed forwarding DM:", err.message);
        }
      }
    }

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
  const text = args.slice(2).join(" ");

  if (!userId || !text) {
    return message.reply("usage: /reply <userId> <message>");
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send(`👮 Staff: ${text}`);
    message.reply("sent ✔");
  } catch (err) {
    message.reply("failed to send 💀");
  }
});

// =====================
// LOGIN BOT
// =====================
client.login(process.env.BOT_TOKEN);
