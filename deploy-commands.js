require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

/* =====================
   ENV CHECK
===================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN in .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ Missing DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

/* =====================
   DEFINE COMMANDS
===================== */
const commands = [
  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Get help: tickets, reports, applications, or talk to staff")
    .setDMPermission(true) // REQUIRED — without this, /forms won't show up or work in DMs
    .toJSON(),

  new SlashCommandBuilder()
    .setName("notify")
    .setDescription("Send a notification DM + dashboard entry to one user or everyone in the server")
    .setDMPermission(false) // guild-only — interaction.member must exist for the role check
    .addStringOption((opt) =>
      opt
        .setName("title")
        .setDescription("Short notification title")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("The notification body")
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Leave empty to notify every member of the server instead")
        .setRequired(false)
    )
    .toJSON(),
];

/* =====================
   DISCORD REST CLIENT
===================== */
const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

/* =====================
   REGISTER COMMANDS (GLOBAL)
===================== */
(async () => {
  try {
    console.log("⏳ Registering slash commands globally...");

    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Slash commands loaded (${data.length} registered)`);
    console.log("ℹ️  Global commands can take up to ~1 hour to fully propagate to all clients.");
    console.log("ℹ️  /forms is DM-enabled — try it by DMing the bot directly, not just in a server.");
    console.log("ℹ️  /notify is guild-only (run it inside your server, not in DMs) and requires a role listed in STAFF_ROLE_IDS.");
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();
