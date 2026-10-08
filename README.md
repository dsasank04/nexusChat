# NexusChat

A universal AI chat client. Sign in, connect your own API keys for OpenAI, Anthropic, Gemini and DeepSeek, and switch models in the middle of a conversation without losing context.

## Repository layout

```
nexusChat/
├── server/   NestJS 11 API — auth, encrypted API keys, SSE chat streaming, model switching
└── client/   React + Vite + Tailwind frontend (coming in Week 1)
```

## Stack

| Layer | Choice | Hosting |
|---|---|---|
| Frontend | React, Vite, Tailwind | Vercel |
| Backend | NestJS 11 on Node 22, Swagger | Render |
| Database | PostgreSQL via Prisma | Supabase |
| Cache / rate limits | Redis (ioredis) | Upstash |

## Running the server

Requires Node 22 or later.

```bash
cd server
npm install
cp .env.example .env        # then fill in the values
npx prisma migrate deploy   # create the database tables
npm run start:dev
```

- Health check: http://localhost:3001/health
- API docs (Swagger): http://localhost:3001/api/docs

See [`server/.env.example`](server/.env.example) for every required variable and how to generate the encryption keys.
