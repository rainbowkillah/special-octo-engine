# Environment Hub

Centralized dashboard for managing environment variables, secrets, and Cloudflare Worker bindings across all RainbowSmoke tenants.

## Overview

Environment Hub provides a unified interface for tracking and managing configuration across multiple tenants and environments. It uses Cloudflare D1 as the primary datastore with a web-based management UI for creating, editing, and viewing environment configurations.

## Status

- **Phase 1 Complete** ✅: Infrastructure (D1, KV, schema, wrangler config)
- **Phase 2 Complete** ✅: Worker implementation (types, database clients, API, dashboard)
- **Phase 2.5 Complete** ✅: Staging deployed and validated
- **Phase 2.7 Complete** ✅: Refactored to D1-primary architecture with CRUD UI

**Current State:** Staging validated, production ready (awaiting deployment)

## Features

- **D1 Primary Storage**: Cloudflare D1 as single source of truth
- **Web Dashboard**: Full CRUD interface with Add/Edit/Delete forms
- **REST API**: Complete CRUD operations with filtering and search
- **Cloudflare Access**: JWT verification with dev bypass header for local runs
- **Secret Masking**: Sensitive values automatically masked in UI
- **Filtering & Search**: Filter by tenant, type, sensitivity; full-text search
- **Audit Trail**: Timestamps track creation and updates

## Architecture

### Tech Stack

- **Framework**: Hono 4.6.14 (lightweight, TypeScript-first router)
- **Database**: Cloudflare D1 (SQLite) - Primary datastore
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step)
- **Auth**: Cloudflare Access JWT validation
- **Cache**: KV Namespaces for JWKS caching

### Database Schema

- **`environment_hub`** - Main table with all configuration entries
  - Core fields: key, value, tenant, environment_type, description
  - Boolean flags: is_sensitive, required
  - Status tracking: status, created_at, updated_at
- **`environment_variables`** - View of non-sensitive configs
- **`environment_secrets`** - View of sensitive credentials (masked)
- **`environment_bindings`** - View of Cloudflare Worker bindings

## Environments

### Development (02dev)
- **Purpose**: Rapid iteration and testing
- **D1 Database**: `environmenthub-dev`
- **Worker**: `environmenthub-dev.workers.dev`

### Staging (01stg)
- **Purpose**: Pre-production validation
- **D1 Database**: `environmenthub-stg`
- **Worker**: `environmenthub-stg.mrrainbowsmoke.workers.dev`
- **Status**: Deployed and validated ✅

### Production (00prd)
- **Purpose**: Stable production environment
- **D1 Database**: `environmenthub-prd`
- **Worker**: `environmenthub.workers.dev`
- **Status**: Ready for deployment

## Local Development

```bash
# Navigate to dev environment
cd 02dev

# Install dependencies (if needed)
npm install

# Set up local secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your Access credentials

# Run locally with D1 local mode
wrangler dev src/index.ts --local --var ENV=dev

# Access dashboard (with dev bypass)
curl -H "x-dev-bypass: true" http://localhost:8787/

# Test API endpoints
curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/entries
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
# Access authentication (required for all environments)
wrangler secret put CF_ACCESS_TEAM_NAME --env dev
wrangler secret put CF_ACCESS_AUD --env dev
```

### Environment Variables

Set in `wrangler.jsonc` for each environment:

- `ENV` - Environment name (dev, stg, prd)

### D1 Bindings

Each environment has its own D1 database bound as `DB`:
- **dev**: `14bf17c9-c510-4ed7-80f7-6c002eb68e0f`
- **stg**: `1da3307c-452a-4f30-a7ea-f4d9359a0af5`
- **prd**: `5567ec3e-7a65-448b-9fc7-7d74670101c5`

## API Endpoints

### Dashboard
- `GET /` - Dashboard with full CRUD interface

### API v1
- `GET /api/v1/entries` - List all entries (with filtering)
- `GET /api/v1/entries/:id` - Get single entry by ID
- `POST /api/v1/entries` - Create new entry
- `PUT /api/v1/entries/:id` - Update entry
- `DELETE /api/v1/entries/:id` - Delete entry
- `GET /api/v1/health` - Health check
- `GET /api/v1/stats` - Database statistics

### Query Parameters

**Filtering** (GET /api/v1/entries):
- `tenant` - Filter by tenant (e.g., `mrrainbowsmoke.com`)
- `environment` - Filter by environment (dev, stg, prd)
- `environmentType` - Filter by type (Variable, Secret, Token, API Key, etc.)
- `isSensitive` - Filter sensitive/non-sensitive (true/false)
- `status` - Filter by status (active, deprecated)
- `search` - Full-text search in key, description, notes
- `limit` - Items per page (default: 50)
- `offset` - Offset for pagination (default: 0)

## Security

### Authentication

All routes are protected by Cloudflare Access. Users must authenticate via SSO. For local development, use the `x-dev-bypass: true` header to skip authentication.

### Secret Handling

- Sensitive values are automatically masked in API responses and dashboard
- Values marked as `is_sensitive=true` display as `***MASKED***`
- Never commit actual secrets to git
- Use Cloudflare Secrets (`wrangler secret put`) for deployed environments
- Use `.dev.vars` (gitignored) for local development

## Dashboard Usage

### Creating Entries

1. Click the green **"+ Add Entry"** button
2. Fill in required fields:
   - **Key**: Variable/secret name (e.g., `DATABASE_URL`)
   - **Tenant**: Owner domain (e.g., `mrrainbowsmoke.com`)
3. Optional fields:
   - **Value**: The actual value/secret
   - **Environment Type**: Variable, Secret, Token, API Key, etc.
   - **Description**: What this config is for
   - **Sensitive**: Check to mask the value
4. Click **Save**

### Editing Entries

1. Click **Edit** button in the Actions column
2. Modify fields as needed
3. Click **Save**

### Deleting Entries

1. Click **Delete** button in the Actions column
2. Confirm deletion

### Filtering

Use the filter dropdowns and search box to narrow down entries:
- **Search**: Searches key, description, and notes
- **Tenant**: Filter by specific tenant
- **Environment Type**: Filter by config type

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

### Dashboard Not Loading

1. Verify Cloudflare Access is configured and you're logged in
2. Check D1 database is accessible
3. Check worker deployment status: `wrangler deployments list`
4. Review logs: `wrangler tail --env dev`

### API Errors

1. Verify required fields (key, tenant) are provided
2. Check request is authenticated (JWT or bypass header)
3. Review worker logs for detailed error messages
4. Confirm D1 database schema is up to date

### Missing Entries

1. Check filters aren't hiding entries
2. Query D1 directly: `wrangler d1 execute DB --command="SELECT COUNT(*) FROM environment_hub"`
3. Verify entries were created successfully

## Development Workflow

1. Make code changes in `02dev/src/`
2. Test locally: `wrangler dev src/index.ts --local --var ENV=dev`
3. Test in browser with bypass header
4. Deploy to dev: `wrangler deploy --env dev`
5. Validate in dev environment
6. Copy changes to staging: `rsync -av 02dev/src/ 01stg/src/`
7. Deploy to staging: `cd 01stg && wrangler deploy --env stg`
8. Final validation in staging
9. Copy to production: `rsync -av 01stg/src/ 00prd/src/`
10. Deploy to production when approved

## Contributing

1. Create feature branch from `environmenthub`
2. Make changes in `02dev/` environment first
3. Test locally and in dev environment
4. Update CHANGELOGs in relevant environment folders
5. Create pull request with testing notes
6. After approval, promote through staging to production

## Architecture Notes

### Why D1-Primary?

Originally designed with Notion sync, the system was refactored to use D1 as the primary datastore because:
- Simpler architecture without external dependencies
- Full control over data structure and queries
- Better performance (no external API calls)
- Native integration with Cloudflare Workers
- Rich web UI for direct management

### Future Enhancements

Potential improvements:
- Export/import functionality (JSON, CSV)
- Bulk operations (multi-select delete, bulk edit)
- History tracking and audit logs
- API key authentication for programmatic access
- Webhook notifications on changes
- Integration with external secret managers (if needed)

## Support

For issues or questions:
- Review this README and deployment guides
- Check worker logs: `wrangler tail --env <env>`
- Query D1 directly for data verification
- Contact: De Havilland Fox

## License

Internal tool for RainbowSmoke infrastructure management.
