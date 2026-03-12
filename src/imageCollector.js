const { ChannelType } = require('discord.js');
const { insertImage, attachmentExists } = require('./db');
const { localPathFor, downloadImage } = require('./downloader');

const IMAGE_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isImageAttachment(attachment) {
  if (!attachment.contentType) return false;
  return IMAGE_CONTENT_TYPES.has(attachment.contentType.split(';')[0].trim());
}

async function processAttachment(db, attachment, message) {
  if (attachmentExists(db, attachment.id)) return;

  const contentType = attachment.contentType ? attachment.contentType.split(';')[0].trim() : null;
  const postedAt = message.createdTimestamp;
  const localPath = localPathFor(attachment.id, contentType, postedAt);

  try {
    await downloadImage(attachment.url, localPath);
  } catch (err) {
    console.error(`[downloader] Failed to download ${attachment.url}: ${err.message}`);
    return;
  }

  insertImage(db, {
    message_id:      message.id,
    attachment_id:   attachment.id,
    channel_id:      message.channelId,
    channel_name:    message.channel.name || '',
    guild_id:        message.guildId,
    author_id:       message.author.id,
    author_username: message.author.username,
    author_avatar:   message.author.displayAvatarURL({ size: 64 }),
    url:             attachment.url,
    local_path:      localPath,
    filename:        attachment.name || '',
    content_type:    contentType,
    width:           attachment.width || null,
    height:          attachment.height || null,
    size:            attachment.size || null,
    posted_at:       postedAt,
    collected_at:    Date.now(),
    message_content: message.content || null,
  });
}

async function processMessage(db, message) {
  if (!message.guildId) return;

  const imageAttachments = message.attachments.filter(isImageAttachment);
  for (const attachment of imageAttachments.values()) {
    await processAttachment(db, attachment, message);
  }
}

async function backfillChannel(db, channel) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  let lastId = null;
  let totalProcessed = 0;

  console.log(`[backfill] Scanning #${channel.name} (${channel.id})`);

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    let reachedCutoff = false;
    for (const message of messages.values()) {
      if (message.createdTimestamp < cutoff) {
        reachedCutoff = true;
        break;
      }
      await processMessage(db, message);
      totalProcessed++;
    }

    lastId = messages.last().id;
    if (reachedCutoff || messages.size < 100) break;
  }

  console.log(`[backfill] #${channel.name}: processed ${totalProcessed} messages`);
}

async function runBackfill(db, guild) {
  const TEXT_TYPES = new Set([
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum,
  ]);

  const baseChannels = guild.channels.cache.filter(
    (c) => TEXT_TYPES.has(c.type) && c.viewable
  );

  // Collect all active threads from every text channel
  const threadChannels = [];
  for (const channel of baseChannels.values()) {
    try {
      const active = await channel.threads.fetchActive();
      for (const thread of active.threads.values()) {
        if (thread.viewable) threadChannels.push(thread);
      }
      const archived = await channel.threads.fetchArchived({ limit: 100 });
      for (const thread of archived.threads.values()) {
        if (thread.viewable) threadChannels.push(thread);
      }
    } catch (_) {
      // channel may not support threads
    }
  }

  const allChannels = [...baseChannels.values(), ...threadChannels];
  console.log(`[backfill] Starting backfill for ${allChannels.length} channels/threads in "${guild.name}"`);

  for (const channel of allChannels) {
    try {
      await backfillChannel(db, channel);
    } catch (err) {
      console.error(`[backfill] Error scanning #${channel.name}: ${err.message}`);
    }
  }

  console.log('[backfill] Complete.');
}

function attachRealtimeListener(db, client, guildId) {
  client.on('messageCreate', async (message) => {
    if (message.guildId !== guildId) return;
    await processMessage(db, message);
  });

  console.log('[realtime] Listening for new images...');
}

module.exports = { runBackfill, attachRealtimeListener };
