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

SQLite with Drizzle migrations:

```txt
data/maecenas.db
```

`npm run seed` is idempotent and does not reset usage or payment records.

New source submissions remain pending until reviewed:

```bash
npm run source:review -- src_123 approved
npm run source:review -- src_123 rejected "Duplicate or unverifiable evidence"
```

## Free And Paid Research

The client persists `maecenas_session_id` in localStorage and sends it as
`sessionId`. Call `GET /api/usage`, then `POST /api/research`. After five
completed free answers, create `/api/payments/search-intent`, submit mock proof
to `/api/payments/search-proof`, and retry research with the returned
`searchPaymentId`.

`PAYMENT_MODE=real` intentionally fails startup until Circle/Arc verification
and evidence payment execution are implemented.

Research requires `OPENAI_API_KEY`; `OPENAI_MODEL` defaults to `gpt-5-mini`.
Without a key the API returns `503 AI_NOT_CONFIGURED` and does not consume quota.

## Production Notes

Main upgrades still needed:

```txt
Postgres
wallet auth
real Circle Gateway/x402 payments
source ownership verification
LLM answer adapter
```
