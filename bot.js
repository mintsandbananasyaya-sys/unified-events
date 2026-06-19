require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const { getResponse } = require("./brain");

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ---------------- TEXT MESSAGES (SERVERS + DMS) ----------------
client.on("messageCreate", async (message) => {
  try {
    if (!message || !message.content) return;
    if (message.author.bot) return;

    const reply = getResponse(message.content);
    if (!reply) return;

    await message.reply({
      content: reply,
      allowedMentions: { repliedUser: false },
    });
  } catch (err) {
    console.error("messageCreate error:", err);
  }
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

// ---------------- REGISTER SLASH COMMANDS ----------------
const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

async function registerCommands() {
  try {
    console.log("⏳ Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error("❌ Slash command error:", err);
  }
}

// ---------------- SLASH COMMAND HANDLER ----------------
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "ask") {
      const question = interaction.options.getString("question");
      const reply = getResponse(question);

      return interaction.reply(reply);
    }

    if (commandName === "forms") {
      return interaction.reply("📄 Forms: https://example.com");
    }

    if (commandName === "profile") {
      return interaction.reply("👤 Profile system coming soon.");
    }

    if (commandName === "ticket") {
      return interaction.reply("🎫 Ticket system coming soon.");
    }

    if (commandName === "season") {
      return interaction.reply("🌍 Season info loading...");
    }

    if (commandName === "rules") {
      return interaction.reply("📜 Be respectful, no cheating.");
    }
  } catch (err) {
    console.error("interaction error:", err);
  }
});

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ---------------- START BOT ----------------
(async () => {
  await registerCommands();
  await client.login(process.env.BOT_TOKEN);
})();
