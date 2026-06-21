# Christopher's Rabbit Hole

Personal productivity + daily news app.

## Features

**Productivity** (left sidebar)
- To-Do — task list with priority, due date, pomodoro count
- Board — Kanban drag & drop (same task DB)
- Calendar — monthly view + Google Calendar two-way sync
- Notes — Markdown editor + meeting recording → Gemini transcription
- Pomodoro — timer with mini-timer that persists across pages
- Break Game — Tetris

**News** (`/news`)
- 0050 theme: three-horizon outlook (Gemini) + live price (TWSE) + charts (Yahoo Finance / FinMind)
- Daily article digest per theme

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| Backend | FastAPI + SQLAlchemy, PostgreSQL 16 |
| AI | Gemini 2.5 Flash (transcription, outlook, ask panel) |
| Infra | Docker Compose (db + backend + web) |

## Run

```bash
cp .env.example .env   # fill in keys
docker compose up --build
```

Open [http://localhost:3008](http://localhost:3008).

### Required env vars

| Var | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Transcription, outlook generation, ask panel |

### Optional env vars

| Var | Purpose |
|-----|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar sync (optional if `google_token.json` is mounted) |
| `GOOGLE_TOKEN_FILE` | Path to OAuth token JSON inside the backend container (default: `/data/google_token.json`) |
| `HERMES_DIR` | Host path to `.hermes` for Docker mount (default: `~/.hermes`) |
| `GOOGLE_REDIRECT_URI` | Default: `http://localhost:3008/api/google/callback` |
| `TIMEZONE` | Default: `Asia/Taipei` |
| `GEMINI_MODEL` | Default: `gemini-2.5-flash` |

## Dev (no Docker)

```bash
# Frontend
npm install
npm run dev          # http://localhost:3008

# Backend (separate terminal)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` (or configure `src/lib/api.ts`) when running backend separately.

## Project structure

```
src/
  app/
    (productivity)/    # Sidebar layout + 6 feature pages
    news/              # Daily news digest
    api/               # Next.js route handlers (ask, quote)
  components/          # Shared UI
  context/             # PomodoroContext, RecorderContext
  tasks/               # useTasks hook + TaskModal (personal list → Todo, work list → Board)
  lib/                 # api client, types, data fetchers
backend/
  app/
    routers/           # tasks, events, notes, recordings, pomodoro, google
    main.py            # FastAPI app + DB init
    models.py / schemas.py
```
