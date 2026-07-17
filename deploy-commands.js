"use strict";

require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN in .env");
}

if (!CLIENT_ID) {
  throw new Error("Missing DISCORD_CLIENT_ID in .env");
}

const commands = [
  new SlashCommandBuilder()
    .setName("setign")
    .setDescription("Link your Minecraft username and verify your account")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("ign")
        .setDescription("Your exact Minecraft in-game name")
        .setRequired(true)
        .setMaxLength(32)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unsetign")
    .setDescription("Remove a user's linked IGN and verified role")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member whose IGN should be removed")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why their IGN is being removed")
        .setRequired(false)
        .setMaxLength(500)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the Unified Events assistant a question")
    .setDMPermission(true)
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("What do you want to know?")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("addknowledge")
    .setDescription("Add information to the bot's knowledge base")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The knowledge title or question")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("answer")
        .setDescription("The information the bot should learn")
        .setRequired(true)
        .setMaxLength(1800)
    )
    .addStringOption((option) =>
      option
        .setName("aliases")
        .setDescription("Alternative searches, separated by commas")
        .setRequired(false)
        .setMaxLength(500)
    )
    .toJSON(),


    new SlashCommandBuilder()
  .setName("removeknowledge")
  .setDescription("Remove an article from the bot's knowledge base")
  .setDMPermission(false)
  .addIntegerOption((option) =>
    option
      .setName("id")
      .setDescription("The article ID shown when it was added")
      .setRequired(true)
      .setMinValue(1)
  )
  .toJSON(),
  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Open the support, report, application, or staff menu")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("View the schedule for the upcoming event")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of your Season 1 application")
    .setDMPermission(true)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("bot-message")
    .setDescription("Post a styled announcement embed")
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where the message should be posted")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The announcement title")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The announcement body")
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("The embed accent color")
        .setRequired(true)
        .addChoices(
          {
            name: "Blue",
            value: "blue",
          },
          {
            name: "Red",
            value: "red",
          }
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("notify")
    .setDescription("Notify one user, a role, or everyone")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The notification title")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The notification message")
        .setRequired(true)
        .setMaxLength(1800)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Notify one specific user")
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Notify everyone with this role")
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages and optionally lock the channel")
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of recent messages to delete")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption((option) =>
      option
        .setName("lockdown")
        .setDescription("Optional duration, such as 10m, 2h, or 1d")
        .setRequired(false)
        .setMaxLength(20)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a member for a specified duration")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to mute")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why the member is being muted")
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Duration, such as 10m, 2h, or 1d")
        .setRequired(true)
        .setMaxLength(20)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why the member is being kicked")
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Informational duration, such as 10m, 2h, or 1d")
        .setRequired(true)
        .setMaxLength(20)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why the member is being banned")
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Informational duration, such as 10m, 2h, or 1d")
        .setRequired(true)
        .setMaxLength(20)
    )
    .toJSON(),
];

const rest = new REST({
  version: "10",
}).setToken(BOT_TOKEN);

async function deployCommands() {
  try {
    console.log("⏳ Registering global slash commands...");

    const registeredCommands = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands,
      }
    );

    console.log(
      `✅ Registered ${registeredCommands.length} global slash commands.`
    );

    for (const command of registeredCommands) {
      console.log(`   /${command.name}`);
    }

    console.log("");
    console.log(
      "ℹ️ Global command changes can take some time to appear in every Discord server."
    );
  } catch (error) {
    console.error("❌ Failed to deploy slash commands:");

    if (error?.rawError) {
      console.error(
        JSON.stringify(error.rawError, null, 2)
      );
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}

deployCommands();