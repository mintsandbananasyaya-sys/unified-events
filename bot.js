require("dotenv").config();

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

const FORMS_URL = process.env.FORMS_URL || "https://yoursite.com/forms";

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
      // Try to DM the user with the forms link + a starter response
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({
        content: `Welcome to the Unified Events forms desk.\nFill out your form here: ${FORMS_URL}\n\nYou can also just ask me questions here in DMs — same Historian brain as the website chatbot.`,
        allowedMentions: { repliedUser: false },
      });

      await interaction.reply({
        content: "I've sent you a DM with the forms link! 📨",
        ephemeral: true,
      });
    } catch (err) {
      console.log("Forms command error:", err);
      await interaction.reply({
        content: `I couldn't DM you — here's the link directly: ${FORMS_URL}`,
        ephemeral: true,
      });
    }
  }
});

/* =====================
   MESSAGE HANDLER (DMs only)
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
