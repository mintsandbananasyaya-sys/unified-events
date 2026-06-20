require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

/* =====================
   ENV CHECK
===================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

// Throw instead of process.exit() — this file can now be loaded two ways:
//   1. `node deploy-commands.js` directly (process.exit is fine there, but
//      throwing still works — Node prints the error and exits non-zero)
//   2. `require("./deploy-commands.js")` from inside server.js (see
//      DEPLOY_COMMANDS workaround). process.exit() there would kill the
//      entire website process, not just this script — throwing instead
//      lets the caller's try/catch contain the damage.
if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN in .env");
}

if (!CLIENT_ID) {
  throw new Error("Missing DISCORD_CLIENT_ID in .env");
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

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages and optionally lock the channel for a duration")
    .setDMPermission(false) // guild-only — needs a real channel with Manage Messages
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("How many recent messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption((opt) =>
      opt
        .setName("lockdown")
        .setDescription("Optional: lock the channel for this long, e.g. 10m, 2h, 1d")
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a member and DM them the reason and duration")
    .setDMPermission(false) // guild-only — needs interaction.guild for the role check
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The member to mute")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Why this member is being muted")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("time")
        .setDescription("How long, e.g. 10m, 2h, 1d")
        .setRequired(true)
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
    console.log("ℹ️  /purge is guild-only and requires a role listed in STAFF_ROLE_IDS, plus the bot needs 'Manage Messages' and 'Manage Channels' permissions.");
    console.log("ℹ️  /mute is guild-only and requires a role listed in STAFF_ROLE_IDS, plus the bot needs 'Manage Roles' and MUTED_ROLE_ID configured.");
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();
