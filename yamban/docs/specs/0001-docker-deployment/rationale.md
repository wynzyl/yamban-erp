# 0001. Docker Deployment for LAN Access: Rationale

## Context

Yamban is a monorepo ERP system with three main components: a NestJS API, a Next.js web app, and a PostgreSQL database. Currently, development runs these services directly on the host machine, with only Postgres containerized via the existing `docker-compose.yml`.

The goal is to make Yamban accessible from three computers on a local network. This requires packaging the entire stack into containers and exposing a single entry point that routes traffic to the appropriate service. The environment is a Windows PC running Docker Desktop, accessed by LAN clients through the hostname `yamban-erp.local`.

Constraints shaping this decision:
- **LAN only access**: No public internet exposure, so SSL is optional (cookies work with `SameSite=Lax` over HTTP on trusted networks)
- **Windows host**: Docker Desktop for Windows with WSL2 backend
- **Three client machines**: Each will need a hosts file entry pointing `yamban-erp.local` to the Docker host's IP
- **Existing architecture**: The web app proxies `/api/*` to the API internally, so external clients only talk to one origin
- **Node.js 22 requirement**: The project specifies `engines.node >= 22.12`

## Options considered

### Option 1: Nginx reverse proxy with Docker Compose

Deploy all services (postgres, api, web, nginx) as containers orchestrated by Docker Compose. Nginx acts as the single entry point on port 80, routing requests to the web container and forwarding `/api/*` to the API container.

**Pros**:
- Single entry point simplifies client configuration
- Nginx is battle tested for reverse proxying
- Easy to add SSL later via certbot or mkcert
- Each service is isolated and can be updated independently
- Matches production deployment patterns

**Cons**:
- Four containers to manage instead of two
- Slightly more complex configuration (nginx.conf, multiple Dockerfiles)
- Requires rebuilding images when code changes

### Option 2: Expose web and API on separate ports

Run web on port 3000 and API on port 4000, both exposed to the LAN. No reverse proxy.

**Pros**:
- Simpler setup, fewer moving parts
- No Nginx configuration needed

**Cons**:
- Clients would need to handle two origins, breaking the cookie based auth flow
- The Next.js rewrite to `/api/*` only works when both are on the same origin from the browser's perspective
- Would require CORS configuration and `SameSite=None` cookies

### Option 3: Next.js as the only exposed service

Expose only the Next.js container, which internally proxies to the API container using Docker networking.

**Pros**:
- Simpler than full Nginx setup
- Leverages existing Next.js rewrite config

**Cons**:
- Next.js is not optimized for production reverse proxying
- No request buffering, compression control, or static file optimization
- Harder to add rate limiting or access control later
- Less flexibility for future additions (e.g., a separate admin panel)

## Rationale

Option 1 (Nginx reverse proxy) is the right choice because it preserves the existing auth flow where cookies are first party (everything on the same origin), provides a production grade entry point that can be extended later, and keeps each service isolated behind a well understood proxy layer.

Option 2 would break the cookie based authentication that depends on same origin requests. The current architecture has the browser talk only to Next.js, which rewrites `/api/*` to the NestJS backend internally. Exposing both directly would require reworking the auth to handle cross origin requests.

Option 3 is simpler but trades future flexibility for immediate convenience. Nginx adds configuration complexity today but provides a clear extension point for SSL, rate limiting, and additional services tomorrow.

The multi stage Docker build strategy keeps final images small by installing only production dependencies in the runtime stage. The shared package is built once in a base stage and copied into both app stages, avoiding duplicate builds.

Health checks on all services ensure Docker Compose starts them in the right order (postgres → api → web → nginx) and restarts any that fail. The `unless-stopped` restart policy means containers come back after a reboot unless explicitly stopped.

The database is internal only (no exposed port), which is more secure but means tools like Drizzle Studio must run via `docker compose exec`. This is acceptable for a LAN deployment where the operator has shell access to the Docker host.
