# Environment Hub

Centralized dashboard for managing environment variables, secrets, and Cloudflare Worker bindings across all RainbowSmoke tenants.

## Overview

Environment Hub provides a unified interface for tracking and managing configuration across multiple tenants and environments. It synchronizes bidirectionally with a Notion database (source of truth) and stores data in Cloudflare D1 for fast querying and dashboard display.

## Features

- **Bidirectional Sync**: Notion ↔ Cloudflare D1
- **Web Dashboard**: Simple HTML/CSS/JS interface for browsing and managing configs
- **REST API**: CRUD operations for programmatic access
- **Cloudflare Access**: Enterprise-grade authentication and authorization
- **Secret Masking**: Sensitive values are masked in the UI by default
- **Scheduled Syncs**: Automatic sync from Notion at configurable intervals
- **Audit Logging**: Track all changes and sync operations

## Architecture

### Tech Stack

- **Framework**: Hono (lightweight, TypeScript-first router)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step)
- **Auth**: Cloudflare Access JWT validation
- **Source of Truth**: Notion database

### Database Schema

- **`environment_hub`** - Main table with all configuration entries
- **`environment_variables`** - View of non-sensitive configs
- **`environment_secrets`** - View of sensitive credentials (masked)
- **`environment_bindings`** - View of Cloudflare Worker bindings
- **`sync_log`** - Tracks all sync operations

## Environments

### Development (02dev)
- **Sync Frequency**: Every 15 minutes
- **Purpose**: Rapid iteration and testing
- **D1 Database**: `environmenthub-dev`
- **Worker**: `environmenthub-dev.workers.dev`

### Staging (01stg)
- **Sync Frequency**: Every hour
- **Purpose**: Pre-production validation
- **D1 Database**: `environmenthub-stg`
- **Worker**: `environmenthub-stg.workers.dev`

### Production (00prd)
- **Sync Frequency**: Every 6 hours
- **Purpose**: Stable production environment
- **D1 Database**: `environmenthub-prd`
- **Worker**: `environmenthub.workers.dev`

## Local Development

```bash
# Navigate to dev environment
cd 02dev

# Install dependencies
npm install

# Set up local secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your Notion API key and database ID

# Run locally with D1 local mode
wrangler dev src/index.ts --local --test-scheduled

# Test manual sync
curl -X POST http://localhost:8787/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}'
```

## Deployment

```bash
# Deploy to development
cd 02dev
wrangler deploy --env dev

# Promote to staging
cd ../01stg
wrangler deploy --env stg

# Promote to production
cd ../00prd
wrangler deploy --env prd
```

## Configuration

### Required Secrets

Set these via `wrangler secret put` for each environment:

```bash
wrangler secret put NOTION_API_KEY --env dev
wrangler secret put NOTION_DATABASE_ID --env dev
wrangler secret put CF_ACCESS_TEAM_NAME --env dev
wrangler secret put CF_ACCESS_AUD --env dev
```

### Environment Variables

Set in `wrangler.jsonc` for each environment:

- `ENV` - Environment name (dev, stg, prd)

### D1 Bindings

Each environment has its own D1 database bound as `DB`.

## API Endpoints

### Dashboard
- `GET /` - Dashboard homepage
- `GET /dashboard` - Main dashboard view

### API v1
- `GET /api/v1/entries` - List all entries (with filtering)
- `GET /api/v1/entries/:id` - Get single entry
- `POST /api/v1/entries` - Create new entry
- `PUT /api/v1/entries/:id` - Update entry
- `DELETE /api/v1/entries/:id` - Delete entry
- `POST /api/v1/sync` - Trigger manual sync
- `GET /api/v1/health` - Health check
- `GET /api/v1/stats` - Statistics and last sync info

### Query Parameters

**Filtering** (GET /api/v1/entries):
- `tenant` - Filter by tenant (e.g., `mrrainbowsmoke.com`)
- `environment` - Filter by environment (dev, stg, prd)
- `environmentType` - Filter by type (Variable, Secret, Token, etc.)
- `isSensitive` - Filter sensitive/non-sensitive (true/false)
- `status` - Filter by status (Active, Deprecated)
- `search` - Search in key, description, notes

**Pagination**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `sortBy` - Sort field (key, tenant, updated_at)
- `sortOrder` - Sort direction (asc, desc)

## Security

### Authentication

All routes are protected by Cloudflare Access. Users must authenticate via SSO before accessing the dashboard or API.

### Secret Handling

- Sensitive values are masked in API responses by default
- Values marked as `isSensitive=true` display as `***MASKED***`
- Full values only shown when explicitly requested (requires additional auth check)
- Never commit actual secrets to git
- Use Cloudflare Secrets for deployed environments
- Use `.dev.vars` (gitignored) for local development

### Conflict Resolution

When both Notion and D1 have changes to the same entry:
- **Notion always wins** - Notion is the source of truth
- D1 changes are overwritten during sync
- Conflicts are logged in `sync_log` table for audit purposes

## Monitoring

### View Logs

```bash
# Real-time logs
wrangler tail --env dev

# JSON format for analysis
wrangler tail --env prd --format json
```

### Sync Status

Check the dashboard at `/dashboard` or query:

```bash
curl https://environmenthub-dev.workers.dev/api/v1/stats
```

### D1 Database Access

```bash
# Query D1 directly
wrangler d1 execute environmenthub-dev --command="SELECT COUNT(*) FROM environment_hub"

# View recent syncs
wrangler d1 execute environmenthub-dev --command="SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 10"
```

## Troubleshooting

### Sync Failures

1. Check Notion API credentials: `wrangler secret list --env dev`
2. Verify Notion database ID is correct
3. Check sync logs: `SELECT * FROM sync_log WHERE status = 'failed'`
4. Review worker logs: `wrangler tail --env dev`

### Dashboard Not Loading

1. Verify Cloudflare Access is configured
2. Check that you're logged in to Cloudflare Access
3. Confirm D1 database is accessible
4. Check worker deployment status: `wrangler deployments list`

### Missing Entries

1. Trigger manual sync: `POST /api/v1/sync`
2. Check Notion database for the entry
3. Verify entry matches expected schema
4. Review sync logs for transformation errors

## Development Workflow

1. Make changes to Notion database
2. Wait for scheduled sync or trigger manual sync
3. Verify changes appear in dashboard
4. Test API endpoints
5. Make code changes if needed
6. Deploy to dev: `wrangler deploy --env dev`
7. Test thoroughly in dev
8. Promote to staging when stable
9. Final validation in staging
10. Deploy to production

## Contributing

1. Create feature branch from `main`
2. Make changes in `02dev/` environment
3. Test locally with `wrangler dev --local`
4. Update CHANGELOGs
5. Deploy to dev and test
6. Create pull request
7. After approval, promote through staging to production

## Support

For issues or questions:
- Check `.llm/docs/TROUBLESHOOTING.md`
- Review Environment Hub implementation plan
- Check worker logs and D1 query results
- Contact De Havilland Fox

## License

Internal tool for RainbowSmoke infrastructure management.
