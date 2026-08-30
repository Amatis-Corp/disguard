const fs = require("node:fs");
const path = require("node:path");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return false;

  let text = fs.readFileSync(filePath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "DISCORD_TOKEN") {
      value = value.replace(/^Bot\s+/i, "").trim();
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

function resolveEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "..", ".env"),
  ];
  return candidates.find((file) => fs.existsSync(file)) ?? candidates[0];
}

function requireDiscordToken() {
  const envPath = resolveEnvPath();
  const loaded = loadEnv(envPath);
  const token = process.env.DISCORD_TOKEN?.trim();

  if (token) return token;

  const hint = loaded
    ? `Encontré ${envPath} pero DISCORD_TOKEN está vacío o mal escrito.`
    : `No encontré un archivo .env en ${path.resolve(process.cwd(), ".env")}.`;

  throw new Error(
    `${hint}\nCopia .env.example a .env y pon el token del bot (sin comillas y sin "Bot ").`,
  );
}

module.exports = { loadEnv, requireDiscordToken };
