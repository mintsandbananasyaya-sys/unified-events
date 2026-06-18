require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// =====================
// DEFINE COMMANDS
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Start a support form in DMs")
    .toJSON(),
];

// =====================
// DISCORD REST CLIENT
// =====================
const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

// =====================
// REGISTER COMMANDS
// =====================
(async () => {
  try {
    console.log("⏳ registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ slash commands loaded");
  } catch (error) {
    console.error("❌ failed to deploy commands:", error);
  }
})();