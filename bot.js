javascriptrequire("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
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

    // Only respond in DMs — ignore anything sent in a server/guild channel
    if (message.guild) return;

    const content = message.content?.trim();
    if (!content) return;

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
