require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Embed,
} = require("discord.js");
const {
  joinVoiceChannel,
  SpeakingMap,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const { TOKEN } = process.env;
const { join } = require("node:path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// bot command prefix
const prefix = "don!";

let isTalking = false;
let channel = null;
let voiceConnection = null;
let target = null;

const commands = {
  target: {
    help: "Set the person that Donnie will target. Usage: don!target @ElizaThornberry . Must @ (mention) a valid user. THIS MUST BE A VALID USER, MEANING THE NAME MUST BE HIGHLIGHTED BLUE INDICATING YOU ARE MENTIONING A USER.",
    execute: async (message) => {
      if (message.mentions.users.size < 1) {
        message.reply("Must mention a valid user.");
      } else {
        target = message.mentions.users.first().id;
        checkForUserInVoice();
        if (!target) {
          message.reply("Please provide a valid user.");
        }
      }
    },
  },
  stop: {
    help: "Turn Donnie off.",
    execute: () => {
      if (voiceConnection) {
        voiceConnection.disconnect();
      }
      onOff = false;
    },
  },
  start: {
    help: "Turn Donnie on. ;)",
    execute: () => {
      onOff = true;
      checkForUserInVoice();
    },
  },
  help: {
    help: "List commands for donnie.",
    execute: (message) => {
      let helpMessage = new EmbedBuilder().setTitle("Donnie Bot Help");

      for (key in commands) {
        helpMessage.addFields({
          name: `${prefix}${key}`,
          value: commands[key].help,
        });
      }
      message.reply("Help yourself");
    },
  },
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  const content = message.content;
  if (content.startsWith(prefix)) {
    const cmd = content.substring(prefix.length).split(" ")[0];
    if (commands[cmd]) {
      commands[cmd].execute(message);
    } else {
      message.reply('Command not found, use "don!help" to see commands.');
    }
  }
});

// This function plays the donnie audio
// it will recursively play while the target
// is still speaking.
const play = (connection, audioPlayer, resource) => {
  const donnie = createDonnie();
  const subscribe = connection.subscribe(audioPlayer);
  audioPlayer.play(donnie);
  if (subscribe) {
    setTimeout(() => subscribe.unsubscribe(), 15_000);
  }
};

const stop = (audioPlayer) => {
  audioPlayer.stop();
};

const createDonnie = () => {
  const donnie = createAudioResource(join(__dirname, "donnie.mp3"), {
    inlineVolume: true,
  });
  donnie.volume.setVolume(0.5);

  return donnie;
};

const checkForUserInVoice = () => {
  let vcs = client.channels.cache.filter((c) => c.type === 2);
  const audioPlayer = createAudioPlayer();
  audioPlayer.on("error", (error) => error);

  for (const [key, value] of vcs) {
    if (value.members.has(target)) {
      channel = value;
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      voiceConnection = connection;

      audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
        if (isTalking) {
          stop(audioPlayer);
          play(connection, audioPlayer);
        }
      });

      connection.receiver.speaking.on("start", (userId) => {
        isTalking = true;

        play(connection, audioPlayer);
      });

      connection.receiver.speaking.on("end", (userId) => {
        isTalking = false;
        stop(audioPlayer);
      });
      return;
    }
  }
  if (voiceConnection) {
    voiceConnection.disconnect();
  }
};

client.login(TOKEN);
