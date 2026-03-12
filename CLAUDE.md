# discord-image-dashboard-bot — Developer Guide

<!-- Source: github.com/bh679/claude-templates/templates/repo/CLAUDE.md -->

This is the `discord-image-dashboard-bot` sub-repo for the Discord Image Dashboard project.

- **Tech stack:** Node.js, discord.js, SQLite/PostgreSQL
- **Local dev port:** `5001`
- **Project orchestrator:** github.com/bh679/discord-image-dashboard

---

## Purpose

A Discord bot that monitors all channels in a server and aggregates images posted over the last 7 days, storing them in a database for the dashboard to query.

---

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

---

## Versioning

<!-- Full policy: github.com/bh679/claude-templates/standards/versioning.md -->

Format: `V.MM.PPPP` in `package.json`.

- Bump `PPPP` on every commit
- Bump `MM` on every merged feature (reset PPPP to `0000`)
- Bump `V` only for breaking changes

---

## Branching & Git

<!-- Full policy: github.com/bh679/claude-templates/standards/git.md -->

- Feature branches: `dev/<feature-slug>`
- All development in **git worktrees** (never directly on `main`)
- Commit after every meaningful unit of work
- Push immediately after every commit

### Blocked commands

The following are blocked in `.claude/settings.json`:
- `git push --force`
- `git reset --hard`
- `rm -rf`

---

## Build & Test

```bash
npm run build    # production build
npm run test     # unit tests
```

For UI/integration testing, use the Playwright setup in the project orchestrator repo.

---

## Key Files

| File | Purpose |
|---|---|
| `src/index.js` | Bot entry point |
| `src/imageCollector.js` | Discord event listeners for image collection |
| `src/db.js` | Database connection and queries |
| `package.json` | Dependencies and version |
| `.env.example` | Required environment variables |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

Required variables:
- `DISCORD_BOT_TOKEN` — Bot token from Discord Developer Portal
- `DISCORD_GUILD_ID` — The server (guild) ID to monitor
- `DATABASE_URL` — Database connection string (SQLite path or PostgreSQL URL)
