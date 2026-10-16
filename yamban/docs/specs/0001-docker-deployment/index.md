# 0001. Docker Deployment for LAN Access

**Date**: 2026-10-16
**Status**: Accepted

## Summary

This spec defines how to containerize and deploy the Yamban ERP system using Docker Compose with an Nginx reverse proxy, so that three computers on the local network can access the application through a single hostname. The setup uses multi stage builds for smaller images, runs on Docker Desktop for Windows, and exposes everything through port 80 on the host machine.

## Decision

**Chosen option**: Multi container Docker Compose with Nginx reverse proxy

We will containerize the NestJS API, Next.js web app, and PostgreSQL database as separate services under a single Docker Compose configuration, with Nginx as the entry point handling routing to the appropriate service.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Container runtime | Docker Desktop for Windows | Already available on the dev machine, supports Linux containers |
| Orchestration | Docker Compose | Simple multi container orchestration, no Kubernetes overhead |
| Reverse proxy | Nginx (Alpine) | Lightweight, handles routing to web and API containers |
| Node.js base | node:22-alpine | Matches the project's engine requirement (>=22.12), smallest image |
| Database | postgres:17-alpine | Already in use, Alpine variant for consistency |
| Build strategy | Multi stage Dockerfile | Separate build and runtime stages for smaller final images |

## Container architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           Docker Network: yamban            │
                    │                                             │
   LAN:80           │  ┌─────────┐     ┌─────────┐               │
────────────────────┼─►│  nginx  │────►│   web   │ :3000         │
   yamban-erp.local │  │  :80    │     │ Next.js │               │
                    │  └────┬────┘     └────┬────┘               │
                    │       │               │                     │
                    │       │ /api/*        │ API_INTERNAL_URL    │
                    │       │               ▼                     │
                    │       │          ┌─────────┐               │
                    │       └─────────►│   api   │ :4000         │
                    │                  │ NestJS  │               │
                    │                  └────┬────┘               │
                    │                       │                     │
                    │                       ▼                     │
                    │                  ┌──────────┐              │
                    │                  │ postgres │ :5432        │
                    │                  │          │ (internal)   │
                    │                  └──────────┘              │
                    └─────────────────────────────────────────────┘
```

**Container names**: `yamban-nginx`, `yamban-web`, `yamban-api`, `yamban-postgres`

## Configuration required

Environment variables for `.env.production` (gitignored):

- `NODE_ENV`: Set to `production`
- `DATABASE_URL`: `postgres://yamban:yamban@postgres:5432/yamban` (uses Docker service name)
- `API_PORT`: `4000`
- `WEB_ORIGIN`: `http://yamban-erp.local`
- `API_INTERNAL_URL`: `http://api:4000` (uses Docker service name)
- `JWT_ACCESS_SECRET`: A secure random string (at least 32 characters)
- `ACCESS_TOKEN_TTL_SECONDS`: `900`
- `REFRESH_TOKEN_TTL_DAYS`: `14`
- `COOKIE_SECURE`: `false` (HTTP only on LAN)
- `SEED_OWNER_EMAIL`: Owner account email
- `SEED_OWNER_NAME`: Owner account name
- `SEED_OWNER_PASSWORD`: Owner account password

## Files to create

| File | Purpose |
|---|---|
| `Dockerfile.api` | Multi stage build for NestJS API |
| `Dockerfile.web` | Multi stage build for Next.js web app |
| `nginx/nginx.conf` | Nginx configuration for reverse proxy |
| `docker-compose.prod.yml` | Production compose file |
| `docker-compose.override.yml` | Development overrides (optional) |
| `.env.production.example` | Template for production env vars |

## Build plan

1. Create `.env.production.example` with production environment variable template
2. Create `Dockerfile.api` with multi stage build: base with pnpm, build stage compiling shared and api, production stage with runtime only
3. Create `Dockerfile.web` with multi stage build: base with pnpm, build stage compiling shared and web, production stage with Next.js standalone output
4. Create `nginx/nginx.conf` with upstream blocks for web and api, location routing
5. Create `docker-compose.prod.yml` defining all four services with health checks, restart policies, and proper dependency ordering
6. Update existing `docker-compose.yml` to add the override pattern for development
7. Add deployment documentation to the project

## Consequences

**Positive**:
- All three computers on the LAN can access Yamban through a single URL
- Containers are isolated and can be updated independently
- Multi stage builds keep images small (only runtime dependencies in final image)
- Health checks ensure proper startup ordering and automatic recovery
- Nginx handles all external traffic, simplifying SSL addition later

**Negative / tradeoffs**:
- Requires Docker Desktop running on the Windows host machine
- Each client computer needs a hosts file entry for `yamban-erp.local`
- Rebuilding images takes time when dependencies change
- Database is internal only, so Drizzle Studio must run via `docker compose exec`

**Neutral**:
- Migrations are run manually (`docker compose exec api pnpm db:migrate`) rather than automatically on startup, which is safer but requires an extra step after schema changes

## Follow-up

- [ ] Add SSL support with mkcert for HTTPS when needed
- [ ] Consider adding a Watchtower container for automatic image updates
- [ ] Document the hosts file setup for each client machine
