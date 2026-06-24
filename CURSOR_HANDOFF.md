# Handoff note for Cursor — Rabbit Hole chat homepage

Context: a ChatGPT-style chat homepage was added at `/`, talking to the separate
hermes-agent (`api_server` platform, pure chat, zero tools) via server-side Next.js
route handlers. Core work is **done and deployed in Docker**. This note lists what's
left. Do the tasks below, then stop — they will be reviewed afterward.

---

## ⛔ READ FIRST — environment rules (do not break these)

- **This app runs in Docker/OrbStack, NOT on the host.** The `web` container
  (`christophers-rabbit-hole-web-1`) owns port **3008**.
- **NEVER run a host `npm run dev` / `next dev`, and never bind anything to port 3008
  on the host.** A host server fighting the container's `0.0.0.0:3008` mapping can
  destabilize the whole OrbStack VM and restart every unrelated container (immich,
  hurc-km-bot-dev, etc.). This already happened once.
- The container runs a **production build with no volume mount → no hot reload.** To
  see code changes you must rebuild:
  ```
  docker compose build web && docker compose up -d web
  ```
  This recreates only the `web` container, nothing else.
- `/api/*` routes proxy to `http://backend:8000` (docker-network hostname). They only
  work **inside** the container, which is why you must test via the running container,
  not a host process.
- See `AGENTS.md` ("Dev environment") for the same rules.

---

## ✅ Already done (do not redo)

- Chat UI: `src/app/page.tsx`, `src/components/chat/chat-app.tsx`,
  `src/components/chat/chat-sidebar.tsx`, `src/lib/parse-sse.ts`, `src/lib/chat-types.ts`.
- Server client + routes: `src/lib/hermes-chat.ts`, `src/app/api/chat/{sessions,session,messages,stream}/route.ts`.
- Password gate: `src/proxy.ts`, `src/app/login/*`, `src/lib/site-auth.ts`.
- Bug fixed: `docker-compose.yml` `web.HERMES_API_BASE_URL` now hard-set to
  `http://host.docker.internal:8642` (host `.env` keeps `127.0.0.1` for any host tooling).
- API round-trip verified through the container (list → create → stream → delete).

---

## 📋 Tasks to do

### 1. Browser-verify the chat UI (against the running container)
Open `http://localhost:3008` in a browser (do NOT start a server — it's already running).
Log in with the password in `.env` (`SITE_PASSWORD`). Confirm each works:
- [ ] Send a message → assistant reply **streams in token-by-token**
- [ ] Create "新對話", switch between sessions, history reloads correctly
- [ ] Rename a session (✎) and delete one (✕)
- [ ] Mobile layout: hamburger opens the drawer (resize narrow / device toolbar)
- [ ] Sidebar links to `/todo` and `/news` work
- [ ] **Logout** button clears the cookie and redirects to `/login`

If something is broken, fix it, then `docker compose build web && docker compose up -d web`
and re-check.

### 2. Commit the work
The tree has many uncommitted changes. Commit in **two logical commits**:
- (a) The chat feature + the compose fix:
  `src/app/page.tsx`, `src/components/chat/*`, `src/lib/{hermes-chat,parse-sse,chat-types,site-auth}.ts`,
  `src/proxy.ts`, `src/app/login/*`, `src/app/api/chat/*`, `docker-compose.yml`, `AGENTS.md`,
  `CURSOR_HANDOFF.md`.
- (b) Leave the unrelated pre-existing changes (`README.md`, `PROGRESS.md`, news pages,
  `src/lib/news-gen.ts`, `src/lib/tavily.ts`, etc.) for a separate commit OR ask the user
  — do not bundle them blindly into the chat commit.
- Do **not** commit `.env` (it's gitignored; contains secrets).

### 3. (Optional) Faster dev loop
Add a dev compose profile/override with a source volume mount + `next dev` so code
changes hot-reload, instead of rebuilding each time. Keep it **off port 3008** or only
usable when the prod `web` container is stopped — never let two things bind 3008.

### 4. (Optional) Polish
- "Stop generating" button during streaming.
- Friendlier error state when hermes is unreachable (currently a generic message).
- Auto-generate session titles (today they fall back to the first message as preview).

---

## How to test the chat API from the shell (optional, no browser)
```bash
set -a; source .env; set +a
TOKEN=$(node -e "const c=require('crypto');process.stdout.write(c.createHmac('sha256',process.env.SITE_PASSWORD).update('authenticated').digest('hex'))")
curl -s -b "site_auth=$TOKEN" http://localhost:3008/api/chat/sessions
```
