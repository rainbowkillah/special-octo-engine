# Cloudflare Workers Monorepo Template

A multi-tenant, multi-environment template for Cloudflare Workers. Use this repo
as a starting point for teams that want consistent dev → staging → production
flows, per-environment configuration, and clear documentation.

## What This Template Includes

- Two sample tenants (rename to your own domains/orgs).
- Three-tier environment folders per tenant: `02dev` → `01stg` → `00prd`.
- Per-environment configuration and CHANGELOGs.
- LLM/agent prompts and planning docs under `.llm/`.
- Copilot/agent instructions under `.github/`.

## Tenants

- `com-mrrainbowsmoke` → primary tenant
- `com-rainbowsmokeofficial` → secondary tenant
- `com-ai` → third tenant

To remove a tenant, delete its directory and update references in:
`README.md`, `CHANGELOG.md`, `.github/copilot-instructions.md`, and `.llm/`.

## Project Structure

```text
cf/
├─ README.md                # This file
├─ CHANGELOG.md             # Monorepo-wide history
├─ AGENTS.md                # Repo conventions for agents/tools
├─ CLAUDE.md                # Claude-specific instructions (optional)
├─ .github/
│  └─ copilot-instructions.md
├─ .llm/                    # Agent prompts, docs, and plans
├─ com-mrrainbowsmoke       # Tenant A
│  ├─ 00prd/
│  │  └─ CHANGELOG.md
│  ├─ 01stg/
│  │  └─ CHANGELOG.md
│  ├─ 02dev/
│  │  └─ CHANGELOG.md
│  ├─ README.md
│  └─ CHANGELOG.md
├─ com-rainbowsmokeofficial # Tenant B
│  ├─ 00prd/
│  │  └─ CHANGELOG.md
│  ├─ 01stg/
│  │  └─ CHANGELOG.md
│  ├─ 02dev/
│  │  └─ CHANGELOG.md
│  ├─ README.md
│  └─ CHANGELOG.md
└─ com-ai                   # Tenant C
   ├─ 00prd/
   │  └─ CHANGELOG.md
   ├─ 01stg/
   │  └─ CHANGELOG.md
   ├─ 02dev/
   │  └─ CHANGELOG.md
   ├─ README.md
   └─ CHANGELOG.md
```

## Environment Conventions

- Promotion order: `02dev` → `01stg` → `00prd`.
- Run `wrangler` commands from the target env directory.
- Each env owns its own `wrangler.{jsonc,toml}`, secrets, and `CHANGELOG.md`.

## Dev Quickstart

```bash
# Pick a tenant + env
cd com-mrrainbowsmoke/02dev

# Local dev (edge-like)
wrangler dev src/index.ts --test-scheduled --var ENV=dev --local

# Deploy dev
wrangler deploy --env dev
```

## Template Setup Checklist

1. Rename tenant directories to match your org/domain(s).
2. Update tenant READMEs and URLs.
3. Add `wrangler.jsonc` per environment with correct routes/bindings.
4. Set secrets via `wrangler secret put` (never commit secrets).
5. Update `.llm/` prompts and docs for your team.
6. Start logging changes in tenant and env CHANGELOGs.

## Security Notes

- Keep secrets out of git; use `wrangler secret put` and `.dev.vars`.
- Scrub PII from `.llm/` plans before committing.
- Remove or replace any sample tokens in MCP config files.

## Releasing

1. Update the relevant tenant CHANGELOG(s).
2. Deploy in order: dev → stg → prd.
3. Monitor logs via `wrangler tail`.
