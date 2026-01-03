# Environment Hub Setup Guide

This guide walks you through setting up the Environment Hub from scratch.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers access
- Notion integration with API access to Environment Hub database
- Access to this repository

## Step 1: Install Dependencies

```bash
cd app-environmenthub
npm install
```

## Step 2: Authenticate with Cloudflare

### Option A: Interactive Login (Recommended for local development)

```bash
npx wrangler login
```

This will open a browser window for OAuth authentication.

### Option B: API Token (Recommended for CI/CD)

1. Go to https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. Create an API token with the following permissions:
   - Account > D1 > Edit
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
3. Set the environment variable:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.):

```bash
echo 'export CLOUDFLARE_API_TOKEN=your_token_here' >> ~/.bashrc
source ~/.bashrc
```

## Step 3: Create D1 Databases

Create a D1 database for each environment:

```bash
# Development
cd 02dev
npx wrangler d1 create environmenthub-dev

# Staging
cd ../01stg
npx wrangler d1 create environmenthub-stg

# Production
cd ../00prd
npx wrangler d1 create environmenthub-prd
```

**IMPORTANT**: Save the database IDs from the output! You'll need them in the next step.

Example output:
```
✅ Successfully created DB 'environmenthub-dev' in region WNAM
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "environmenthub-dev"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 4: Update wrangler.jsonc Files

Update the `database_id` in each environment's `wrangler.jsonc`:

**02dev/wrangler.jsonc:**
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "environmenthub-dev",
    "database_id": "YOUR_DEV_DATABASE_ID_HERE"
  }
]
```

**01stg/wrangler.jsonc:**
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "environmenthub-stg",
    "database_id": "YOUR_STG_DATABASE_ID_HERE"
  }
]
```

**00prd/wrangler.jsonc:**
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "environmenthub-prd",
    "database_id": "YOUR_PRD_DATABASE_ID_HERE"
  }
]
```

## Step 5: Create KV Namespaces (Optional but Recommended)

Create KV namespaces for caching:

```bash
# Development
npx wrangler kv:namespace create CACHE --env dev
npx wrangler kv:namespace create CACHE --preview --env dev

# Staging
npx wrangler kv:namespace create CACHE --env stg
npx wrangler kv:namespace create CACHE --preview --env stg

# Production
npx wrangler kv:namespace create CACHE --env prd
npx wrangler kv:namespace create CACHE --preview --env prd
```

Update the KV namespace IDs in each `wrangler.jsonc` file.

## Step 6: Run Database Migrations

Initialize the database schema for each environment:

```bash
# Development (local)
cd 02dev
npx wrangler d1 execute DB --file=./src/schema/d1/init.sql --local

# Development (remote)
npx wrangler d1 execute DB --file=./src/schema/d1/init.sql --remote

# Staging
cd ../01stg
npx wrangler d1 execute DB --file=./src/schema/d1/init.sql --remote

# Production
cd ../00prd
npx wrangler d1 execute DB --file=./src/schema/d1/init.sql --remote
```

**Note**: The schema file is in `02dev/src/schema/d1/init.sql` but can be used for all environments.

## Step 7: Set Up Secrets

### Get Notion API Credentials

1. Go to https://www.notion.so/my-integrations
2. Create a new integration or use existing one
3. Copy the "Internal Integration Token" (starts with `secret_`)
4. Get your Notion database ID from the database URL:
   - URL format: `https://notion.so/workspace/DATABASE_ID?v=...`
   - The DATABASE_ID is the 32-character string after the workspace name

### Set Cloudflare Secrets

Set the required secrets for each environment:

```bash
# Development
cd 02dev
npx wrangler secret put NOTION_API_KEY --env dev
# Paste your Notion API key when prompted

npx wrangler secret put NOTION_DATABASE_ID --env dev
# Paste your Notion database ID when prompted

# Repeat for staging and production
cd ../01stg
npx wrangler secret put NOTION_API_KEY --env stg
npx wrangler secret put NOTION_DATABASE_ID --env stg

cd ../00prd
npx wrangler secret put NOTION_API_KEY --env prd
npx wrangler secret put NOTION_DATABASE_ID --env prd
```

### Cloudflare Access (Optional for Dev)

If using Cloudflare Access authentication:

```bash
npx wrangler secret put CF_ACCESS_TEAM_NAME --env dev
npx wrangler secret put CF_ACCESS_AUD --env dev

# Repeat for stg and prd
```

### Local Development Secrets

For local development, create a `.dev.vars` file:

```bash
cd 02dev
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your actual values:

```env
NOTION_API_KEY=secret_YOUR_ACTUAL_KEY_HERE
NOTION_DATABASE_ID=YOUR_ACTUAL_DATABASE_ID_HERE
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-access-aud-tag
```

**IMPORTANT**: Never commit `.dev.vars` to git! It's already in `.gitignore`.

## Step 8: Import Existing Data (Optional)

If you have existing data in your Notion database, you can trigger an initial sync:

```bash
# After deploying (see Step 10)
curl -X POST https://environmenthub-dev.workers.dev/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}'
```

## Step 9: Test Locally

Start the local development server:

```bash
cd 02dev
npm run dev

# Or directly:
npx wrangler dev src/index.ts --local --test-scheduled
```

Visit http://localhost:8787 to see the dashboard.

## Step 10: Deploy

Deploy to each environment in order:

```bash
# Development
cd 02dev
npx wrangler deploy --env dev

# Test in dev, then promote to staging
cd ../01stg
npx wrangler deploy --env stg

# Test in staging, then promote to production
cd ../00prd
npx wrangler deploy --env prd
```

## Step 11: Verify Deployment

Check that everything is working:

```bash
# View logs
npx wrangler tail --env dev

# Check health endpoint
curl https://environmenthub-dev.workers.dev/health

# Check API
curl https://environmenthub-dev.workers.dev/api/v1/entries
```

## Troubleshooting

### Authentication Issues

If you see "You are not authenticated":

```bash
npx wrangler login
# or
npx wrangler whoami
```

### Database Not Found

If migrations fail with "database not found":

1. Verify the database was created: `npx wrangler d1 list`
2. Check the database_id in wrangler.jsonc matches the created database
3. Try creating the database again if it's missing

### Notion API Errors

If sync fails with Notion API errors:

1. Verify your Notion integration has access to the database
2. Check that the database ID is correct
3. Ensure the API key is valid and not expired
4. Verify the integration has read/write permissions

### CORS Errors

If the dashboard shows CORS errors:

1. Check that Cloudflare Access is properly configured
2. Verify the worker is deployed and accessible
3. Check browser console for specific CORS error messages

## Next Steps

Once deployed:

1. Access the dashboard at your worker URL
2. Verify Notion sync is working (check sync logs)
3. Test CRUD operations on configuration entries
4. Set up Cloudflare Access policies for production
5. Monitor scheduled sync operations

## Support

For detailed troubleshooting, see:
- `/app-environmenthub/README.md` - Architecture and API docs
- `/.llm/docs/TROUBLESHOOTING.md` - Common issues
- Implementation plan at `/.claude/plans/greedy-prancing-lemur.md`
