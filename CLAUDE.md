# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Repository Overview

This is a Cloudflare Workers monorepo template with tenant-based environment
folders. Each tenant has three environment directories promoting in order:
`02dev` → `01stg` → `00prd`.

Current tenants:
- `com-mrrainbowsmoke` — primary tenant
- `com-rainbowsmokeofficial` — secondary tenant
- `com-ai` — third tenant

The naming pattern `com-{tenant}` follows domain-style conventions.

## Key Architecture Principles

### Environment Structure

- Environments are **not** git branches—they are directory-based.
- Each env folder (`02dev/`, `01stg/`, `00prd/`) contains its own
  `wrangler.jsonc`, `.env.*`, and `CHANGELOG.md`.
- Code is shared at workspace level; configuration is per-environment.
- **Always work from inside the env directory** when running wrangler commands.
- The typical entry point for a worker is `com-{tenant}/{env}/src/index.ts`.

### Promotion Flow

Deploy sequence is strictly `02dev` → `01stg` → `00prd`. Never skip
environments or deploy directly to production.

### Cloudflare Plan Constraints

This template targets the Cloudflare Free/Dev plans by default. Always verify
current platform limits before shipping.

## Common Commands

All commands must be run from within a tenant environment directory (e.g.,
`cd com-mrrainbowsmoke/02dev`).

### Local Development

```bash
cd com-mrrainbowsmoke/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev --local
```

Flags:

- `--test-scheduled` — Allows manual triggering of cron handlers.
- `--var ENV=dev` — Sets environment variable.
- `--local` — Runs KV, D1, Durable Objects locally without hitting Cloudflare.

### Deployment

```bash
# Deploy to dev
cd com-mrrainbowsmoke/02dev
wrangler deploy --env dev

# Promote to staging
cd ../01stg
wrangler deploy --env stg

# Promote to production
cd ../00prd
wrangler deploy --env prd
```

### Logging and Debugging

```bash
# Stream real-time logs from deployed environment
wrangler tail --env dev   # or stg/prd

# JSON format for analysis
wrangler tail --env prd --format json
```

### Secrets Management

```bash
# Set secrets (never commit secrets to git)
wrangler secret put SECRET_NAME --env dev
wrangler secret put SECRET_NAME --env stg
wrangler secret put SECRET_NAME --env prd

# List secrets
wrangler secret list --env dev
```

### Full Deployment Workflow (one tenant, all envs)

```bash
cd com-mrrainbowsmoke/02dev && wrangler deploy --env dev
cd ../01stg && wrangler deploy --env stg
cd ../00prd && wrangler deploy --env prd
```

## Working with Code

### Entry Points

- Typical Worker entry: `com-{tenant}/{env}/src/index.ts`.
- When adding code, place it under the env's `src/` directory.

### Testing

- No test runner is currently configured.
- For edge-like testing, use `wrangler dev --local`.
- Manually test with `wrangler dev` before deploying.

### Wrangler Configuration

- This repository uses `wrangler.jsonc` (JSON with comments) as the preferred
  configuration format. Avoid using `wrangler.toml` unless there's a specific
  reason to do so.
- Each env has its own `wrangler.jsonc` file with environment-specific settings.
- Configuration is per-environment, not per-branch.
- Use `wrangler.jsonc` to configure routes, KV namespaces, D1 bindings, Durable
  Objects, cron triggers, etc.

## Important File Locations

### Documentation

- `README.md` — Monorepo overview and quickstart
- `.github/copilot-instructions.md` — Agent rules and conventions
- `AGENTS.md` — Repository guidelines for build/test/deploy commands
- `cf.code-workspace` — VS Code workspace configuration
- `.llm/README.md` — LLM/agent context directory overview
- `.llm/docs/DEVELOPMENT.md` — Local dev setup, secrets, debugging
- `.llm/docs/DEPLOYMENTS.md` — Promotion workflow with checklists
- `.llm/docs/TROUBLESHOOTING.md` — Common issues and solutions

### Environment-Specific Prompts

The `.llm/` directory contains environment-specific prompts that tailor guidance
based on context. These prompts inherit repository rules from `AGENTS.md` and
`.github/copilot-instructions.md`:

- `.llm/02dev/prompt.txt` — Dev environment guidance (rapid iteration)
- `.llm/01stg/prompt.txt` — Staging environment guidance (pre-prod validation)
- `.llm/00prd/prompt.txt` — Production environment guidance (stability focus)

### Planning and Incidents

- `.llm/plans/UPDATES.md` — WIP experiments and improvements
- `.llm/plans/INCIDENTS.md` — Production incidents and postmortems
- `.llm/plans/RESEARCH.md` — Investigation notes and design docs

## Security and Secrets

- **Never commit secrets to git**.
- Use `wrangler secret put` for deployed environments.
- Use `.dev.vars` (git-ignored) for local development.
- The `.llm/` directory contains agent prompts and planning docs—sanitize these
  files before committing to strip PII, tokens, or sensitive context.
- Keep `.llm/docs/mcp.json` free of actual tokens (use placeholders only).
