# Maecenas

Evidence-grounded research with transparent budgets and source-owner receipts.

## Current Product

- Five sponsored answers per anonymous browser session.
- OpenAI planning, source assessment and evidence-grounded synthesis.
- Only approved registry sources can enter research.
- Supabase Postgres persistence with Drizzle migrations.
- Idempotent quota and payment reservations.
- Mock or Circle Gateway search payments and source payouts.
- Wallet-authenticated source submission and owner dashboard.
- Signed receipts, queued research, rate limits, admin review, and Supabase backups.

Real mode fails closed unless Circle/Arc settlement configuration is complete.

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
SUPABASE_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres
DATABASE_POOL_SIZE=10
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

FREE_SEARCH_LIMIT=5
FREE_SEARCH_BUDGET_USDC=0.01
SPONSORED_TREASURY_LIMIT_USDC=1.00
PAID_SEARCH_PRICE_USDC=0.01

PAYMENT_MODE=mock
MAECENAS_TREASURY_WALLET_ADDRESS=
MAECENAS_AGENT_WALLET_ADDRESS=
ADMIN_TOKEN=
ADMIN_WALLETS=
TOKEN_SIGNING_SECRET=

PLATFORM_FEE_BPS=1000
RESEARCH_ASYNC=true
RESEARCH_WORKER_CONCURRENCY=2
```

Without `OPENAI_API_KEY`, research returns `503 AI_NOT_CONFIGURED` and consumes
no quota. Mock payment mode authenticates a wallet signature but moves no funds.

## Source Review

New submissions start as `pending` and remain unavailable to research until
reviewed:

```bash
cd backend
npm run source:review -- src_123 approved
npm run source:review -- src_123 rejected "Duplicate or unverifiable evidence"
```

The HTTP review endpoint accepts `ADMIN_TOKEN` or a signed wallet listed in
`ADMIN_WALLETS`. The web console is available at `/admin`.

## Main APIs

```txt
GET  /api/usage
POST /api/research
GET  /api/research/runs/:id
POST /api/auth/nonce
POST /api/auth/verify
POST /api/payments/search-intent
POST /api/payments/search-proof

GET  /api/sources
POST /api/sources
GET  /api/admin/sources
POST /api/admin/sources/:id/review

GET  /api/answers/:id
GET  /api/receipts/:id
GET  /api/receipts/:id/verify
GET  /api/dashboard
GET  /api/leaderboard
GET  /api/admin/metrics
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

## Security And Operations

- Public source responses never contain protected evidence.
- Owner operations require one-time wallet challenges and signed sessions.
- Real payments settle through Circle Gateway; mock mode remains available.
- Receipts carry signatures and expose a verification endpoint.
- Research can use a bounded worker queue.
- Rate limits, JSON request logs, admin metrics, and SQLite backups are included.

SQLite assumes one backend process with persistent disk. Mainnet still requires
funded Gateway wallets, off-site backup retention, alert routing, and a
deployment-specific compliance review.

## Funding Economics

- `PAID_SEARCH_PRICE_USDC` is the patron payment for one commission.
- `PLATFORM_FEE_BPS` is reserved for platform operations; the remainder is the maximum evidence budget.
- `SPONSORED_TREASURY_LIMIT_USDC` caps aggregate sponsored evidence spending.
- Selected source prices are paid directly to their registered wallets in real mode.
- Unspent commission value remains in the treasury.
- A failed research run releases its paid commission for a retry. Settled USDC is not automatically reversed.
