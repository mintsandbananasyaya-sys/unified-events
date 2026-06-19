require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

/* =====================
   DEFINE COMMANDS
===================== */
const commands = [
  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Get the forms link sent to your DMs")
    .toJSON(),
];

/* =====================
   ENV CHECK
===================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID; // matches server.js env var name

if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN in .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ Missing DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

/* =====================
   DISCORD REST CLIENT
===================== */
const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

/* =====================
   REGISTER COMMANDS
===================== */
(async () => {
  try {
    console.log("⏳ Registering slash commands...");

    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Slash commands loaded (${data.length} registered)`);
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();
