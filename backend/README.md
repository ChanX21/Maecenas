# Backend

This folder owns the Mecenas domain logic:

- standalone Node.js HTTP server
- agent planning, scouting, scoring, budget allocation, synthesis, and trace events
- JSON-backed local persistence and seed data
- x402/Gateway-shaped payment executor
- shared domain types and utilities

The backend runs independently from the Next.js frontend:

```bash
npm run dev:backend
```

Default URL:

```txt
http://localhost:4000
```

Backend-safe areas:

```txt
backend/agent/
backend/db/
backend/http.ts
backend/payments/
backend/server.ts
backend/utils/
backend/types.ts
```
