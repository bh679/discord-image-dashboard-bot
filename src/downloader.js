const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './data';
const IMAGE_EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

function monthFolder(timestampMs) {
  const d = new Date(timestampMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function localPathFor(attachmentId, contentType, postedAt) {
  const ext = IMAGE_EXTENSIONS[contentType] || 'bin';
  const folder = monthFolder(postedAt);
  return path.join('images', folder, `${attachmentId}.${ext}`);
}

async function downloadImage(url, localPath) {
  const absolutePath = path.join(DATA_DIR, localPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(absolutePath, buffer);
  return absolutePath;
}

module.exports = { localPathFor, downloadImage };
