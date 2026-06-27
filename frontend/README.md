# Frontend

This folder owns the Maecenas user experience.

The frontend is a standalone Next.js App Router app with React, TypeScript, and Tailwind.

## Own These Areas

```txt
components/
api.ts
app/**/page.tsx
app/layout.tsx
app/globals.css
tailwind.config.ts
package.json
```

## Avoid Unless Coordinated

```txt
backend/
```

## API Boundary

Use `frontend/api.ts` for backend calls. Do not hardcode backend URLs in components.

Default backend:

```txt
http://localhost:4000
```

Controlled by:

```txt
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

`ResearchPromptBox` owns the complete product flow: persistent
`maecenas_session_id`, quota loading, free research, 402 handling, injected EVM
wallet connection, mock payment intent/proof, and paid-search retry. Keep API
calls in `frontend/api.ts` while changing presentation.

Mock mode connects a real wallet address but does not submit an on-chain
transaction. It sends an explicitly mock proof to the backend.

The answer page shows structured model output first. Source scores, skipped
records and receipts remain available under the collapsed research details.

## UX Direction

- Chat-first landing page.
- Feels like an autonomous research agent, not a static dashboard.
- Black/marble/cream/stone visual system.
- No yellow/gold glow.
- Show structured agent state: planning, scouting, scoring, budget allocation, 402 payment, evidence unlocked, receipt saved.
- Keep receipts and budget trail highly visible.

## Run

Frontend only:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Checks:

```bash
npm run typecheck
npm run build
```
