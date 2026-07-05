# Maecenas

<p align="center">
  <strong>Fund the question. Reward the evidence.</strong>
</p>

<p align="center">
  An evidence-grounded research funding protocol with transparent budgets,<br />
  curated sources, contributor payouts, and verifiable receipts.
</p>

<p align="center">
  <a href="https://www.maecenas.in">Live application</a>
  ·
  <a href="https://maecenas.onrender.com/api/health">API health</a>
  ·
  <a href="#quick-start">Run locally</a>
  ·
  <a href="#api">API reference</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Circle" src="https://img.shields.io/badge/Circle-Gateway-00AEEF" />
  <img alt="Arc Testnet" src="https://img.shields.io/badge/Network-Arc_Testnet-90E0A8" />
</p>

<img width="1577" height="869" alt="Maecenas research workspace" src="https://github.com/user-attachments/assets/e9ee5b8f-93fd-4e16-82f6-71e4930df989" />

## Why Maecenas?

Research funding and evidence discovery usually happen in separate systems.
Maecenas combines them into one auditable workflow:

1. A patron commissions a question and defines a research budget.
2. The research agent evaluates only approved sources.
3. Evidence is selected before synthesis and attributed in the final answer.
4. The commission budget funds selected source owners.
5. Signed receipts record what was funded, cited, and paid.

The result is decision-ready research with a visible chain from capital to
evidence.

<img width="1152" height="648" alt="Maecenas research and funding flow" src="https://github.com/user-attachments/assets/599d1af2-608e-435e-914d-3e1453a42119" />

## Features

- **Budget-aware research** — configurable research posture, evidence budget,
  and sponsored quota.
- **Evidence-first synthesis** — OpenAI-powered planning, source assessment,
  and cited answer generation.
- **Curated source registry** — only approved evidence can enter a research
  run.
- **Contributor funding** — selected source owners receive citation-based
  payouts from the available evidence budget.
- **Wallet authentication** — one-time signed challenges protect source,
  dashboard, and payment operations.
- **Verifiable receipts** — signed records connect commissions, citations,
  recipients, and settlement references.
- **Testnet settlement** — Circle Gateway and x402 payments on Arc Testnet,
  with a mock mode for local development.
- **Operational safeguards** — idempotent reservations, bounded research
  workers, rate limits, structured logs, and admin review.

> [!IMPORTANT]
> Maecenas is testnet software. Do not use production funds or mainnet keys.
> Real payment mode fails closed when required Circle, Arc, wallet, or signing
> configuration is missing.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web | Next.js 15, React 19, Tailwind CSS | Research, source, wallet, receipt, and admin interfaces |
| Wallet | Dynamic, viem | Wallet connection, signed authentication, and Arc transactions |
| API | Node.js, TypeScript | Research orchestration, authorization, quotas, and settlement |
| Research | OpenAI | Query planning, evidence evaluation, and answer synthesis |
| Data | Supabase Postgres, Drizzle ORM | Sources, research runs, payments, usage, and receipts |
| Payments | Circle Gateway, x402, Arc Testnet | Commission collection and source-owner payouts |

```text
Browser / Wallet
      |
      v
Next.js frontend  --->  Node API  --->  Supabase Postgres
                            |
                            +----> OpenAI research pipeline
                            |
                            +----> Circle Gateway / Arc Testnet
```

## Repository

```text
.
├── frontend/   Next.js application
├── backend/    Node API, research agent, payments, and Drizzle schema
└── vercel.json Vercel service configuration
```

## Quick Start

### Prerequisites

- Node.js 22+
- A Supabase Postgres project
- An OpenAI API key for research generation
- Optional test wallets and Circle Gateway funds for real payment mode

### 1. Start the backend

```bash
cd backend
npm ci
cp .env.example .env
npm run db:migrate
npm run seed
npm run dev
```

The API starts at `http://localhost:4000`.

### 2. Start the frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configuration

The example files document every supported variable:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

Minimum backend configuration:

```env
SUPABASE_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres
DATABASE_POOL_SIZE=5

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

CORS_ORIGIN=http://localhost:3000
APP_ORIGIN=http://localhost:3000
PUBLIC_BACKEND_URL=http://localhost:4000

TOKEN_SIGNING_SECRET=
IP_HASH_SECRET=
PAYMENT_MODE=mock
```

Minimum frontend configuration:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=
```

Generate independent application secrets instead of reusing wallet or database
credentials:

```bash
openssl rand -hex 32
```

Without `OPENAI_API_KEY`, research returns `503 AI_NOT_CONFIGURED` without
consuming quota. Mock payment mode validates the application flow but does not
move funds.

## Payment Modes

### Mock

Use `PAYMENT_MODE=mock` for local development and UI testing. Payment and
receipt records are marked as mock and excluded from real-settlement metrics.

### Real

Use `PAYMENT_MODE=real` for Circle Gateway settlement on Arc Testnet. Real mode
requires the treasury address, an isolated agent wallet, Gateway configuration,
Arc RPC access, administrator authorization, and signing secrets.

Never commit private keys or secrets. Use dedicated, disposable testnet wallets
and rotate any credential that has been shared publicly.

## Source Review

New source submissions start as `pending` and remain unavailable to research
until approved.

```bash
cd backend
npm run source:review -- src_123 approved
npm run source:review -- src_123 rejected "Duplicate or unverifiable evidence"
```

The HTTP review endpoint accepts either `ADMIN_TOKEN` or a signed administrator
wallet listed in `ADMIN_WALLETS`. The review console is available at `/admin`.

## API

Production base URL: `https://maecenas.onrender.com`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service readiness |
| `GET` | `/api/usage` | Sponsored and paid usage for a session |
| `POST` | `/api/research` | Start a research commission |
| `GET` | `/api/research/runs/:id` | Read queued research status |
| `GET` | `/api/answers/:id` | Read a completed answer |
| `POST` | `/api/auth/nonce` | Create a wallet challenge |
| `POST` | `/api/auth/verify` | Exchange a wallet signature for a session |
| `GET` | `/api/sources` | List approved sources |
| `POST` | `/api/sources` | Submit a wallet-owned source |
| `POST` | `/api/payments/search-intent` | Create a commission payment intent |
| `POST` | `/api/payments/search-proof` | Verify and settle a payment proof |
| `GET` | `/api/receipts/:id` | Read a funding receipt |
| `GET` | `/api/receipts/:id/verify` | Verify a receipt signature |
| `GET` | `/api/dashboard` | Read source-owner earnings |
| `GET` | `/api/leaderboard` | Read public funding metrics |
| `GET` | `/api/admin/sources` | List sources for review |
| `POST` | `/api/admin/sources/:id/review` | Approve or reject a source |
| `GET` | `/api/admin/metrics` | Read operational metrics |

Authenticated endpoints accept:

```http
Authorization: Bearer <signed-session-token>
```

## Funding Economics

- `PAID_SEARCH_PRICE_USDC` sets the patron price for one commission.
- `PLATFORM_FEE_BPS` reserves the platform share; the remainder is the maximum
  evidence budget.
- `SPONSORED_TREASURY_LIMIT_USDC` caps aggregate sponsored evidence spending.
- Selected evidence prices are paid to registered source-owner wallets.
- Unspent commission value remains in the treasury.
- A failed research run releases its commission record for retry; settled USDC
  is not automatically reversed.

## Security Model

- Protected evidence is excluded from public source responses.
- Evidence access uses short-lived signed grants.
- Owner and administrator operations require wallet authentication.
- Payment intents are bound to a session and wallet.
- Receipt signatures can be checked through the verification endpoint.
- Real-mode metrics exclude mock, pending, and failed settlements.
- Production startup validates required secrets and payment configuration.

This repository is not a substitute for a payment, smart-contract, or compliance
audit.

## Deployment

The reference deployment uses:

- **Frontend:** Vercel — `https://maecenas.vercel.app`
- **Backend:** Render — `https://maecenas.onrender.com`
- **Database:** Supabase Postgres

Keep these values aligned in production:

```env
# Frontend
NEXT_PUBLIC_APP_URL=https://maecenas.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://maecenas.onrender.com

# Backend
CORS_ORIGIN=https://www.maecenas.in,https://maecenas.in,https://maecenas.vercel.app
APP_ORIGIN=https://www.maecenas.in
PUBLIC_BACKEND_URL=https://maecenas.onrender.com
TRUST_PROXY=true
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

## Contributing

1. Fork the repository and create a focused branch.
2. Keep payment, authorization, and quota changes covered by tests.
3. Run the verification commands above.
4. Open a pull request describing the behavior change and deployment impact.

Security-sensitive findings should not be disclosed in a public issue.
