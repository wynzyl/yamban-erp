# Deploying Yamban ERP on Docker

This guide covers deploying Yamban to a Windows PC with Docker Desktop so that other computers on your local network can access it.

## Prerequisites

- Docker Desktop for Windows with WSL2 backend
- The host PC's IP address on your LAN (e.g., `192.168.1.22`)

## Quick Start

1. **Create your production environment file**

   ```powershell
   copy .env.production.example .env.production
   ```

   Edit `.env.production` and set:
   - `JWT_ACCESS_SECRET`: Generate a secure random string (at least 32 characters)
   - `SEED_OWNER_PASSWORD`: A strong password for the owner account

2. **Build the Docker images**

   ```powershell
   docker compose -f docker-compose.prod.yml build
   ```

   This takes a few minutes the first time. Subsequent builds are faster due to caching.

3. **Start the services**

   ```powershell
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Run database migrations**

   ```powershell
   docker compose -f docker-compose.prod.yml exec api pnpm db:migrate
   ```

5. **Create the owner account**

   ```powershell
   docker compose -f docker-compose.prod.yml exec api pnpm db:seed
   ```

6. **Configure client machines**

   On each computer that needs access, add this line to the hosts file:

   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - Mac/Linux: `/etc/hosts`

   ```
   192.168.1.100   yamban-erp.local
   ```

   Replace `192.168.1.100` with your Docker host's actual LAN IP.

7. **Access the app**

   Open `http://yamban-erp.local:8000` in a browser (or just `http://192.168.x.x:8000` using the host's IP).

## Common Commands

```powershell
# View logs
docker compose -f docker-compose.prod.yml logs -f

# View logs for a specific service
docker compose -f docker-compose.prod.yml logs -f api

# Stop all services
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes database)
docker compose -f docker-compose.prod.yml down -v

# Restart a single service
docker compose -f docker-compose.prod.yml restart api

# Run a command in the API container
docker compose -f docker-compose.prod.yml exec api <command>
```

## After Schema Changes

When the database schema changes:

```powershell
# Rebuild the API image
docker compose -f docker-compose.prod.yml build api

# Restart the API
docker compose -f docker-compose.prod.yml up -d api

# Apply migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:migrate
```

## Troubleshooting

### Containers won't start

Check if ports are in use:

```powershell
netstat -ano | findstr :80
```

If port 80 is taken, edit `docker-compose.prod.yml` and change the ports mapping (default is `"8000:80"`) to another available port.

### Database connection errors

The API waits for Postgres to be healthy before starting. If you see connection errors:

```powershell
# Check Postgres status
docker compose -f docker-compose.prod.yml ps postgres

# View Postgres logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Can't access from other machines

1. Make sure Windows Firewall allows incoming connections on port 8000 (or whichever port you configured)
2. Verify the hosts file entry points to the correct IP
3. Test with `ping yamban-erp.local` from the client machine

### Need to access Drizzle Studio

```powershell
docker compose -f docker-compose.prod.yml exec api pnpm db:studio
```

Then open the URL shown in the terminal.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           Docker Network: yamban            │
                    │                                             │
   LAN:8000         │  ┌─────────┐     ┌─────────┐               │
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

All traffic enters through Nginx on port 8000 (configurable). The database is internal only (not exposed to the host).
