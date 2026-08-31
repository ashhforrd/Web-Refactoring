# Teamboard

Teamboard is an internal project-tracking service for small teams. It contains a
Fastify API, a React client, and shared TypeScript packages.

## Local development

```sh
cp .env.example .env
pnpm install
pnpm dev
```

The web client is served at `http://localhost:5173`; the API listens on
`http://localhost:4100`. On first start the API creates and seeds a local SQLite
database.

## Commands

```sh
pnpm test
pnpm typecheck
pnpm build
```

Demo login: `alex@example.test` / `demo-password`.

# Web-Refactoring
