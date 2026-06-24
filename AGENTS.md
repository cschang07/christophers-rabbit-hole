<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Dev environment: this app runs in Docker/OrbStack — do NOT start a host dev server

This project runs as a Docker Compose stack on this machine. The `web` container
(`christophers-rabbit-hole-web-1`) already binds port **3008**; `backend` (8000) and
`db` (5432) are internal to the compose network. **Many unrelated stacks share the same
OrbStack VM.**

- **Never** run a host `npm run dev` / `next dev` on port 3008, and never use a preview
  tool / `.claude/launch.json` that spawns a server on 3008. A host process bound to
  127.0.0.1:3008 fights the container's `0.0.0.0:3008` mapping; the contention can
  destabilize the OrbStack VM and restart every unrelated container at once.
- The app must run **as the container** anyway: `/api/*` routes proxy to
  `http://backend:8000`, a docker-network hostname that only resolves inside the compose
  network. A host dev server returns 500s on anything backend-backed (e.g. `/todo`).
- To test: hit the **already-running container** at `http://localhost:3008`. Pick up
  source edits via the container's hot reload, or rebuild the container. Run `docker ps`
  to confirm how the app is served before assuming anything.

## Optional fast dev loop (safe port)

If you need hot reload for frontend iteration, use the optional `web-dev` profile:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d web-dev
```

- `web-dev` is mapped to `http://localhost:3009` (never 3008), so it won't collide with
  the production `web` container on `3008`.
- Keep production verification on `http://localhost:3008`.
