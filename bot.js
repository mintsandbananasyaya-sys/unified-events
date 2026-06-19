require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
} = require("discord.js");

const { getResponse } = require("./brain");

const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID; // optional lock

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel], // REQUIRED for DMs
});

/* =====================
   READY EVENT
===================== */
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
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

    // OPTIONAL: lock bot to staff channel ONLY (remove if you want global)
    if (STAFF_CHANNEL_ID) {
      if (message.guild && message.channelId !== STAFF_CHANNEL_ID) return;
    }

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
