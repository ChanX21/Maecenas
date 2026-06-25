# Backend

This folder owns the standalone Node.js backend and Mecenas domain logic.

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

## Current Persistence

Backend-local JSON file:

```txt
data/db.json
```

Reset seed data:

```bash
npm run seed
```

## Production Notes

Main upgrades still needed:

```txt
Postgres
wallet auth
real Circle Gateway/x402 payments
source ownership verification
LLM answer adapter
background jobs / queue for longer research runs
```
