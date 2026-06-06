# Christopher Daily

Personalized daily news discovery — a Perplexity Discover-style digest.

## Current state (MVP shell)

- **1 active theme:** 0050 (3 mock articles)
- **5 empty themes:** AI, Bitcoin, Semiconductor, Macro, Taiwan Market (layout preview)
- Article detail page with citation pills and ask panel (LLM not connected yet)

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Structure

```
src/
  app/                  # Next.js pages
  components/           # UI components
  data/editions.ts      # Mock edition data (themes + articles)
  lib/types.ts          # Shared types
```

## Next steps

1. Daily ingestion pipeline (RSS / NewsAPI)
2. LLM synthesis for real articles
3. RAG-powered ask panel per article
4. Activate empty themes one by one
