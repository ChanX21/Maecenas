# Backend

This folder owns the standalone Node.js backend and Maecenas domain logic.

## Own These Areas

```txt
server.ts
http.ts
agent/
db/
payments/
utils/
types.ts
scripts/seed.ts
package.json
```

## Responsibilities

- Node HTTP API server.
- Source registry APIs.
- Research agent orchestration.
- Query planning, source scouting, scoring, and budget allocation.
- 402/x402-shaped payment flow.
- Answer and receipt storage.
- Dashboard and leaderboard data.

## Run

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run seed
npm run dev
```

Default:

```txt
http://localhost:4000
```

Health:

```bash
curl http://localhost:4000/api/health
```

## API Boundary

The frontend calls this backend through `frontend/api.ts`.

Do not add new Next.js API routes in the frontend. Backend APIs belong here in `http.ts`.

## Persistence

Supabase Postgres with Drizzle migrations. Set `SUPABASE_DATABASE_URL` to the
Supabase transaction-pooler URI from **Dashboard → Connect**, then run:

```bash
npm run db:migrate
npm run seed
```

`npm run seed` is idempotent and does not reset usage or payment records.

The acceptance test requires a disposable Postgres database because it clears
all application tables:

```bash
TEST_DATABASE_URL=postgresql://... npm test
```

New source submissions remain pending until reviewed:

```bash
npm run source:review -- src_123 approved
npm run source:review -- src_123 rejected "Duplicate or unverifiable evidence"
```

## Free And Paid Research

The client persists `maecenas_session_id` in localStorage and sends it as
`sessionId`. Call `GET /api/usage`, then `POST /api/research`. After five
completed free answers, authenticate the wallet, create
`/api/payments/search-intent`, settle the returned x402 requirement, submit it
to `/api/payments/search-proof`, and retry research with the returned
`searchPaymentId`.

`PAYMENT_MODE=real` uses Circle Gateway and fails closed when treasury, agent
wallet, signing secret, or public URL configuration is missing.

Research requires `OPENAI_API_KEY`; `OPENAI_MODEL` defaults to `gpt-5-mini`.
Without a key the API returns `503 AI_NOT_CONFIGURED` and does not consume quota.

### Gateway funding

The agent wallet must have USDC available in Circle Gateway before real evidence
purchases can succeed.

```bash
# Read-only balance check
npm run gateway:balance

# Deposit 5 USDC, or another explicit amount
npm run gateway:deposit -- 5
```

### Live ledger semantics

`GET /api/leaderboard` and `GET /api/dashboard` read current database state and
return `Cache-Control: no-store`. Records are isolated by the active
`PAYMENT_MODE`:

- `mock` reports only completed mock receipts.
- `real` reports only successfully paid Circle Gateway receipts.
- Pending and failed receipts never contribute to payout totals.
- Registered source owners and contributors who actually received a completed
  payment are reported separately.

Circle Gateway nanopayments are signed off-chain and settled in batches. The
per-payment UUID returned by Gateway is stored as `paymentId`; `txHash` is only
set when Circle returns a real 32-byte EVM transaction hash. Creator earnings
first appear in the creator's Gateway balance and only appear in the ordinary
Arc wallet after that creator withdraws. Seed source wallets are demo addresses,
so only sources registered with a wallet controlled by the creator can withdraw.

Authenticated creators can call `GET /api/gateway/withdrawal-quote` and sign
the returned EIP-712 burn intent, then submit it to `POST /api/gateway/withdraw`.
The backend sponsors the Arc mint transaction and returns its Arc transaction
hash. Circle's estimated transfer fee must be covered by the Gateway balance.

The endpoints are fresh on every request. They do not push updates to an already
open browser page; the client must reload, poll, or subscribe to a future event
stream for continuous updates.

## Production Notes

Deployment requirements:

```txt
funded Circle Gateway agent wallet
Supabase backups and point-in-time recovery configured
production monitoring and alert routing
legal and payout compliance review
```
