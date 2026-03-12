// node:sqlite is built-in since Node 22.5 — no native compilation required
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || './data';

function openDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, 'discord-images.db');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id      TEXT NOT NULL,
      attachment_id   TEXT UNIQUE NOT NULL,
      channel_id      TEXT NOT NULL,
      channel_name    TEXT NOT NULL,
      guild_id        TEXT NOT NULL,
      author_id       TEXT NOT NULL,
      author_username TEXT NOT NULL,
      author_avatar   TEXT,
      url             TEXT NOT NULL,
      local_path      TEXT,
      filename        TEXT NOT NULL,
      content_type    TEXT,
      width           INTEGER,
      height          INTEGER,
      size            INTEGER,
      posted_at       INTEGER NOT NULL,
      collected_at    INTEGER NOT NULL,
      message_content TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_channel    ON images(channel_id);
    CREATE INDEX IF NOT EXISTS idx_author     ON images(author_id);
    CREATE INDEX IF NOT EXISTS idx_posted_at  ON images(posted_at);
  `);

  return db;
}

function insertImage(db, image) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO images (
      message_id, attachment_id, channel_id, channel_name, guild_id,
      author_id, author_username, author_avatar,
      url, local_path, filename, content_type,
      width, height, size,
      posted_at, collected_at, message_content
    ) VALUES (
      $message_id, $attachment_id, $channel_id, $channel_name, $guild_id,
      $author_id, $author_username, $author_avatar,
      $url, $local_path, $filename, $content_type,
      $width, $height, $size,
      $posted_at, $collected_at, $message_content
    )
  `);
  return stmt.run(image);
}

function getImages(db, { channel_id, author_id, from, to, content_type, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = {};

  if (channel_id)   { conditions.push('channel_id = $channel_id');     params.$channel_id = channel_id; }
  if (author_id)    { conditions.push('author_id = $author_id');       params.$author_id = author_id; }
  if (from)         { conditions.push('posted_at >= $from');           params.$from = Number(from); }
  if (to)           { conditions.push('posted_at <= $to');             params.$to = Number(to); }
  if (content_type) { conditions.push('content_type = $content_type'); params.$content_type = content_type; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const rows = db.prepare(`
    SELECT * FROM images ${where}
    ORDER BY posted_at DESC
    LIMIT $limit OFFSET $offset
  `).all({ ...params, $limit: Number(limit), $offset: offset });

  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM images ${where}
  `).get(params);

  return { images: rows, total, page: Number(page), limit: Number(limit) };
}

function getImageById(db, id) {
  return db.prepare('SELECT * FROM images WHERE id = $id').get({ $id: id });
}

function getChannels(db) {
  return db.prepare(`
    SELECT channel_id, channel_name, COUNT(*) as image_count
    FROM images
    GROUP BY channel_id
    ORDER BY image_count DESC
  `).all();
}

function getAuthors(db) {
  return db.prepare(`
    SELECT author_id, author_username, author_avatar, COUNT(*) as image_count
    FROM images
    GROUP BY author_id
    ORDER BY image_count DESC
  `).all();
}

function getStats(db) {
  return db.prepare(`
    SELECT
      COUNT(*) as total_images,
      COALESCE(SUM(size), 0) as total_size_bytes,
      MIN(posted_at) as oldest_posted_at,
      MAX(posted_at) as newest_posted_at
    FROM images
  `).get();
}

function attachmentExists(db, attachment_id) {
  const row = db.prepare('SELECT 1 FROM images WHERE attachment_id = $id').get({ $id: attachment_id });
  return !!row;
}

module.exports = { openDatabase, insertImage, getImages, getImageById, getChannels, getAuthors, getStats, attachmentExists };
