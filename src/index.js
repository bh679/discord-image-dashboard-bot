require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { openDatabase } = require('./db');
const { runBackfill, attachRealtimeListener } = require('./imageCollector');
const { startApiServer, setRescanHandler } = require('./api');

const REQUIRED_ENV = ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[startup] Copy .env.example to .env and fill in your values.');
    process.exit(1);
  }
}

async function main() {
  validateEnv();

  const db = openDatabase();
  console.log('[startup] Database ready.');

  startApiServer(db);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once('clientReady', async () => {
    console.log(`[discord] Logged in as ${client.user.tag}`);

    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      console.error(`[discord] Guild ${guildId} not found. Ensure the bot is added to the server.`);
      process.exit(1);
    }

    console.log(`[discord] Connected to server: "${guild.name}"`);

    setRescanHandler(() => runBackfill(db, guild));
    attachRealtimeListener(db, client, guildId);
    await runBackfill(db, guild);
  });

  client.on('error', (err) => {
    console.error('[discord] Client error:', err.message);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err.message);
  process.exit(1);
});
