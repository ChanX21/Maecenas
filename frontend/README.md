# Frontend

This folder owns the Mecenas user experience:

- reusable UI components
- client-side forms and loading states
- dashboard, receipt, source, trace, and leaderboard presentation components

Next.js route files still live in `app/`, but they should stay thin and import UI from `frontend/components`. API calls go through `frontend/api.ts`, which targets the standalone Node backend.

Frontend-safe areas:

```txt
frontend/components/
frontend/api.ts
app/*.tsx
app/**/page.tsx
app/globals.css
tailwind.config.ts
```

Avoid changing `backend/` unless a UI change needs a new typed field or API behavior.
