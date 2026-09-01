/**
 * Disguard local example. Copy this into your bot and tune the config.
 *
 * Required intents: Guilds, GuildMessages, MessageContent, GuildMembers
 * Bot permissions: Manage Messages, Moderate Members, Send Messages
 * Embed Links is needed only if you set punishment.logChannelId
 *
 * Run from the repo root: npm run dev
 */

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { AntiSpam } = require("..");
const { requireDiscordToken } = require("./load-env");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message],
});

const antispam = new AntiSpam(client, {
  preset: "balanced",
  locale: "es",
  dryRun: false,
  ignorePermissions: ["ManageMessages"],
  ignoreThreads: false,
  ignored: {
    roles: ["ID_ROL_STAFF"],
    channels: ["ID_CANAL_BOTS"],
    prefixes: ["!", "/", "."],
  },
  flood: {
    maxMessages: 5,
    windowMs: 4000,
  },
  duplicates: {
    maxRepeats: 3,
    similarity: 0.9,
  },
  links: {
    blockInvites: false,
    blockOauth: true,
    allowList: ["youtube.com", "github.com"],
    blockList: ["malicioso.ejemplo"],
  },
  images: {
    maxRepeats: 3,
    hashMode: "meta",
  },
  files: {
    blockedExtensions: ["exe", "bat", "cmd", "scr", "dll", "msi"],
    maxBytes: 0,
  },
  words: {
    enabled: false,
    list: ["raid-now"],
    regex: [],
  },
  hop: {
    enabled: true,
    maxChannels: 5,
    windowMs: 8000,
  },
  ghostPing: {
    enabled: false,
    minMentions: 1,
    maxAgeMs: 15_000,
  },
  accounts: {
    enabled: false,
    minAgeDays: 3,
    minGuildAgeDays: 0,
  },
  punishment: {
    deleteMessage: true,
    warnUser: true,
    warnAsEmbed: false,
    timeout: { enabled: true, durationMs: 60_000, minStrikes: 2, scale: "none" },
    cooldownMs: 8_000,
    deleteDuringCooldown: true,
    addRoleIds: [],
    removeRoleIds: [],
    logChannelId: null,
  },
  onDetect(incident) {
    console.log("[detect]", incident.type, incident.reason);
  },
  onAction(result) {
    console.log("[action]", result.applied, result.skipped);
  },
  onCooldown(message) {
    console.log("[cooldown]", message.author.id);
  },
});

let booted = false;
function onReady() {
  if (booted) return;
  booted = true;
  antispam.start();
  console.log(`Listo como ${client.user.tag}`);
}

client.once("clientReady", onReady);
client.once("ready", onReady);

client.login(requireDiscordToken());

process.on("SIGINT", () => {
  antispam.stop();
  client.destroy();
});
