# Mecenas

**Scholarly agents that pay their sources.**

Mecenas is a research/payment agent demo. A user asks a research question, the agent searches registered sources, scores which evidence is worth buying, unlocks selected evidence through a 402/x402-shaped payment flow, writes a cited answer, and stores paid citation receipts for source owners.

The core product idea:

```txt
Most AI tools cite sources after using them.
Mecenas pays sources before using protected evidence.
```

## Current App

The project is now split into a **Next.js frontend** and a **standalone Node.js backend**.

```txt
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

The frontend talks to the backend through `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:4000`.

## What The Product Does

End-to-end demo flow:

```txt
1. Source owner registers a source.
2. Source gets a free preview endpoint and protected evidence endpoint.
3. User asks a research question.
4. Mecenas plans the research.
5. Mecenas searches registered sources.
6. Mecenas scores relevance, fit, novelty, and price efficiency.
7. Mecenas buys selected sources and skips weaker ones.
8. Protected evidence endpoint returns 402 Payment Required.
9. Agent sends a mock-labeled x402/USDC payment proof.
10. Evidence unlocks.
11. Answer is generated with citations, trace, budget, and receipts.
12. Dashboard and leaderboard update.
```

MVP payment mode is mock-labeled by default. Real Circle/Arc settlement is a future integration point.

## Folder Map

```txt
frontend/app/
  Next.js frontend routing layer.
  Keep pages/layouts here because Next.js App Router requires it.
  No backend API routes live here anymore.

frontend/
  Standalone Next.js frontend app.
  Own package.json, lockfile, configs, routes, components, API client.

backend/
  Standalone Node.js backend app.
  Own package.json, lockfile, configs, HTTP server, agent, DB store, payment executor.

backend/data/
  Local JSON database generated at runtime. Ignored by git.
```

Important files:

```txt
frontend/api.ts                         Frontend API client for Node backend
frontend/package.json                   Frontend dependencies and scripts
backend/server.ts                       Node backend entrypoint
backend/http.ts                         HTTP router and API endpoints
backend/agent/research-agent.ts         Agent orchestrator
backend/payments/payment-executor.ts    402/x402-shaped payment flow
backend/db/store.ts                     Local JSON persistence
backend/types.ts                        Shared app/domain types
backend/package.json                    Backend dependencies and scripts
```

## Frontend Dev Handoff

The frontend dev should mostly work in:

```txt
frontend/components/
frontend/api.ts
frontend/app/page.tsx
frontend/app/ask/page.tsx
frontend/app/answer/[id]/page.tsx
frontend/app/sources/page.tsx
frontend/app/sources/new/page.tsx
frontend/app/dashboard/page.tsx
frontend/app/leaderboard/page.tsx
frontend/app/receipts/[id]/page.tsx
frontend/app/layout.tsx
frontend/app/globals.css
frontend/tailwind.config.ts
frontend/package.json
```

Frontend should avoid changing:

```txt
backend/agent/
backend/db/
backend/http.ts
backend/payments/
backend/server.ts
```

Frontend responsibilities:

- Make the app feel chat-first and intelligent, closer to an autonomous research agent.
- Keep the visual language black/marble/cream/stone, with no yellow/gold glow.
- Improve responsive layout and page polish.
- Make agent activity visible without exposing private chain-of-thought.
- Preserve the structured trace: planning, scouting, scoring, budget allocation, 402 payment, evidence unlocked, receipt saved.
- Use `frontend/api.ts` for backend calls instead of calling backend URLs ad hoc.

Frontend run command:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend expects the backend to already be running on port `4000`.

## Backend / Product Owner Handoff

Backend/product work lives in:

```txt
backend/
```

Backend responsibilities:

- Maintain the standalone Node API server.
- Maintain the research agent modules.
- Maintain source registration, answers, receipts, and leaderboard data.
- Replace mock payments with real Circle/Arc/x402 integration later.
- Replace JSON persistence with Postgres later.
- Add auth, wallet ownership, and source verification later.

Backend run command:

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Backend health check:

```bash
curl http://localhost:4000/api/health
```

## App Routes

Frontend pages:

```txt
/                         Landing page with research prompt
/ask                      Research question page
/answer/:id               Answer, citations, trace, budget, receipts
/sources                  Public source registry
/sources/new              Source registration
/dashboard?wallet=0x...   Source-owner earnings dashboard
/leaderboard              Public traction/payment dashboard
/receipts/:id             Public paid citation receipt
```

Backend API:

```txt
GET  /api/health

POST /api/sources
GET  /api/sources
GET  /api/sources/:id
GET  /api/sources/:id/preview
GET  /api/sources/:id/evidence

POST /api/research
GET  /api/answers/:id

GET  /api/receipts/:id
GET  /api/dashboard?wallet=0x...
GET  /api/leaderboard

POST /api/admin/seed
```

## Local Setup

Backend terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Frontend terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Services:

```txt
Backend on  http://localhost:4000
Frontend on http://localhost:3000
```

If port `3000` is occupied, Next may use `3001`. That is okay for local dev. The backend CORS handler allows localhost dev ports by default unless `CORS_ORIGIN` is fixed in `.env`.

## Environment Variables

Frontend `frontend/.env.local`:

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_PAYMENT_MODE=mock
```

Backend `backend/.env`:

```txt
BACKEND_PORT=4000
BACKEND_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
X402_NETWORK=arc-testnet
NEXT_PUBLIC_PAYMENT_MODE=mock
```

Reserved for real integrations:

```txt
DATABASE_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

ARC_RPC_URL=
ARC_CHAIN_ID=

CIRCLE_API_KEY=
CIRCLE_WALLET_ID=
CIRCLE_ENTITY_SECRET=

MECENAS_AGENT_PRIVATE_KEY=
MECENAS_AGENT_WALLET_ADDRESS=

GATEWAY_API_URL=
```

## Verification

Before pushing:

```bash
cd frontend
npm run typecheck
npm run build

cd ../backend
npm run typecheck
```

Backend smoke tests:

```bash
curl http://localhost:4000/api/health

curl -i http://localhost:4000/api/sources/src_gateway_agents/evidence

curl -X POST http://localhost:4000/api/research \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain why nanopayments matter for AI agents.","budgetUSDC":"0.01","strategy":"balanced"}'
```

Expected:

- `/api/health` returns healthy JSON.
- protected evidence returns `402 Payment Required` without payment proof.
- research creates an answer ID and mock-labeled receipts.

## Agent Architecture

```txt
QueryPlanner
  Builds subquestions, evidence needs, max budget, and strategy.

SourceScout
  Searches registered source title, abstract, tags, and evidence preview.

SourceScorer
  Applies deterministic scoring:
  finalScore = relevance * 0.45 + fit * 0.25 + novelty * 0.15 + price efficiency * 0.15

BudgetAllocator
  Selects high-scoring, diverse sources under budget and explains skipped sources.

PaymentExecutor
  Requests protected evidence, receives 402, creates payment proof, retries, unlocks evidence.

AnswerSynthesizer
  Writes an answer only after paid evidence is unlocked.

Receipt storage
  Stores one receipt per paid citation.
```

## Demo Script

1. Open `/`.
2. Ask: `Explain why nanopayments matter for AI agents.`
3. Show the generated answer page.
4. Point out selected sources, skipped sources, score table, budget meter, and receipts.
5. Open `/sources/new` and register a source.
6. Open `/dashboard?wallet=<source-wallet>`.
7. Open `/leaderboard`.

## Known Limitations

- Payments are mock-labeled unless real Circle/Arc credentials are added.
- Source ownership is not verified.
- The answer synthesizer is deterministic and can be replaced by an LLM adapter.
- Local persistence is JSON in `backend/data/db.json`; production should use Postgres.
- No auth yet.

## Production Path

Recommended next steps:

```txt
1. Add Postgres with Prisma or Drizzle.
2. Add wallet auth for source owners.
3. Replace mock payment proof with real Circle Gateway/x402.
4. Add source ingestion from RSSHub/Ghost/technical blogs.
5. Add embeddings or hybrid search.
6. Add moderation and duplicate-source detection.
7. Deploy frontend and backend separately.
```
