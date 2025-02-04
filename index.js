const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const dotenv = require("dotenv");

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "!";

const youtubeCookies = [
  {
    name: process.env.COOKIE_NAME,
    value: process.env.COOKIE_VALUE,
  },
  { name: process.env.PREF_COOKIE_NAME, value: process.env.PREF_COOKIE_VALUE },
];

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "play") {
    if (!args[0]) {
      return message.reply("Please provide a YouTube link!");
    }

    const url = args[0];
    if (!ytdl.validateURL(url)) {
      return message.reply("Invalid YouTube link!");
    }

    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      return message.reply("You need to be in a voice channel to play music!");
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Using @distube/ytdl-core with custom headers (like User-Agent) to bypass the 403 error
      const stream = ytdl(url, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25, // To prevent issues with large buffers
        requestOptions: {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", // Mimic a real browser
          },
        },
        cookies: youtubeCookies,
      });

      const resource = createAudioResource(stream);
      const player = createAudioPlayer();

      connection.subscribe(player);
      player.play(resource);

      // message.reply(`Now playing: ${url}`);

      player.on("error", (error) => {
        console.error(error);
        message.reply("There was an error playing the audio.");
      });
    } catch (error) {
      console.error(error);
      message.reply("There was an error connecting to the voice channel.");
    }
  }
});

client.login(process.env.BOT_TOKEN);
