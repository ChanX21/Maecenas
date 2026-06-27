# Maecenas

Evidence-grounded research with transparent budgets and source-owner receipts.

## Current Product

- Five sponsored answers per anonymous browser session.
- OpenAI planning, source assessment and evidence-grounded synthesis.
- Only approved registry sources can enter research.
- SQLite persistence with Drizzle migrations.
- Idempotent quota and payment reservations.
- Mock search payments and evidence receipts, clearly labeled as unsettled.
- Wallet-connected source submission and owner dashboard.

Real Circle/Arc settlement is intentionally disabled until payment verification
and payout execution are implemented.

## Run

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The API runs on http://localhost:4000.

## Required Configuration

`backend/.env`:

```env
DATABASE_URL=./data/maecenas.db
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

FREE_SEARCH_LIMIT=5
FREE_SEARCH_BUDGET_USDC=0.01
PAID_SEARCH_PRICE_USDC=0.01

PAYMENT_MODE=mock
MAECENAS_TREASURY_WALLET_ADDRESS=
MAECENAS_AGENT_WALLET_ADDRESS=
ADMIN_TOKEN=
```

Without `OPENAI_API_KEY`, research returns `503 AI_NOT_CONFIGURED` and consumes
no quota. Mock payment mode connects a wallet address but moves no funds.

## Source Review

New submissions start as `pending` and remain unavailable to research until
reviewed:

```bash
cd backend
npm run source:review -- src_123 approved
npm run source:review -- src_123 rejected "Duplicate or unverifiable evidence"
```

The HTTP review endpoint is protected by `ADMIN_TOKEN`.

## Main APIs

```txt
GET  /api/usage
POST /api/research
POST /api/payments/search-intent
POST /api/payments/search-proof

GET  /api/sources
POST /api/sources
GET  /api/admin/sources
POST /api/admin/sources/:id/review

GET  /api/answers/:id
GET  /api/receipts/:id
GET  /api/dashboard
GET  /api/leaderboard
```

## Verification

```bash
cd backend
npm run typecheck
npm test

cd ../frontend
npm run typecheck
npm run build
```

## Not Yet Production Settlement

- Wallet signatures do not yet prove source ownership.
- Circle/Gateway x402 proofs are not verified.
- Evidence receipts are mock ledger records, not transferred USDC.
- SQLite assumes one backend instance with persistent disk.
- PostgreSQL, rate limiting, worker jobs, reconciliation and compliance controls
  are required before mainnet.
