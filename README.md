# LinkUp Backend (Sprint 1)

Node + Express + TypeScript + Firebase Admin.
Endpoints: auth/register, users CRUD (GET/PUT/DELETE), meetings create, healthcheck.

## Run local
```bash
cp .env.example .env
npm i
npm run dev
```

## Deploy (Render)
- Build: `npm run build`
- Start: `npm start`
- Env vars: copy from `.env.example`
- CORS_ORIGIN: set to your Vercel URL
