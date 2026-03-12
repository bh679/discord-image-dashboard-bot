# Data Schema — discord-image-dashboard-bot

This document describes how the bot stores image data so the dashboard can consume it correctly.

---

## Database

**File:** `data/discord-images.db` (SQLite, relative to the bot's working directory)

### Table: `images`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-incrementing row ID |
| `message_id` | TEXT | Discord message snowflake ID |
| `attachment_id` | TEXT UNIQUE | Discord attachment snowflake ID (used as the unique key) |
| `channel_id` | TEXT | Discord channel snowflake ID |
| `channel_name` | TEXT | Human-readable channel name at time of collection |
| `guild_id` | TEXT | Discord guild (server) snowflake ID |
| `author_id` | TEXT | Discord user snowflake ID |
| `author_username` | TEXT | Discord username at time of collection |
| `author_avatar` | TEXT | Avatar URL (64px, served by Discord CDN) |
| `url` | TEXT | Original Discord CDN URL (may expire after ~24h) |
| `local_path` | TEXT | Relative path from `data/` to the cached image file |
| `filename` | TEXT | Original filename from Discord |
| `content_type` | TEXT | MIME type (e.g. `image/png`, `image/jpeg`, `image/gif`) |
| `width` | INTEGER | Image width in pixels (if reported by Discord) |
| `height` | INTEGER | Image height in pixels (if reported by Discord) |
| `size` | INTEGER | File size in bytes |
| `posted_at` | INTEGER | Unix timestamp **in milliseconds** when the message was posted |
| `collected_at` | INTEGER | Unix timestamp **in milliseconds** when the bot stored the image |
| `message_content` | TEXT | The text content of the Discord message (context) |

---

## Local File Storage

Images are downloaded and stored locally at:

```
data/
  images/
    YYYY-MM/                        ← month bucket (e.g. 2026-03)
      <attachment_id>.<ext>         ← e.g. 1234567890.png
```

The `local_path` column contains the path **relative to the `data/` directory**:

```
images/2026-03/1234567890123456789.png
```

### Constructing the image URL for the dashboard

The bot serves static files under `/images/*`. Given a `local_path` value, the full URL is:

```
http://localhost:5001/images/<local_path>
```

**Example:**

```js
const API_BASE = 'http://localhost:5001';
const imageUrl = `${API_BASE}/images/${image.local_path}`;
```

---

## REST API

Base URL: `http://localhost:5001`

### `GET /health`

```json
{ "status": "ok", "timestamp": 1710000000000 }
```

---

### `GET /api/images`

Returns a paginated list of images, newest first.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `channel_id` | string | Filter by channel snowflake ID |
| `author_id` | string | Filter by author snowflake ID |
| `from` | number | Unix ms lower bound on `posted_at` |
| `to` | number | Unix ms upper bound on `posted_at` |
| `content_type` | string | Exact MIME type filter (e.g. `image/gif`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |

**Response:**

```json
{
  "success": true,
  "data": {
    "images": [ /* array of image rows */ ],
    "total": 342,
    "page": 1,
    "limit": 50
  },
  "error": null
}
```

---

### `GET /api/images/:id`

Returns a single image row by its database `id`.

```json
{
  "success": true,
  "data": { /* image row */ },
  "error": null
}
```

---

### `GET /api/channels`

Returns all channels that have images, with counts.

```json
{
  "success": true,
  "data": [
    { "channel_id": "...", "channel_name": "general", "image_count": 87 }
  ],
  "error": null
}
```

---

### `GET /api/authors`

Returns all authors that have posted images, with counts.

```json
{
  "success": true,
  "data": [
    { "author_id": "...", "author_username": "alice", "author_avatar": "https://...", "image_count": 23 }
  ],
  "error": null
}
```

---

### `GET /api/stats`

Returns aggregate statistics.

```json
{
  "success": true,
  "data": {
    "total_images": 342,
    "total_size_bytes": 104857600,
    "oldest_posted_at": 1709000000000,
    "newest_posted_at": 1710000000000
  },
  "error": null
}
```

---

### `GET /images/<local_path>`

Serves the cached image file directly (static file).

**Example:** `GET /images/images/2026-03/1234567890.png`

---

## Error Responses

All API errors follow this shape:

```json
{
  "success": false,
  "data": null,
  "error": "Human-readable error message"
}
```

HTTP status codes: `200` (success), `404` (not found), `500` (server error).

---

## Dashboard Integration Checklist

- [ ] Set `VITE_API_URL=http://localhost:5001` in the client `.env`
- [ ] Use `GET /api/images` for the main gallery feed
- [ ] Construct image `src` as `` `${VITE_API_URL}/images/${image.local_path}` ``
- [ ] Use `GET /api/channels` to populate channel filter dropdown
- [ ] Use `GET /api/authors` to populate author filter dropdown
- [ ] Use `GET /api/stats` for the summary header
- [ ] Pass `page` and `limit` for pagination
