# Ticketing System - Docker Setup

This setup runs the system with 3 app servers, Redis (local ACL auth), and PostgreSQL 17 primary-replica replication.

- Docker build Node version is pinned to `24.14.0`.

## Architecture

- App servers:
  - `app-1` -> `http://localhost:3000`
  - `app-2` -> `http://localhost:3001`
  - `app-3` -> `http://localhost:3002`
- Redis:
  - internal service name: `redis`
  - auth: username/password via ACL file
- PostgreSQL replication:
  - primary: `postgres-primary` (`localhost:5432`)
  - replica: `postgres-replica` (`localhost:5433`)
  - image: `bitnamilegacy/postgresql-repmgr:17.6.0-debian-12-r2` (PostgreSQL 17, repmgr-based)

## Resource Limits

- Each app container:
  - RAM: `4GB`
  - CPU: `4 cores`
- Each PostgreSQL container:
  - RAM: `8GB`
  - CPU: `4 cores`

## Environment Behavior

- Chatwoot-related env variables were removed from compose.
- Zabbix credentials are still external and read from `.env`:

```env
ZABBIX_URL=http://10.2.10.10/api_jsonrpc.php
ZABBIX_API_TOKEN=your-zabbix-token
```

## Redis Credentials

- Username: `operations`
- Password: `operations_redis_2026`
- App uses:
  - `REDIS_URL=redis://operations:operations_redis_2026@redis:6379`

## Run

```bash
docker compose build
docker compose up -d
```

`docker compose up` will run database initialization automatically via `db-init`:

- `npx prisma migrate deploy`
- `npx prisma db seed`

## Useful Commands

```bash
# App logs
docker compose logs -f app-1 app-2 app-3

# DB logs
docker compose logs -f postgres-primary postgres-replica

# Stop all
docker compose down

# Stop and remove all volumes
docker compose down -v
```

## Data Volumes

- `postgres_primary_data`
- `postgres_replica_data`
- `redis_data`
- `uploads_data`
