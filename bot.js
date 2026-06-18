require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");

const axios = require("axios");

// =====================
// CLIENT
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
let settings = {};

// =====================
// LOAD SETTINGS
// =====================
async function loadSettings() {
  try {
    const res = await axios.get(
      "https://unified-events.onrender.com/api/settings/1517281649375707176"
    );

    settings = res.data || {};

    console.log("✅ Settings loaded:", settings);
  } catch (err) {
    console.log("❌ Settings load failed:", err.message);
  }
}

// load immediately + refresh loop
loadSettings();
setInterval(loadSettings, 5000);

// =====================
// SIMPLE TICKET MEMORY
// =====================
const activeTickets = new Set();

// =====================
// READY
// =====================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// =====================
// MESSAGE HANDLER
// =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const staffChannelId = settings.staffChannelId;

  // =====================
  // DM -> STAFF
  // =====================
  if (message.channel.isDMBased()) {
    try {
      if (!staffChannelId) {
        console.log("⚠️ No staffChannelId set");
        return;
      }

      // first message only
      if (!activeTickets.has(message.author.id)) {
        activeTickets.add(message.author.id);

        await message.reply(
          "👮 Staff has received your message, please wait..."
        );
      }

      const channel = await client.channels.fetch(staffChannelId);

      if (!channel) {
        console.log("❌ Staff channel not found");
        return;
      }

      await channel.send(
        `📩 **New DM from <@${message.author.id}>**\n\n${message.content || "*no text*"}`
      );

      console.log("✅ Forwarded DM to staff channel");
    } catch (err) {
      console.log("❌ DM forward error:", err.message);
    }
  }

  // =====================
  // STAFF REPLY SYSTEM
  // =====================
  if (!message.guild) return;

  if (!staffChannelId) return;
  if (message.channel.id !== staffChannelId) return;

  if (!message.content.startsWith("/reply")) return;

  const args = message.content.split(" ");
  const userId = args[1];
  const replyText = args.slice(2).join(" ");

  if (!userId || !replyText) {
    return message.reply("Usage: /reply <userId> <message>");
  }

  try {
    const user = await client.users.fetch(userId);

    await user.send(`👮 Staff: ${replyText}`);

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
