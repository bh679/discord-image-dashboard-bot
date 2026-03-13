const express = require('express');
const path = require('path');
const cors = require('cors');
const { getImages, getImageById, getChannels, getAuthors, getStats } = require('./db');

const DATA_DIR = process.env.DATA_DIR || './data';

let _rescanHandler = null;

function setRescanHandler(fn) {
  _rescanHandler = fn;
}

function createApp(db) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Static file serving for cached images
  app.use('/images', express.static(path.join(DATA_DIR, 'images')));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/api/images', (req, res) => {
    try {
      const { channel_id, author_id, from, to, content_type, page, limit } = req.query;
      const result = getImages(db, { channel_id, author_id, from, to, content_type, page, limit });
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      console.error('[api] GET /api/images error:', err.message);
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  });

  app.get('/api/images/:id', (req, res) => {
    try {
      const image = getImageById(db, req.params.id);
      if (!image) {
        return res.status(404).json({ success: false, data: null, error: 'Not found' });
      }
      res.json({ success: true, data: image, error: null });
    } catch (err) {
      console.error('[api] GET /api/images/:id error:', err.message);
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  });

  app.get('/api/channels', (_req, res) => {
    try {
      const channels = getChannels(db);
      res.json({ success: true, data: channels, error: null });
    } catch (err) {
      console.error('[api] GET /api/channels error:', err.message);
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  });

  app.get('/api/authors', (_req, res) => {
    try {
      const authors = getAuthors(db);
      res.json({ success: true, data: authors, error: null });
    } catch (err) {
      console.error('[api] GET /api/authors error:', err.message);
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  });

  app.post('/api/bot/rescan', async (_req, res) => {
    if (!_rescanHandler) {
      return res.status(503).json({ success: false, error: 'Bot not ready for rescan' });
    }
    res.json({ success: true, message: 'Rescan started' });
    // Run in background — don't await on the response
    _rescanHandler().catch((err) => {
      console.error('[api] Rescan error:', err.message);
    });
  });

  app.get('/api/stats', (_req, res) => {
    try {
      const stats = getStats(db);
      res.json({ success: true, data: stats, error: null });
    } catch (err) {
      console.error('[api] GET /api/stats error:', err.message);
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  });

  return app;
}

function startApiServer(db) {
  const port = Number(process.env.PORT) || 5001;
  const app = createApp(db);
  app.listen(port, () => {
    console.log(`[api] Server running on http://localhost:${port}`);
  });
  return app;
}

module.exports = { createApp, startApiServer, setRescanHandler };
