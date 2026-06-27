# Frontend

This folder owns the Mecenas user experience.

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

Persist a random `maecenas_session_id` in localStorage. Send it as `sessionId`
on every research request and use `getUsage`, `createSearchPaymentIntent`, and
`submitSearchPaymentProof` from `frontend/api.ts` when the free quota reaches
zero.

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
