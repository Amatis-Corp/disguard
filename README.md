# Disguard

Configurable antispam for [discord.js](https://discord.js.org) v14 bots.

It is **not** a bot. You plug it into your existing `Client` and decide every threshold, allowlist, and punishment.

Detects flood, repeated text, phishing / unwanted links, duplicate images, mention spam, excessive caps, and emoji spam.

> **Español:** librería antispam configurable para bots de discord.js. No es un bot. La documentación en español está más abajo: [Español](#español).

---

**Languages**

- [English](#english)
- [Español](#español)

---

# English

## Table of contents

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

Also included:

- Three presets: `lenient`, `balanced`, `strict`
- Ignore lists for users, roles, channels, categories, and guilds
- Strike system with decay
- Optional delete / warn / timeout / kick / ban (kick and ban are **off** by default)
- `dryRun` to tune rules without punishing anyone
- Edit scanning (links and mentions)
- Zero extra runtime dependencies (peer: `discord.js`)
- In-memory store only — no database required
- Full TypeScript types

## Requirements

- Node.js **18+**
- discord.js **^14**
- Privileged intents: **Message Content Intent** (and **Server Members Intent** if you use timeouts)

## Install

```bash
npm install disguard discord.js
```

## Quick start

### CommonJS

```js
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { AntiSpam } = require("disguard");

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
import { AntiSpam } from "disguard";

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
const { createAntiSpam } = require("disguard");
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

The bot will not sanction the guild owner or anyone above it in the role hierarchy. Those actions are skipped and reported in `onAction`.

Enable **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers/applications) → your app → Bot → Privileged Gateway Intents.

## How it works

1. Ignores bots, webhooks, the owner, administrators, and anything in your ignore lists.
2. Keeps a short **in-memory** history per user and guild (no database).
3. Runs detectors in this order: flood → duplicates → links → images → mentions → caps → emojis. The first match wins.
4. Adds one strike (with optional decay) and applies the configured punishment.
5. Message edits only re-check **links** and **mentions**, so editing `hello` into a phishing URL is still caught without counting as flood.

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
| `checkEdits` | `boolean` | `true` | Re-scan edits for links and mentions. |
| `cleanupIntervalMs` | `number` | `60000` | How often the memory store is pruned. |

### Ignore lists

```js
ignored: {
  users: ["123"],
  roles: ["456"],
  channels: ["789"],
  categories: ["101"],
  guilds: ["202"],
}
```

IDs are snowflakes as strings. A staff role in `ignored.roles` bypasses every detector.

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
}
```

`warnMessage` placeholders: `{user}` `{reason}` `{type}` `{strikes}`.

With `escalate: true`, Disguard applies **one** hard action (timeout, or kick, or ban — whichever threshold you hit). Delete and warn can still run together.

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
});
```

### `Incident`

```ts
{
  type: "flood" | "duplicate" | "link" | "image" | "mention" | "caps" | "emoji",
  severity: "low" | "medium" | "high" | "critical",
  userId: string,
  guildId: string,
  channelId: string,
  messageId: string,
  reason: string,
  details: Record<string, unknown>,
  recommendedActions: Array<"delete" | "warn" | "timeout" | "kick" | "ban">,
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
import { AntiSpam, createAntiSpam, resolveConfig, DEFAULT_CONFIG } from "disguard";

const antispam = new AntiSpam(client, options);
// same as createAntiSpam(client, options)

antispam.start();
antispam.stop();

const config = antispam.getConfig();
antispam.setConfig({ flood: { maxMessages: 8 } }); // deep merge, other keys stay

antispam.getStrikes(guildId, userId);
antispam.resetUser(guildId, userId);

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
} from "disguard";

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
const { resolveConfig } = require("disguard");
antispam.setConfig(resolveConfig("strict", { ignored: antispam.getConfig().ignored }));
```

**Real image hashing**

```js
images: { hashMode: "content", maxDownloadBytes: 1_000_000 }
```

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
| Edit | Send `hello`, then edit it to `Free Nitro https://bit.ly/test` |

Watch the terminal: `[detect] flood|duplicate|link|image|mention|caps|emoji`.

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

## Tabla de contenidos

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

Detecta flood, texto repetido, phishing / enlaces no deseados, imágenes repetidas, spam de menciones, mayúsculas y emojis.

## Requisitos

- Node.js **18+**
- discord.js **^14**
- Intent de **contenido de mensaje** (y **miembros del servidor** si usas timeouts)

## Instalación

```bash
npm install disguard discord.js
```

## Inicio rápido

### CommonJS

```js
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { AntiSpam } = require("disguard");

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
import { AntiSpam } from "disguard";

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

No puede sancionar al dueño del servidor ni a quien esté por encima del bot en la jerarquía.

Activa **Message Content Intent** en el [Portal de Discord](https://discord.com/developers/applications) → tu app → Bot.

## Cómo funciona

1. Ignora bots, webhooks, el dueño, administradores y tus listas de ignore.
2. Guarda en **memoria** un historial corto por usuario y servidor. Sin base de datos.
3. Pasa el mensaje por: flood → duplicados → enlaces → imágenes → menciones → caps → emojis. El primero que dispare gana.
4. Suma un strike (con caducidad) y aplica el castigo configurado.
5. Las ediciones solo revisan **enlaces** y **menciones**.

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
| `checkEdits` | `boolean` | `true` | Revisa ediciones (enlaces y menciones). |
| `cleanupIntervalMs` | `number` | `60000` | Limpieza de memoria. |

### Listas de ignore

```js
ignored: {
  users: ["id"],
  roles: ["id"],
  channels: ["id"],
  categories: ["id"],
  guilds: ["id"],
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
  severity: "high",
}
```

La `allowList` gana a las heurísticas. `discord.com` y `youtube.com` ya vienen permitidos.

Heurísticas incluidas (todas se pueden apagar): acortadores, IPs, punycode, clones de marcas, palabras de estafa + enlace, invitaciones si `blockInvites` es `true`, y enlaces enmascarados `[texto](url)`.

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
}
```

Placeholders: `{user}` `{reason}` `{type}` `{strikes}`.

Con `escalate: true` se aplica **un** castigo fuerte (timeout, kick o ban). Aviso y borrado se pueden sumar.

## Callbacks

```js
new AntiSpam(client, {
  dryRun: true,
  onDetect(incident, message) {},
  onAction(result) {},
  onError(error, context) {
    console.error(context, error);
  },
});
```

`Incident` y `ActionResult` tienen la misma forma que en la sección en inglés.

## API

```ts
const antispam = new AntiSpam(client, options);

antispam.start();
antispam.stop();
antispam.getConfig();
antispam.setConfig({ flood: { maxMessages: 8 } });
antispam.getStrikes(guildId, userId);
antispam.resetUser(guildId, userId);

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

**Cambiar a strict en caliente**

```js
const { resolveConfig } = require("disguard");
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
| Edición | Manda `hola` y edítalo a `Free Nitro https://bit.ly/test` |

En la terminal: `[detect] flood|duplicate|link|image|mention|caps|emoji`.

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
