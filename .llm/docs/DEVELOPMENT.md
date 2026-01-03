# Development Guide

## Local Development Setup

### Prerequisites

- Node.js (latest LTS recommended)
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account (for deployment)

### Environment Setup

Each tenant has three environments with directory-based configuration:

```
com-{tenant}/
├── 02dev/   # Development environment
├── 01stg/   # Staging environment
└── 00prd/   # Production environment
```

### Running Locally

Navigate to a tenant's dev environment and start the local server:

```bash
cd com-mrrainbowsmoke/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev --local
```

**Flags explained:**
- `--test-scheduled` - Enables manual triggering of cron/scheduled handlers
- `--var ENV=dev` - Sets environment variable for the worker
- `--local` - Runs KV, D1, Durable Objects locally without Cloudflare API calls

### Secrets Management

**Never commit secrets to git.** Use these approaches:

#### Local Development
Create a `.dev.vars` file in the environment directory (gitignored):

```bash
cd com-mrrainbowsmoke/02dev
cat > .dev.vars <<EOF
API_KEY=your-local-api-key
SECRET_TOKEN=your-local-secret
