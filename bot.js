require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const { getResponse } = require("./brain");

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ---------------- PREFIX / CHAT RESPONSES ----------------
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const reply = getResponse(message.content);
  if (!reply) return;

  message.reply(reply);
});

// ---------------- SLASH COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName("forms")
    .setDescription("Get the application forms website"),

  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the Unified Events AI")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("What would you like to ask?")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your profile"),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a support ticket"),

  new SlashCommandBuilder()
    .setName("season")
    .setDescription("View current season information"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("View server rules"),
].map((cmd) => cmd.toJSON());

// ---------------- REGISTER COMMANDS ----------------
const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

async function registerCommands() {
  try {
    console.log("⏳ Registering slash commands...");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Slash commands registered successfully!");
  } catch (err) {
    console.error("❌ Slash command registration failed:");
    console.error(err);
  }
}

// ---------------- READY EVENT ----------------
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ---------------- START BOT ----------------
(async () => {
  await registerCommands();
  client.login(process.env.BOT_TOKEN);
})();
