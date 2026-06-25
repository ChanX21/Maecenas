# Mecenas

Scholarly agents that pay their sources.

Mecenas turns scholarly sources into x402-priced evidence endpoints, and gives AI agents a budget to buy the most useful evidence before answering.

This is a Lepton Agents Hackathon MVP for budgeted AI-agent source payments. A user asks a research question, the agent searches registered sources, scores relevance and price, skips weak sources, pays for selected evidence, generates a cited answer, and records receipt cards for source owners.

## Why Mecenas Exists

AI agents increasingly use papers, docs, blogs, datasets, and technical writing as research input. The source creator is usually only cited after the value has already been extracted.

Mecenas demonstrates a different loop:

```txt
Source registers
→ Agent discovers source
→ Agent scores relevance and price
→ Agent decides what to buy
→ Agent pays with USDC nanopayments
→ Evidence unlocks
→ Agent cites source
→ Source owner sees earnings
```

Mecenas is an experimental attribution and payment layer for AI-agent source usage. It does not verify academic ownership, replace journals, prove truth, or solve peer review.

## Hackathon Fit

- Agentic sophistication: explicit modules for planning, scouting, scoring, budget allocation, payment execution, synthesis, and receipt writing.
- Traction: public leaderboard with sources, owners, paid evidence unlocks, answers, and test USDC distributed.
- Circle/Arc usage: x402-shaped evidence endpoint, HTTP 402 challenge, USDC amount, payer wallet, recipient wallet, payment ID, and receipt.
- Innovation: sources become paid evidence endpoints, and the agent pays before using protected evidence.

## Architecture

```txt
Next.js App Router
├─ app/                      Next.js frontend routing layer: pages and layout
├─ frontend/                 UI components and client-side interaction surfaces
├─ backend/server.ts         standalone Node.js backend entrypoint
├─ backend/http.ts           Node HTTP API router
├─ backend/types.ts          shared domain contracts
├─ backend/db/               JSON persistence and seed sources
├─ backend/agent/
│  ├─ query-planner.ts
│  ├─ source-scout.ts
│  ├─ source-scorer.ts
│  ├─ budget-allocator.ts
│  ├─ answer-synthesizer.ts
│  ├─ trace.ts
│  └─ research-agent.ts
├─ backend/payments/         x402/Gateway-shaped payment loop
├─ scripts/dev-all.mjs       starts frontend and backend together
└─ scripts/seed.ts           reset local demo data
```

Local persistence is `data/db.json`, generated at runtime and ignored by git. The code is intentionally modular so each agent decision can be read and debugged independently. The `app/` directory is now frontend-only because Next.js owns routing conventions; product UI lives in `frontend/`, while source registry, agent, payment, HTTP API, and persistence logic lives in `backend/`.

## Agent Decision Flow

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

ReceiptWriter
  Stores one receipt per paid citation.
```

## Payment Flow

MVP payment mode defaults to clearly labeled mock mode unless real Circle credentials are present.

```txt
GET /api/sources/:id/evidence
→ 402 Payment Required
→ x402 metadata: network, asset, amount, recipient wallet, resource
→ Mecenas creates payment authorization/proof
→ retry evidence request with x-payment-proof
→ evidence unlocks
→ receipt is stored
```

The integration surface is isolated in `backend/payments/payment-executor.ts` so real Circle Gateway / Arc testnet calls can replace the mock proof path without changing the agent or UI contracts. The standalone backend runs on `http://localhost:4000` by default.

## Pages

- `/` landing page
- `/ask` research question page
- `/answer/:id` answer, citations, trace, budget, receipts, skipped sources
- `/sources` public source registry
- `/sources/new` source registration
- `/dashboard?wallet=0x...` source owner earnings dashboard
- `/leaderboard` public traction and payment dashboard
- `/receipts/:id` public citation/payment receipt

## API Routes

- `GET /api/health`
- `POST /api/sources`
- `GET /api/sources`
- `GET /api/sources/:id`
- `GET /api/sources/:id/preview`
- `GET /api/sources/:id/evidence`
- `POST /api/research`
- `GET /api/answers/:id`
- `GET /api/receipts/:id`
- `GET /api/dashboard?wallet=0x...`
- `GET /api/leaderboard`
- `POST /api/admin/seed`

## Local Setup

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Open `http://localhost:3000`.

Runtime services:

```txt
Frontend: http://localhost:3000
Backend:  http://localhost:4000
Health:   http://localhost:4000/api/health
```

To run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment Variables

Copy `.env.example` and fill real credentials when moving beyond mock mode.

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
X402_NETWORK=arc-testnet
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
BACKEND_PORT=4000
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_PAYMENT_MODE=mock
```

## Demo Script

1. Show `/`: "Mecenas is a scholarly AI agent that pays its sources."
2. Open `/sources/new` and register a source priced at `0.0001` USDC.
3. Open `/ask` and ask: "Explain why nanopayments matter for AI agents."
4. Show planning, source scoring, selected sources, skipped sources, 402 challenge, mock payment, evidence unlock, and receipt saved.
5. Open the generated `/answer/:id`.
6. Open a `/receipts/:id` page.
7. Open `/dashboard?wallet=<source-wallet>`.
8. Open `/leaderboard` for public traction metrics.

## Traction Metrics

The leaderboard tracks:

- Sources registered
- Source owners
- Research questions answered
- Paid evidence unlocks
- Test USDC distributed
- Top earning sources
- Recent payment stream

## Limitations

- Mock payment mode is used unless real Circle credentials are configured.
- Source ownership and academic identity are not verified.
- The answer synthesizer is deterministic for the MVP and can be replaced with an LLM adapter.
- JSON-file persistence is used for local speed; move to Postgres/Supabase/Neon for production.

## Future Work

- Real Circle Gateway / Arc testnet settlement
- OpenAlex and Crossref metadata enrichment
- ORCID verification
- Multi-author splits
- Dataset and PDF payments
- Public source marketplace
- Citation reputation
- Telegram or email earning notifications
