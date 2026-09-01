# Disguard

<div align="center">

**Configurable antispam for discord.js v14**

Flood · phishing · channel hop · blocked words · ghost pings · TypeScript

[![npm version](https://img.shields.io/npm/v/@amatiscorp/disguard.svg?style=flat-square)](https://www.npmjs.com/package/@amatiscorp/disguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

[Install](#install) · [Quick start](#quick-start) · [API](#api) · [Español](#español)

</div>

---

npm: [`@amatiscorp/disguard`](https://www.npmjs.com/package/@amatiscorp/disguard)

Configurable antispam for [discord.js](https://discord.js.org) v14 bots.

It is **not** a bot. You plug it into your existing `Client` and decide every threshold, allowlist, and punishment.

Detects flood, channel hopping, blocked words, phishing / unwanted links, duplicate images, mention spam, ghost pings, excessive caps, and emoji spam.

> **Español:** librería antispam configurable para bots de discord.js. No es un bot. La documentación en español está más abajo: [Español](#español).

---

**Languages**

- [English](#english)
- [Español](#español)

---

# English

## What's new in 1.3.0

More detectors, role overlays, mute-style role punishments, and extra ignore knobs. Everything is optional and falls back to the preset.

| Option | Default | What it does |
| --- | --- | --- |
| `words` | **off**, empty list | Block a word list and/or regex. `ignoreCase` and `matchWholeWord` are both `true` by default. |
| `hop` | **on**, 5 channels / 8s | Same user posting across too many unique channels in a window (raid / hop). |
| `punctuation` | **on**, 10 | `aaaaaa` / `!!!!!!` runs longer than `maxRepeated`. |
| `spoilers` | **on**, 8 pairs | Too many `\|\|spoiler\|\|` pairs in one message. |
| `ghostPing` | **off** (`strict`: on) | Punish deleting a message that mentioned people (`messageDelete`). |
| `checkDeletes` | `true` | Listen for `messageDelete`. Set `false` if you do not want ghost-ping checks. |
| `ignored.prefixes` | `[]` | Skip messages that start with `!`, `/`, `.`, etc. |
| `ignoreThreads` | `false` | Skip thread messages. |
| `ignoreSystem` | `true` | Skip Discord system messages. |
| `roleOverrides` / `setRoleConfig` | `{}` | Per-role config overlay (before channel overrides). |
| `links.blockOauth` | `true` | Flag non-allowlisted URLs whose path looks like `/oauth`, `/authorize`, `/login`. Official `discord.com` stays allowed. |
| `files.maxBytes` | `0` | Max attachment size in bytes. `0` = unlimited. |
| `accounts.minGuildAgeDays` | `0` | Flag members who joined the guild too recently. `0` = off. |
| `punishment.addRoleIds` / `removeRoleIds` | `[]` | Add/remove roles on punish (mute role). Needs **Manage Roles**. |
| `punishment.minStrikesForRoles` | `1` | Minimum strikes before those role actions run. |
| `onCooldown` | — | Callback when extra spam is deleted quietly during the punishment cooldown. |
| `pause()` / `resume()` | — | Freeze enforcement without removing listeners. |

```js
const antispam = new AntiSpam(client, {
  preset: "balanced",
  locale: "es",
  ignored: { prefixes: ["!", "/", "."], roles: ["STAFF_ROLE_ID"] },
  words: { enabled: true, list: ["raid-now"], regex: ["n[i1]tro\\s+free"] },
  hop: { maxChannels: 4, windowMs: 6_000 },
  ghostPing: { enabled: true, minMentions: 1, maxAgeMs: 15_000 },
  links: { blockOauth: true },
  files: { maxBytes: 8 * 1024 * 1024 },
  roleOverrides: {
    "VIP_ROLE_ID": { flood: { maxMessages: 10 } },
  },
  punishment: {
    addRoleIds: ["MUTE_ROLE_ID"],
    minStrikesForRoles: 2,
  },
  onCooldown(message) {
    console.log("quiet delete", message.id);
  },
});

antispam.setRoleConfig("VIP_ROLE_ID", { emojis: { maxEmojis: 40 } });
antispam.pause();  // raid over? antispam.resume();
```

Ghost pings need the message in cache (or `Partials.Message`) so `messageDelete` still has mentions. Kick/ban stay **off**. Role add/remove is opt-in via empty arrays.

## What's new in 1.2.0

More knobs, per-channel rules, and bilingual user-facing text.

| Option | What it does |
| --- | --- |
| `locale` | `"en"` or `"es"` for warn + log labels. Empty `warnMessage` uses the locale template. |
| `ignorePermissions` | Skip members with those Discord permission names (`ManageMessages`, …). |
| `setChannelConfig(guildId, channelId, patch)` | Rules for one channel (on top of guild + global). |
| `channelOverrides` | Same thing in static config: `{ "CHANNEL_ID": { flood: { maxMessages: 10 } } }`. |
| `disabledDetectors` | Turn off detectors by name without touching each block. |
| `detectorOrder` | Custom detector run order. |
| `flood.sameChannelOnly` / `duplicates.sameChannelOnly` | Count only the current channel. |
| `links.maxLinks` / `links.scanEmbeds` | Cap URLs per message; toggle embed scanning. |
| `images.skipContentTypes` / `images.maxAttachments` | Ignore GIFs, limit images per message. |
| `mentions.maxRepeatsOfSame` | Same user pinged over and over in one message. |
| `accounts` | Flag brand-new accounts (`minAgeDays`) or default avatars. Off by default. |
| `length` | Flag walls of text. Off by default. |
| `punishment.timeout.scale` | `"none"` \| `"linear"` \| `"exponential"` with `maxDurationMs`. |
| `punishment.warnAsEmbed` | Warning as an embed. |

```js
const antispam = new AntiSpam(client, {
  preset: "balanced",
  locale: "es",
  ignorePermissions: ["ManageMessages", "ModerateMembers"],
  flood: { sameChannelOnly: true },
  links: { maxLinks: 3, scanEmbeds: true },
  accounts: { enabled: true, minAgeDays: 2 },
  punishment: {
    warnAsEmbed: true,
    timeout: { enabled: true, durationMs: 60_000, scale: "linear", maxDurationMs: 10 * 60_000 },
  },
  disabledDetectors: ["caps"],
  channelOverrides: {
    "MEMES_CHANNEL_ID": { images: { maxRepeats: 8 }, emojis: { maxEmojis: 30 } },
  },
});

antispam.setChannelConfig(guildId, channelId, { flood: { maxMessages: 12 } });
```

## What's new in 1.1.0

- **Punishment cooldown** — after a strike, Disguard waits `punishment.cooldownMs` (8s by default) before warning / timeout / kick / ban again. Extra spam in that window is deleted quietly. This stops the “4 timeouts in one flood” you saw in 1.0.0.
- **Per-guild config** — `setGuildConfig(guildId, patch)`, `getGuildConfig`, `clearGuildConfig`.
- **Custom detectors** — `antispam.use({ type, inspect })`.
- **Stats** — `getStats()` / `resetStats()`.
- **New detectors:** dangerous files (`.exe`, `.bat`, …), zalgo / stacked diacritics, newline walls.
- **Links in embeds** — phishing checks also read embed title, description, fields and footer.
- `isCoolingDown(guildId, userId)`.

```js
antispam.setGuildConfig("123456789", {
  flood: { maxMessages: 3 },
  links: { blockInvites: true },
});

antispam.use({
  type: "flood",
  inspect({ message, snapshot }) {
    if (message.content.includes("raid-now")) {
      return {
        type: "flood",
        severity: "critical",
        userId: message.author.id,
        guildId: message.guild.id,
        channelId: snapshot.channelId,
        messageId: snapshot.id,
        reason: "Custom raid keyword",
        details: {},
        recommendedActions: ["delete", "timeout"],
        timestamp: snapshot.timestamp,
      };
    }
    return null;
  },
});

console.log(antispam.getStats());
```

## Table of contents

- [What's new in 1.3.0](#whats-new-in-130)
- [What's new in 1.2.0](#whats-new-in-120)
- [What's new in 1.1.0](#whats-new-in-110)
- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Intents and permissions](#intents-and-permissions)
- [How it works](#how-it-works)
- [Presets](#presets)
- [Full configuration](#full-configuration)
- [Callbacks](#callbacks)
- [API](#api)
- [Recipes](#recipes)
- [Local testing](#local-testing)
- [What to send when testing](#what-to-send-when-testing)
- [FAQ](#faq)
- [Development](#development)
- [License](#license)

## Features

| Detector | What it catches |
| --- | --- |
| **flood** | Too many messages in a short sliding window |
| **duplicate** | Same (or very similar) text sent repeatedly |
| **link** | Shorteners, raw IPs, punycode, brand lookalikes (`dlscord`, `steamcommunnity`), phishing keyword + URL, custom blocklists |
| **image** | Repeated images, stickers, and embed media |
| **mention** | `@everyone`, `@here`, too many unique mentions |
| **caps** | Messages that are mostly uppercase |
| **emoji** | Too many emojis or stickers in one message |
| **file** | Dangerous attachments (`.exe`, `.bat`, `.dll`, `.msi`, …) |
| **zalgo** | Obfuscated / zalgo text (stacked combining marks) |
| **newline** | Message walls made of empty lines |
| **account** | Brand-new Discord accounts / default avatar / new guild members (off by default) |
| **length** | Over-long messages (off by default) |
| **word** | Custom blocked words and regex (off until you fill `list` / `regex`) |
| **hop** | Same user jumping across too many channels |
| **punctuation** | Long runs of the same character (`!!!!`, `aaaa`) |
| **spoiler** | Spoiler-tag walls |
| **ghost** | Deleted messages that mentioned users (off by default) |

Also included:

- Three presets: `lenient`, `balanced`, `strict`
- Ignore lists for users, roles, channels, categories, guilds, and command prefixes
- Per-guild, per-channel, and per-role overlays
- Strike system with decay
- Optional delete / warn / timeout / kick / ban / addRole / removeRole (kick and ban are **off** by default)
- `dryRun` to tune rules without punishing anyone
- Edit scanning (links, mentions, and words)
- Zero extra runtime dependencies (peer: `discord.js`)
- In-memory store only — no database required
- Full TypeScript types

## Requirements

- Node.js **18+**
- discord.js **^14**
- Privileged intents: **Message Content Intent** (and **Server Members Intent** if you use timeouts)

## Install

```bash
npm install @amatiscorp/disguard discord.js
```

## Quick start

### CommonJS

```js
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { AntiSpam } = require("@amatiscorp/disguard");

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
  ignored: {
    roles: ["STAFF_ROLE_ID"],
    channels: ["BOT_COMMANDS_CHANNEL_ID"],
  },
  punishment: {
    deleteMessage: true,
    warnUser: true,
    timeout: { enabled: true, durationMs: 60_000, minStrikes: 2 },
    logChannelId: "MOD_LOG_CHANNEL_ID",
  },
});

client.once("ready", () => {
  antispam.start();
  console.log(`Ready as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

process.on("SIGINT", () => {
  antispam.stop();
  client.destroy();
});
```

### TypeScript / ESM

```ts
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { AntiSpam } from "@amatiscorp/disguard";

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
  preset: "strict",
  dryRun: false,
  onDetect(incident, message) {
    console.log(incident.type, incident.reason, message.id);
  },
});

client.once("ready", () => antispam.start());
await client.login(process.env.DISCORD_TOKEN);
```

You can also use the factory:

```js
const { createAntiSpam } = require("@amatiscorp/disguard");
const antispam = createAntiSpam(client, { preset: "balanced" });
```

A full runnable example lives in [`examples/basic.js`](examples/basic.js). From this repo:

```bash
copy .env.example .env
# put your bot token in .env
npm run dev
```

## Intents and permissions

| Goal | Intent / permission |
| --- | --- |
| Read message text | `MessageContent` + `GuildMessages` |
| Timeouts | `GuildMembers` + **Moderate Members** |
| Delete messages | **Manage Messages** |
| Warn in the channel | **Send Messages** |
| Log embeds | **Embed Links** |
| Kick / ban (opt-in) | **Kick Members** / **Ban Members** |
| Mute / add / remove roles (opt-in) | **Manage Roles** |

The bot will not sanction the guild owner or anyone above it in the role hierarchy. Those actions are skipped and reported in `onAction`.

Enable **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers/applications) → your app → Bot → Privileged Gateway Intents.

## How it works

1. Ignores bots, webhooks, system messages, the owner, administrators, command prefixes, and anything in your ignore lists.
2. Keeps a short **in-memory** history per user and guild (no database).
3. Runs detectors in this order: files → words → flood → hop → duplicates → links → images → mentions → zalgo → newlines → punctuation → spoilers → accounts → length → caps → emojis. The first match wins.
4. Adds one strike (with optional decay) and applies the configured punishment.
5. Message edits re-check **links**, **mentions**, and **words**, so editing `hello` into a phishing URL or a blocked word is still caught without counting as flood.
6. Deletes can trigger **ghost** pings if `ghostPing.enabled` is true.

Call `antispam.stop()` on shutdown, hot reload, or plugin unload.

## Presets

Pass `preset` and then override only what you care about.

| Preset | When to use |
| --- | --- |
| `lenient` | Busy community. Higher limits, no automatic timeout, shorteners allowed. |
| `balanced` | Default. Reasonable coverage with few false positives. |
| `strict` | Small servers or raid-prone ones. Blocks invites, lower thresholds, faster timeouts. |

```js
new AntiSpam(client, {
  preset: "strict",
  flood: { maxMessages: 4 }, // overrides only this field
});
```

| Setting | `lenient` | `balanced` | `strict` |
| --- | --- | --- | --- |
| Flood | 8 / 4s | 5 / 4s | 3 / 4s |
| Duplicate repeats | 4 | 3 | 2 |
| Duplicate similarity | 0.95 | 0.90 | 0.85 |
| Image repeats | 4 | 3 | 2 |
| Mentions | 10 | 6 | 3 |
| Block invites | no | no | yes |
| Block shorteners | no | yes | yes |
| Channel hop | off | 5 / 8s | 3 / 6s |
| Ghost pings | off | off | on |
| Auto timeout | off | 60s from 2 strikes | 5 min from 1 strike |

## Full configuration

Every option is optional. Missing fields fall back to the preset (or `balanced` if you omit `preset`).

### Global

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch. |
| `dryRun` | `boolean` | `false` | Detect and fire callbacks **without** deleting or punishing. Use this to tune. |
| `ignoreBots` | `boolean` | `true` | Skip other bots. |
| `ignoreWebhooks` | `boolean` | `true` | Skip webhooks. |
| `ignoreOwner` | `boolean` | `true` | Skip the guild owner. |
| `ignoreAdministrators` | `boolean` | `true` | Skip members with Administrator. |
| `checkEdits` | `boolean` | `true` | Re-scan edits for links, mentions, and words. |
| `checkDeletes` | `boolean` | `true` | Listen for `messageDelete` (ghost pings). |
| `ignoreThreads` | `boolean` | `false` | Skip messages in threads. |
| `ignoreSystem` | `boolean` | `true` | Skip Discord system messages. |
| `cleanupIntervalMs` | `number` | `60000` | How often the memory store is pruned. |
| `locale` | `"en"` \| `"es"` | `"en"` | Language for warnings and log embeds. |
| `ignorePermissions` | `string[]` | `[]` | Permission names that bypass checks. |
| `disabledDetectors` | `DetectorType[]` | `[]` | Detectors to skip. |
| `detectorOrder` | `DetectorType[]` | `[]` | Custom order. Empty = default. |
| `channelOverrides` | `object` | `{}` | Per-channel patches keyed by channel id. |
| `roleOverrides` | `object` | `{}` | Per-role patches keyed by role id. |

### Ignore lists

```js
ignored: {
  users: ["123"],
  roles: ["456"],
  channels: ["789"],
  categories: ["101"],
  guilds: ["202"],
  prefixes: ["!", "/", "."],
}
```

IDs are snowflakes as strings. A staff role in `ignored.roles` bypasses every detector. `prefixes` skip command messages (`!help` is ignored if `"!"` is listed).

### Flood

```js
flood: {
  enabled: true,
  maxMessages: 5, // the 5th message inside the window triggers
  windowMs: 4000,
  severity: "medium",
}
```

Uses a sliding window, not a fixed clock. Five different messages in 4 seconds count as flood.

### Duplicates

Text is normalized first: lowercase, markdown stripped, URLs removed, whitespace collapsed.

`similarity` is `0–1`. `1` means exact match only. `0.9` also catches `hello!!!` vs `hello!`.

```js
duplicates: {
  enabled: true,
  maxRepeats: 3,
  windowMs: 12_000,
  similarity: 0.9,
  severity: "medium",
}
```

### Links and phishing

```js
links: {
  enabled: true,
  blockInvites: false,
  blockShorteners: true,
  blockIpLinks: true,
  blockPunycode: true,
  blockBrandLookalikes: true,
  detectPhishingKeywords: true,
  allowList: ["youtube.com", "github.com"],
  blockList: ["bad-domain.test"],
  suspiciousTlds: [],          // e.g. ["tk", "gq"]
  customPatterns: [],          // regex against the whole message
  extraPhishingKeywords: ["fake giveaway"],
  maxLinks: 0,
  scanEmbeds: true,
  blockOauth: true,
  severity: "high",
}
```

`allowList` wins over heuristics. Official Discord, YouTube, GitHub, Spotify, and a few others are already allowed.

Built-in checks (each can be turned off):

- URL shorteners (`bit.ly`, `t.co`, `tinyurl.com`, …)
- Literal IPs (`http://1.2.3.4`)
- Punycode / homographs (`xn--...`)
- Brand clones of Discord, Steam, GitHub, PayPal, Roblox, and others
- Scam phrases plus any link (`free nitro`, `steam gift`, `verifica tu cuenta`, …)
- Discord invite links if `blockInvites` is `true`
- Markdown-masked links: `[click](https://evil.test)`
- Login / OAuth-looking paths on non-allowlisted hosts if `blockOauth` is `true`

```js
// Block foreign server invites
links: { blockInvites: true }

// Allow one shortener you actually use
links: {
  blockShorteners: true,
  allowList: ["youtube.com", "youtu.be", "bit.ly"],
}

// Extra regex + extra scam words
links: {
  customPatterns: ["steamcommunity\\.ru"],
  extraPhishingKeywords: ["wallet drain", "airdrop now"],
}
```

### Images

```js
images: {
  enabled: true,
  maxRepeats: 3,
  windowMs: 20_000,
  hashMode: "meta",        // or "content"
  maxDownloadBytes: 2_097_152,
  includeStickers: true,
  includeEmbeds: true,
  crossUserThreshold: 0,   // e.g. 4 = same image from 4 different users
  severity: "medium",
}
```

- `meta` (recommended): hash of size + MIME type + filename. No download.
- `content`: downloads the file and SHA-256s it. Better when the same bytes are re-uploaded under another name. Slower and uses bandwidth.

`crossUserThreshold: 4` is useful against copypasta / raid image floods.

### Mentions, caps, emojis

```js
mentions: {
  enabled: true,
  maxMentions: 6,
  blockEveryone: true,
  blockHere: true,
  severity: "high",
}

caps: {
  enabled: true,
  minLength: 16,     // ignore short shouts
  maxPercent: 75,    // 0–100
  severity: "low",
}

emojis: {
  enabled: true,
  maxEmojis: 12,
  maxStickers: 3,
  severity: "low",
}
```

### Accounts and length

```js
accounts: {
  enabled: false,       // turn on to flag new users
  minAgeDays: 3,
  blockDefaultAvatar: false,
  minGuildAgeDays: 0,   // 0 = off; e.g. 1 = joined this guild today
  severity: "medium",
}

length: {
  enabled: false,
  maxCharacters: 1000,
  severity: "low",
}
```

### Files, zalgo, newlines

```js
files: {
  enabled: true,
  blockedExtensions: ["exe", "bat", "cmd", "com", "scr", "dll", "msi", "vbs", "ps1", "jar", "apk"],
  maxBytes: 0,           // 0 = unlimited
  severity: "critical",
}

zalgo: {
  enabled: true,
  maxCombining: 20,
  severity: "medium",
}

newlines: {
  enabled: true,
  maxNewlines: 15,
  severity: "low",
}
```

### Words, channel hop, punctuation, spoilers

```js
words: {
  enabled: false,          // stays off until you add a list or regex
  list: ["raid-now"],
  regex: ["n[i1]tro\\s+free"],
  ignoreCase: true,
  matchWholeWord: true,
  severity: "high",
}

hop: {
  enabled: true,
  maxChannels: 5,          // 5th unique channel in the window triggers
  windowMs: 8_000,
  severity: "high",
}

punctuation: {
  enabled: true,
  maxRepeated: 10,         // 11+ of the same character in a row
  severity: "low",
}

spoilers: {
  enabled: true,
  maxSpoilers: 8,
  severity: "low",
}
```

`lenient` turns hop and punctuation off. `strict` tightens hop to 3 channels / 6s.

### Ghost pings

Off in `balanced` / `lenient`. On in `strict`. Needs `checkDeletes: true` (default) and the deleted message in cache (`Partials.Message` in your Client).

```js
ghostPing: {
  enabled: false,
  minMentions: 1,
  maxAgeMs: 15_000,        // 0 = any age
  severity: "high",
}

checkDeletes: true
```

Disable with `ghostPing: { enabled: false }` or `disabledDetectors: ["ghost"]`.

### Punishment

Kick and ban stay **disabled** on purpose. Turn them on only if you really want that.

```js
punishment: {
  deleteMessage: true,
  warnUser: true,
  dmUser: false,
  warnMessage: "{user}, your message was blocked: {reason}. Strikes: {strikes}.",
  timeout: { enabled: true, durationMs: 60_000, minStrikes: 2 },
  kick: { enabled: false, minStrikes: 5 },
  ban: { enabled: false, minStrikes: 8 },
  escalate: true,
  logChannelId: "CHANNEL_ID_OR_NULL",
  strikeDecayMs: 15 * 60_000, // strikes expire after 15 minutes
  cooldownMs: 8_000,          // no second timeout/warn during this window
  deleteDuringCooldown: true, // still delete extra spam quietly
  warnAsEmbed: false,
  addRoleIds: [],             // e.g. ["MUTE_ROLE_ID"] — needs Manage Roles
  removeRoleIds: [],
  minStrikesForRoles: 1,
}

// timeout.scale: "none" | "linear" (base * strikes) | "exponential" (base * 2^n)
// timeout.maxDurationMs caps the result (Discord max = 28 days)

```

`warnMessage` placeholders: `{user}` `{reason}` `{type}` `{strikes}`.

With `escalate: true`, Disguard applies **one** hard action (timeout, or kick, or ban — whichever threshold you hit). Delete and warn can still run together. `addRole` / `removeRole` run if those ID lists are non-empty and strikes ≥ `minStrikesForRoles`.

If the bot lacks a permission, or the target is higher in the hierarchy, that action is skipped and listed in `result.skipped`.

## Callbacks

```js
new AntiSpam(client, {
  dryRun: true,
  onDetect(incident, message) {
    // Fired after a detector matches, before punishment.
  },
  onAction(result) {
    // applied / skipped / dryRun / error
  },
  onError(error, context) {
    console.error("[disguard]", context, error);
  },
  onCooldown(message) {
    // Extra spam during punishment.cooldownMs (already deleted if deleteDuringCooldown).
  },
});
```

### `Incident`

```ts
{
  type: "flood" | "duplicate" | "link" | "image" | "mention" | "caps" | "emoji"
    | "file" | "zalgo" | "newline" | "account" | "length"
    | "word" | "hop" | "punctuation" | "spoiler" | "ghost",
  severity: "low" | "medium" | "high" | "critical",
  userId: string,
  guildId: string,
  channelId: string,
  messageId: string,
  reason: string,
  details: Record<string, unknown>,
  recommendedActions: Array<"delete" | "warn" | "timeout" | "kick" | "ban" | "addRole" | "removeRole">,
  timestamp: number,
}
```

### `ActionResult`

```ts
{
  incident: Incident,
  dryRun: boolean,
  applied: ActionType[],
  skipped: Array<{ action: ActionType; reason: string }>,
  error?: string,
}
```

## API

```ts
import { AntiSpam, createAntiSpam, resolveConfig, DEFAULT_CONFIG } from "@amatiscorp/disguard";

const antispam = new AntiSpam(client, options);
// same as createAntiSpam(client, options)

antispam.start();
antispam.stop();
antispam.pause();
antispam.resume();
antispam.isPaused();

const config = antispam.getConfig();
antispam.setConfig({ flood: { maxMessages: 8 } }); // deep merge, other keys stay

antispam.getStrikes(guildId, userId);
antispam.resetUser(guildId, userId);
antispam.isCoolingDown(guildId, userId);

antispam.setGuildConfig(guildId, { flood: { maxMessages: 3 } });
antispam.getGuildConfig(guildId);
antispam.clearGuildConfig(guildId);
antispam.setChannelConfig(guildId, channelId, { images: { maxRepeats: 8 } });
antispam.getChannelConfig(guildId, channelId);
antispam.clearChannelConfig(guildId, channelId);
antispam.setRoleConfig(roleId, { flood: { maxMessages: 12 } });
antispam.clearRoleConfig(roleId);

antispam.use(customDetector);
antispam.getStats();
antispam.resetStats();

// Analyze only — no punishment, no callbacks
const incident = await antispam.analyze(message);
const edited = await antispam.analyze(message, { isEdit: true });

antispam.shouldIgnore(message); // boolean
```

Helpers you can import for your own tools:

```ts
import {
  extractUrls,
  normalizeText,
  similarity,
  DEFAULT_PHISHING_KEYWORDS,
  DEFAULT_SHORTENERS,
  OFFICIAL_BRANDS,
  resolveConfig,
  DEFAULT_CONFIG,
} from "@amatiscorp/disguard";

const urls = extractUrls("see [x](https://evil.test) and discord.gg/abc");
const near = similarity("hello world", "hello world!");
const config = resolveConfig("strict", { flood: { maxMessages: 2 } });
```

## Recipes

**Detect only — you handle sanctions**

```js
const antispam = new AntiSpam(client, {
  punishment: {
    deleteMessage: false,
    warnUser: false,
    timeout: { enabled: false, durationMs: 0, minStrikes: 99 },
  },
  onDetect(incident, message) {
    // tickets, database, your own Automod pipeline...
  },
});
```

**Tune without touching anyone**

```js
new AntiSpam(client, {
  dryRun: true,
  onAction(result) {
    console.log(result.incident.type, result.applied);
  },
});
```

**Per-guild rules at runtime**

```js
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "antispam-strict") {
    antispam.setConfig({ preset: undefined, flood: { maxMessages: 3 } });
    await interaction.reply("Flood limit set to 3.");
  }
});
```

`setConfig` deep-merges. It does not re-apply a preset unless you build one with `resolveConfig` yourself:

```js
const { resolveConfig } = require("@amatiscorp/disguard");
antispam.setConfig(resolveConfig("strict", { ignored: antispam.getConfig().ignored }));
```

**Real image hashing**

```js
images: { hashMode: "content", maxDownloadBytes: 1_000_000 }
```

**Mute role instead of timeout**

```js
punishment: {
  timeout: { enabled: false, durationMs: 60_000, minStrikes: 99 },
  addRoleIds: ["MUTE_ROLE_ID"],
  minStrikesForRoles: 1,
}
```

The bot role must sit **above** the mute role. Needs **Manage Roles**.

**Reset a user after a false positive**

```js
antispam.resetUser(guildId, userId);
```

## Local testing

This repository includes a demo bot.

1. Create an application in the [Developer Portal](https://discord.com/developers/applications).
2. Enable **Message Content Intent** and **Server Members Intent**.
3. Invite the bot with Manage Messages + Moderate Members + Send Messages.
4. Copy the env template and put the **bot** token (not a user token):

```powershell
copy .env.example .env
```

```
DISCORD_TOKEN=your_bot_token_here
```

5. Run:

```powershell
npm run dev
```

Node does not load `.env` by itself. The example reads it via `examples/load-env.js`.

Test with an account that is **not** the server owner and **not** an Administrator, or Disguard will ignore you.

## What to send when testing

Wait a few seconds between categories so flood does not eat the next test.

| Test | What to send |
| --- | --- |
| Flood | 5 messages in under 4 seconds |
| Duplicate | The same line 3 times, or `hello` then `hello!!!` |
| Shortener | `https://bit.ly/abc123` |
| Raw IP | `http://1.2.3.4/login` |
| Brand clone | `https://dlscord.com/nitro` or `https://steamcommunnity.com/gift` |
| Phishing combo | `Free Nitro https://totally-legit.gift/claim` |
| Custom blocklist | `https://malicioso.ejemplo/x` (demo `blockList`) |
| Allowed | `https://youtube.com` and `https://github.com` should pass |
| Images | Same photo or sticker 3 times |
| Mentions | `@everyone`, `@here`, or 7 different users |
| Caps | `THIS IS A MESSAGE IN ALL CAPS` (16+ letters) |
| Emojis | 13+ emojis, or 4 stickers |
| File | Upload a dummy `.exe` or `.bat` |
| Zalgo | Text with many stacked combining marks |
| Newlines | A message with more than 15 line breaks |
| Channel hop | Same user posts in 5 different channels within 8 seconds |
| Punctuation | `aaaaaaaaaaa` or `!!!!!!!!!!!` |
| Spoilers | More than 8 `\|\|spoiler\|\|` pairs |
| Blocked word | Enable `words` first, then send a listed word |
| Ghost ping | Mention someone and delete the message within 15s (`ghostPing.enabled: true`) |
| Edit | Send `hello`, then edit it to `Free Nitro https://bit.ly/test` |

Watch the terminal: `[detect] flood|duplicate|link|image|mention|caps|emoji|file|zalgo|newline|word|hop|punctuation|spoiler|ghost`.

The second strike applies a 1 minute timeout with the default example config. Strikes decay after 15 minutes, or call `resetUser`.

## FAQ

**Why does nothing happen when I spam?**  
You are probably the guild owner or an Administrator. Those are ignored by default. Use a second account, or set `ignoreOwner: false` / `ignoreAdministrators: false` while testing.

**`TokenInvalid` on `npm run dev`?**  
The token never reached Node, or it is a user token / revoked bot token. The example now loads `.env` automatically. Do not wrap the token in quotes. Do not prefix it with `Bot `.

**Can I use this without deleting messages?**  
Yes. Set `punishment.deleteMessage: false` and handle `onDetect` yourself.

**Does it work in DMs?**  
No. Guild messages only.

**Is there a database?**  
No. History lives in memory and is dropped on restart.

**Will it ban people by default?**  
No. Ban and kick are opt-in.

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

## License

MIT

---

# Español

## Novedades de 1.3.0

Más detectores, overlays por rol, mute por rol y más ignores. Todo es opcional.

| Opción | Default | Qué hace |
| --- | --- | --- |
| `words` | **apagado**, lista vacía | Palabras y/o regex bloqueados. `ignoreCase` y `matchWholeWord` en `true`. |
| `hop` | **on**, 5 canales / 8s | El mismo usuario escribe en demasiados canales (raid / hop). |
| `punctuation` | **on**, 10 | Rachas de `aaaaaa` / `!!!!!!` más largas que `maxRepeated`. |
| `spoilers` | **on**, 8 pares | Demasiados `\|\|spoiler\|\|` en un mensaje. |
| `ghostPing` | **off** (`strict`: on) | Castiga borrar un mensaje que mencionaba gente. |
| `checkDeletes` | `true` | Escucha `messageDelete`. |
| `ignored.prefixes` | `[]` | Ignora mensajes que empiezan por `!`, `/`, `.`. |
| `ignoreThreads` | `false` | Ignora hilos. |
| `ignoreSystem` | `true` | Ignora mensajes de sistema. |
| `roleOverrides` / `setRoleConfig` | `{}` | Config por rol (antes de la de canal). |
| `links.blockOauth` | `true` | URLs de login/OAuth fuera de la allowList. `discord.com` sigue permitido. |
| `files.maxBytes` | `0` | Tamaño máximo de adjunto. `0` = sin límite. |
| `accounts.minGuildAgeDays` | `0` | Miembros demasiado nuevos en **este** servidor. `0` = off. |
| `punishment.addRoleIds` / `removeRoleIds` | `[]` | Añadir/quitar roles al castigar (mute). Hace falta **Manage Roles**. |
| `onCooldown` | — | Callback cuando el cooldown borra spam extra en silencio. |
| `pause()` / `resume()` | — | Congela el antispam sin quitar listeners. |

```js
const antispam = new AntiSpam(client, {
  locale: "es",
  ignored: { prefixes: ["!", "/", "."], roles: ["ID_STAFF"] },
  words: { enabled: true, list: ["raid-now"] },
  hop: { maxChannels: 4, windowMs: 6_000 },
  ghostPing: { enabled: true, maxAgeMs: 15_000 },
  punishment: { addRoleIds: ["ID_MUTE"], minStrikesForRoles: 2 },
});

antispam.setRoleConfig("ID_VIP", { flood: { maxMessages: 10 } });
antispam.pause();
```

Kick y ban siguen **apagados**. Ghost ping necesita el mensaje en caché (`Partials.Message`).

## Novedades de 1.2.0

Más opciones, reglas por canal y textos al usuario en inglés o español.

| Opción | Qué hace |
| --- | --- |
| `locale` | `"en"` o `"es"` para avisos y logs. Si `warnMessage` está vacío, usa la plantilla del idioma. |
| `ignorePermissions` | Ignora quien tenga esos permisos (`ManageMessages`, …). |
| `setChannelConfig` | Config de un canal (encima de guild + global). |
| `channelOverrides` | Lo mismo en la config estática. |
| `disabledDetectors` | Apaga detectores por nombre. |
| `detectorOrder` | Orden de ejecución. |
| `flood.sameChannelOnly` / `duplicates.sameChannelOnly` | Solo cuenta el canal actual. |
| `links.maxLinks` / `links.scanEmbeds` | Tope de URLs; escanear embeds. |
| `images.skipContentTypes` / `images.maxAttachments` | Ignorar gifs, limitar adjuntos. |
| `mentions.maxRepeatsOfSame` | El mismo ping repetido. |
| `accounts` | Cuentas nuevas (`minAgeDays`) o avatar por defecto. Apagado por defecto. |
| `length` | Mensajes kilométricos. Apagado por defecto. |
| `punishment.timeout.scale` | `"none"` \| `"linear"` \| `"exponential"`. |
| `punishment.warnAsEmbed` | Aviso en embed. |

```js
new AntiSpam(client, {
  locale: "es",
  ignorePermissions: ["ManageMessages"],
  flood: { sameChannelOnly: true },
  links: { maxLinks: 3 },
  accounts: { enabled: true, minAgeDays: 2 },
  punishment: {
    warnAsEmbed: true,
    timeout: { durationMs: 60_000, scale: "linear", maxDurationMs: 600_000 },
  },
  channelOverrides: {
    "ID_CANAL_MEMES": { emojis: { maxEmojis: 30 } },
  },
});
```

## Novedades de 1.1.0

- **Cooldown de castigo** — tras un strike espera `punishment.cooldownMs` (8s por defecto) antes de volver a avisar o timeout. El spam extra de esa ventana se borra en silencio. Así no salen 4 timeouts en el mismo flood.
- **Config por servidor** — `setGuildConfig`, `getGuildConfig`, `clearGuildConfig`.
- **Detectores propios** — `antispam.use({ type, inspect })`.
- **Estadísticas** — `getStats()` / `resetStats()`.
- **Nuevos detectores:** archivos peligrosos, zalgo, paredes de saltos de línea.
- **Enlaces en embeds** — también se revisan título, descripción, fields y footer.
- `isCoolingDown(guildId, userId)`.

## Tabla de contenidos

- [Novedades de 1.3.0](#novedades-de-130)
- [Novedades de 1.2.0](#novedades-de-120)
- [Novedades de 1.1.0](#novedades-de-110)
- [Qué es](#qué-es)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Inicio rápido](#inicio-rápido)
- [Intents y permisos](#intents-y-permisos)
- [Cómo funciona](#cómo-funciona)
- [Presets](#presets-1)
- [Configuración completa](#configuración-completa)
- [Callbacks](#callbacks-1)
- [API](#api-1)
- [Recetas](#recetas)
- [Probar en local](#probar-en-local)
- [Qué enviar para testear](#qué-enviar-para-testear)
- [Preguntas frecuentes](#preguntas-frecuentes)
- [Desarrollo](#desarrollo-1)
- [Licencia](#licencia)

## Qué es

**Disguard** es una librería antispam para bots de discord.js v14. No es un bot: la enchufas a tu `Client` y tú decides umbrales, listas y castigos.

Detecta flood, salto de canales, palabras bloqueadas, phishing / enlaces no deseados (también en embeds), imágenes repetidas, spam de menciones, ghost pings, mayúsculas, emojis, archivos peligrosos, zalgo y paredes de líneas.

## Requisitos

- Node.js **18+**
- discord.js **^14**
- Intent de **contenido de mensaje** (y **miembros del servidor** si usas timeouts)

## Instalación

```bash
npm install @amatiscorp/disguard discord.js
```

## Inicio rápido

### CommonJS

```js
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { AntiSpam } = require("@amatiscorp/disguard");

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
  ignored: {
    roles: ["ID_ROL_STAFF"],
    channels: ["ID_CANAL_BOTS"],
  },
  punishment: {
    deleteMessage: true,
    warnUser: true,
    timeout: { enabled: true, durationMs: 60_000, minStrikes: 2 },
    logChannelId: "ID_CANAL_LOGS",
  },
});

client.once("ready", () => {
  antispam.start();
  console.log(`Listo como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
```

### TypeScript

```ts
import { AntiSpam } from "@amatiscorp/disguard";

const antispam = new AntiSpam(client, {
  preset: "strict",
  onDetect(incident) {
    console.log(incident.type, incident.reason);
  },
});

antispam.start();
```

Ejemplo completo en [`examples/basic.js`](examples/basic.js):

```powershell
copy .env.example .env
npm run dev
```

## Intents y permisos

| Qué quieres | Intent / permiso |
| --- | --- |
| Leer el texto | `MessageContent` + `GuildMessages` |
| Timeouts | `GuildMembers` + **Moderate Members** |
| Borrar mensajes | **Manage Messages** |
| Avisar en el canal | **Send Messages** |
| Embed de logs | **Embed Links** |
| Kick / ban (opt-in) | **Kick Members** / **Ban Members** |
| Mute / add / remove roles (opt-in) | **Manage Roles** |

No puede sancionar al dueño del servidor ni a quien esté por encima del bot en la jerarquía.

Activa **Message Content Intent** en el [Portal de Discord](https://discord.com/developers/applications) → tu app → Bot.

## Cómo funciona

1. Ignora bots, webhooks, mensajes de sistema, el dueño, administradores, prefijos de comando y tus listas de ignore.
2. Guarda en **memoria** un historial corto por usuario y servidor. Sin base de datos.
3. Pasa el mensaje por: archivos → palabras → flood → hop → duplicados → enlaces → imágenes → menciones → zalgo → líneas → puntuación → spoilers → cuentas → longitud → caps → emojis. El primero que dispare gana.
4. Suma un strike (con caducidad) y aplica el castigo configurado.
5. Las ediciones revisan **enlaces**, **menciones** y **palabras**.
6. Los borrados pueden disparar **ghost** ping si `ghostPing.enabled` es true.

Llama `antispam.stop()` al apagar el proceso.

## Presets

| Preset | Uso |
| --- | --- |
| `lenient` | Comunidad activa. Más holgura, sin timeout automático. |
| `balanced` | Por defecto. Equilibrio entre cobertura y falsos positivos. |
| `strict` | Servidores pequeños o con raids. Bloquea invitaciones y aprieta umbrales. |

```js
new AntiSpam(client, {
  preset: "strict",
  flood: { maxMessages: 4 }, // solo pisa esto
});
```

## Configuración completa

Todo es opcional. Lo que no pongas usa el preset.

### Global

| Opción | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Interruptor maestro. |
| `dryRun` | `boolean` | `false` | Detecta y dispara callbacks **sin** borrar ni sancionar. |
| `ignoreBots` | `boolean` | `true` | Ignora otros bots. |
| `ignoreWebhooks` | `boolean` | `true` | Ignora webhooks. |
| `ignoreOwner` | `boolean` | `true` | Ignora al dueño. |
| `ignoreAdministrators` | `boolean` | `true` | Ignora quien tenga Administrator. |
| `checkEdits` | `boolean` | `true` | Revisa ediciones (enlaces, menciones y palabras). |
| `checkDeletes` | `boolean` | `true` | Escucha `messageDelete` (ghost pings). |
| `ignoreThreads` | `boolean` | `false` | Ignora hilos. |
| `ignoreSystem` | `boolean` | `true` | Ignora mensajes de sistema. |
| `cleanupIntervalMs` | `number` | `60000` | Limpieza de memoria. |
| `roleOverrides` | `object` | `{}` | Parches por rol. |

### Listas de ignore

```js
ignored: {
  users: ["id"],
  roles: ["id"],
  channels: ["id"],
  categories: ["id"],
  guilds: ["id"],
  prefixes: ["!", "/", "."],
}
```

### Flood

```js
flood: {
  enabled: true,
  maxMessages: 5, // el 5º mensaje dentro de la ventana dispara
  windowMs: 4000,
  severity: "medium",
}
```

### Duplicados

El texto se normaliza (minúsculas, sin markdown, sin URLs). `similarity` de `0.9` caza `hola!!!` ≈ `hola!`. `1` exige igualdad exacta.

```js
duplicates: {
  enabled: true,
  maxRepeats: 3,
  windowMs: 12_000,
  similarity: 0.9,
  severity: "medium",
}
```

### Enlaces y phishing

```js
links: {
  enabled: true,
  blockInvites: false,
  blockShorteners: true,
  blockIpLinks: true,
  blockPunycode: true,
  blockBrandLookalikes: true,
  detectPhishingKeywords: true,
  allowList: ["youtube.com", "github.com"],
  blockList: ["dominio-malo.test"],
  suspiciousTlds: [],
  customPatterns: ["steamcommunity\\.ru"],
  extraPhishingKeywords: ["sorteo falso"],
  maxLinks: 0,
  scanEmbeds: true,
  blockOauth: true,
  severity: "high",
}
```

La `allowList` gana a las heurísticas. `discord.com` y `youtube.com` ya vienen permitidos.

Heurísticas incluidas (todas se pueden apagar): acortadores, IPs, punycode, clones de marcas, palabras de estafa + enlace, invitaciones si `blockInvites` es `true`, enlaces enmascarados `[texto](url)`, y rutas de login/OAuth si `blockOauth` es `true`.

### Imágenes

```js
images: {
  enabled: true,
  maxRepeats: 3,
  windowMs: 20_000,
  hashMode: "meta",          // o "content"
  maxDownloadBytes: 2_097_152,
  includeStickers: true,
  includeEmbeds: true,
  crossUserThreshold: 0,     // p.ej. 4 = misma imagen por 4 usuarios
  severity: "medium",
}
```

- `meta` (recomendado): tamaño + tipo + nombre. No descarga nada.
- `content`: descarga el archivo y hace SHA-256. Más preciso y más lento.

### Menciones, mayúsculas, emojis

```js
mentions: { enabled: true, maxMentions: 6, blockEveryone: true, blockHere: true, severity: "high" },
caps: { enabled: true, minLength: 16, maxPercent: 75, severity: "low" },
emojis: { enabled: true, maxEmojis: 12, maxStickers: 3, severity: "low" },
```

### Archivos, zalgo, saltos de línea

```js
files: { enabled: true, blockedExtensions: ["exe", "bat", "cmd", "dll", "msi"], maxBytes: 0, severity: "critical" },
zalgo: { enabled: true, maxCombining: 20, severity: "medium" },
newlines: { enabled: true, maxNewlines: 15, severity: "low" },
```

### Palabras, hop, puntuación, spoilers, ghost ping

```js
words: { enabled: false, list: ["raid-now"], regex: [], ignoreCase: true, matchWholeWord: true, severity: "high" },
hop: { enabled: true, maxChannels: 5, windowMs: 8_000, severity: "high" },
punctuation: { enabled: true, maxRepeated: 10, severity: "low" },
spoilers: { enabled: true, maxSpoilers: 8, severity: "low" },
ghostPing: { enabled: false, minMentions: 1, maxAgeMs: 15_000, severity: "high" },
```

`lenient` apaga hop y puntuación. `strict` enciende ghost ping y aprieta hop a 3 canales / 6s.

### Castigos

Kick y ban van **apagados**. Actívalos solo si lo tienes claro.

```js
punishment: {
  deleteMessage: true,
  warnUser: true,
  dmUser: false,
  warnMessage: "{user}, tu mensaje se ha bloqueado: {reason}. Strikes: {strikes}.",
  timeout: { enabled: true, durationMs: 60_000, minStrikes: 2 },
  kick: { enabled: false, minStrikes: 5 },
  ban: { enabled: false, minStrikes: 8 },
  escalate: true,
  logChannelId: "ID_O_NULL",
  strikeDecayMs: 15 * 60_000,
  cooldownMs: 8_000,
  deleteDuringCooldown: true,
  addRoleIds: [],
  removeRoleIds: [],
  minStrikesForRoles: 1,
}
```

Placeholders: `{user}` `{reason}` `{type}` `{strikes}`.

Con `escalate: true` se aplica **un** castigo fuerte (timeout, kick o ban). Aviso y borrado se pueden sumar. `addRole` / `removeRole` corren si las listas no están vacías.

## Callbacks

```js
new AntiSpam(client, {
  dryRun: true,
  onDetect(incident, message) {},
  onAction(result) {},
  onError(error, context) {
    console.error(context, error);
  },
  onCooldown(message) {},
});
```

`Incident` y `ActionResult` tienen la misma forma que en la sección en inglés.

## API

```ts
const antispam = new AntiSpam(client, options);

antispam.start();
antispam.stop();
antispam.pause();
antispam.resume();
antispam.getConfig();
antispam.setConfig({ flood: { maxMessages: 8 } });
antispam.getStrikes(guildId, userId);
antispam.resetUser(guildId, userId);
antispam.setGuildConfig(guildId, { flood: { maxMessages: 3 } });
antispam.setChannelConfig(guildId, channelId, { flood: { maxMessages: 12 } });
antispam.setRoleConfig(roleId, { emojis: { maxEmojis: 40 } });
antispam.getStats();

const incident = await antispam.analyze(message);
const editado = await antispam.analyze(message, { isEdit: true });
```

También: `createAntiSpam`, `resolveConfig`, `DEFAULT_CONFIG`, `extractUrls`, `normalizeText`, `similarity`.

## Recetas

**Solo detectar**

```js
new AntiSpam(client, {
  punishment: {
    deleteMessage: false,
    warnUser: false,
    timeout: { enabled: false, durationMs: 0, minStrikes: 99 },
  },
  onDetect(incident, message) {
    // tu lógica
  },
});
```

**Probar sin tocar a nadie:** `dryRun: true`.

**Hash real de imágenes:** `images: { hashMode: "content" }`.

**Quitar strikes:** `antispam.resetUser(guildId, userId)`.

**Mute por rol:** `punishment: { addRoleIds: ["ID_MUTE"], timeout: { enabled: false, durationMs: 0, minStrikes: 99 } }`. El rol del bot debe estar por encima del mute.

**Cambiar a strict en caliente**

```js
const { resolveConfig } = require("@amatiscorp/disguard");
antispam.setConfig(resolveConfig("strict", { ignored: antispam.getConfig().ignored }));
```

## Probar en local

1. Crea el bot en el portal y activa Message Content + Server Members.
2. Invítalo con Manage Messages, Moderate Members y Send Messages.
3. Copia `.env.example` a `.env` y pon el token del **bot**.
4. `npm run dev`.

Node no carga el `.env` solo; el ejemplo sí lo lee. Prueba con una cuenta que **no** sea owner ni admin.

## Qué enviar para testear

Espera unos segundos entre categorías.

| Test | Qué mandar |
| --- | --- |
| Flood | 5 mensajes en menos de 4 segundos |
| Duplicado | La misma línea 3 veces, o `hola` y `hola!!!` |
| Acortador | `https://bit.ly/abc123` |
| IP | `http://1.2.3.4/login` |
| Clon | `https://dlscord.com/nitro` |
| Phishing | `Free Nitro https://totally-legit.gift/claim` |
| Blocklist | `https://malicioso.ejemplo/x` |
| Permitidos | `https://youtube.com` y `https://github.com` no deben saltar |
| Imágenes | La misma foto o sticker 3 veces |
| Menciones | `@everyone`, `@here`, o 7 usuarios |
| Caps | `ESTO ES UN MENSAJE TODO EN MAYUSCULAS` |
| Emojis | Más de 12 emojis, o 4 stickers |
| Archivo | Sube un `.exe` o `.bat` (aunque sea de mentira) |
| Zalgo | Texto con muchos diacríticos apilados |
| Líneas | Un mensaje con más de 15 enters |
| Hop | El mismo usuario en 5 canales distintos en 8s |
| Puntuación | `aaaaaaaaaaa` o `!!!!!!!!!!!` |
| Spoilers | Más de 8 pares `\|\|spoiler\|\|` |
| Palabra | Activa `words` y manda una de la lista |
| Ghost ping | Menciona a alguien y borra el mensaje en menos de 15s (`ghostPing.enabled: true`) |
| Edición | Manda `hola` y edítalo a `Free Nitro https://bit.ly/test` |

En la terminal: `[detect] flood|duplicate|link|image|mention|caps|emoji|file|zalgo|newline|word|hop|punctuation|spoiler|ghost`.

Al segundo strike el ejemplo mete timeout de 1 minuto. Los strikes caducan a los 15 minutos, o usa `resetUser`.

## Preguntas frecuentes

**No pasa nada cuando spameo.**  
Seguramente eres el dueño o tienes Administrator. Usa otra cuenta, o pon `ignoreOwner: false` / `ignoreAdministrators: false` mientras pruebas.

**`TokenInvalid`.**  
El `.env` no se estaba leyendo, o el token es de usuario / está revocado. El ejemplo ya carga el `.env`. Sin comillas y sin prefijo `Bot `.

**¿Funciona en DMs?**  
No. Solo servidores.

**¿Hay base de datos?**  
No. Todo vive en memoria y se pierde al reiniciar.

**¿Banea por defecto?**  
No. Kick y ban son opt-in.

## Desarrollo

```bash
npm install
npm test
npm run build
npm run dev
```

## Licencia

MIT
