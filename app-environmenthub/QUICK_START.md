# Environment Hub Quick Start

Fast-track guide for developers who already have everything set up.

## Prerequisites Met

- ✅ Cloudflare authenticated (`wrangler whoami`)
- ✅ D1 databases created
- ✅ Database IDs added to `wrangler.jsonc` files
- ✅ Secrets configured (Notion API key, database ID)
- ✅ Dependencies installed (`npm install`)

## Common Operations

### Local Development

```bash
cd app-environmenthub
npm run dev
```

Visit http://localhost:8787

### Deploy

```bash
# Deploy to dev
npm run deploy:dev

# Deploy to staging
npm run deploy:stg

# Deploy to production
npm run deploy:prd
```

### View Logs

```bash
# Development logs
npm run tail:dev

# Staging logs
npm run tail:stg

# Production logs
npm run tail:prd
```

### Manual Sync

Trigger a manual sync from Notion to D1:

```bash
curl -X POST https://environmenthub-dev.workers.dev/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}'
```

### Database Operations

```bash
# Query D1 database
cd 02dev
npx wrangler d1 execute DB --command="SELECT COUNT(*) FROM environment_hub" --local

# View sync history
npx wrangler d1 execute DB --command="SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5" --remote

# Export data
npx wrangler d1 execute DB --command="SELECT * FROM environment_hub" --remote --json > backup.json
```

### Check Status

```bash
# Health check
curl https://environmenthub-dev.workers.dev/health

# Get statistics
curl https://environmenthub-dev.workers.dev/api/v1/stats

# List entries
curl https://environmenthub-dev.workers.dev/api/v1/entries?tenant=mrrainbowsmoke.com
```

## Project Structure

```
app-environmenthub/
├── 02dev/           # Development environment
│   ├── src/         # Worker source code (shared by all envs)
│   └── wrangler.jsonc
├── 01stg/           # Staging environment
│   └── wrangler.jsonc
├── 00prd/           # Production environment
│   └── wrangler.jsonc
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## API Endpoints

- `GET /` - Dashboard
- `GET /health` - Health check
- `GET /api/v1/entries` - List entries
- `POST /api/v1/entries` - Create entry
- `PUT /api/v1/entries/:id` - Update entry
- `DELETE /api/v1/entries/:id` - Delete entry
- `POST /api/v1/sync` - Trigger sync

## Environment Variables

Set in `wrangler.jsonc`:
- `ENV` - Environment name (dev/stg/prd)

## Secrets (via `wrangler secret put`)

Required:
- `NOTION_API_KEY` - Notion integration token
- `NOTION_DATABASE_ID` - Notion database ID

Optional (for Cloudflare Access):
- `CF_ACCESS_TEAM_NAME` - Team name
- `CF_ACCESS_AUD` - Audience tag

## Sync Schedule

- **Dev**: Every 15 minutes
- **Staging**: Every hour
- **Production**: Every 6 hours

## Need Full Setup?

See [SETUP.md](./SETUP.md) for complete setup instructions.

## Troubleshooting

**Worker not deploying?**
- Check `wrangler whoami` for authentication
- Verify database IDs in `wrangler.jsonc`
- Check secrets are set: `wrangler secret list --env dev`

**Sync failing?**
- Verify Notion API credentials
- Check Notion integration has database access
- Review logs: `npm run tail:dev`

**Dashboard not loading?**
- Check worker is deployed: `wrangler deployments list`
- Verify D1 database is accessible
- Check browser console for errors
