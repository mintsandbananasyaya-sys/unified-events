require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN in .env");
if (!CLIENT_ID) throw new Error("Missing DISCORD_CLIENT_ID in .env");

const commands = [
  new SlashCommandBuilder()
    .setName("setign")
    .setDescription("Link your Minecraft username to verify and unlock the server")
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt.setName("ign").setDescription("Your exact Minecraft in-game name").setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unsetign")
    .setDescription("Remove a user's IGN and revoke their verified role (Staff only)")
    .setDMPermission(false)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to unverify").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Why you're removing their IGN").setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the Unified Events bot a question")
    .setDMPermission(true)
    .addStringOption((opt) =>
      opt.setName("question").setDescription("What do you want to know?").setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Get help: tickets, reports, applications, or talk to staff")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("See the schedule for the upcoming event")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of your Season 1 application")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("bot-message")
    .setDescription("Post a styled announcement embed to a channel")
    .setDMPermission(false)
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Which channel to post the message in").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("title").setDescription("The embed's header/title").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("message").setDescription("The embed's body text").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Accent color for the embed's side bar").setRequired(true)
        .addChoices({ name: "Blue", value: "blue" }, { name: "Red", value: "red" })
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("notify")
    .setDescription("Send a notification DM + dashboard entry to one user, a role, or everyone")
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt.setName("title").setDescription("Short notification title").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("message").setDescription("The notification body").setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Notify a specific user (leave empty for role or everyone)").setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("Notify everyone with this role (leave empty to notify everyone)").setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages and optionally lock the channel")
    .setDMPermission(false)
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("How many recent messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addStringOption((opt) =>
      opt.setName("lockdown").setDescription("Optional: lock the channel for this long, e.g. 10m, 2h, 1d").setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a member and DM them the reason and duration")
    .setDMPermission(false)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to mute").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Why this member is being muted").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("time").setDescription("How long, e.g. 10m, 2h, 1d").setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member, DMing them the reason first")
    .setDMPermission(false)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to kick").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Why this member is being kicked").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("time").setDescription("Informational only — e.g. 10m, 2h, 1d").setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member, DMing them the reason first")
    .setDMPermission(false)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to ban").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Why this member is being banned").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("time").setDescription("Informational only — e.g. 10m, 2h, 1d").setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands globally...");
    const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`✅ Slash commands loaded (${data.length} registered)`);
    console.log("ℹ️  /setign — guild-only, validates IGN against Mojang API.");
    console.log("ℹ️  /unsetign — Staff only, removes IGN and revokes VERIFIED_ROLE_ID.");
    console.log("ℹ️  /ask — DM-enabled, falls back to brain.js.");
    console.log("ℹ️  /forms — DM-enabled, opens the support menu.");
    console.log("ℹ️  /schedule — DM-enabled, currently a placeholder.");
    console.log("ℹ️  /status — DM-enabled, checks Season 1 application status.");
    console.log("ℹ️  /bot-message — guild-only, requires STAFF_ROLE_IDS.");
    console.log("ℹ️  /notify — guild-only, requires STAFF_ROLE_IDS. Supports user, role, or everyone.");
    console.log("ℹ️  /purge — guild-only, requires STAFF_ROLE_IDS + Manage Messages.");
    console.log("ℹ️  /mute — guild-only, requires STAFF_ROLE_IDS + Manage Roles + MUTED_ROLE_ID.");
    console.log("ℹ️  /kick and /ban — guild-only, require STAFF_ROLE_IDS + Kick/Ban Members.");
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();