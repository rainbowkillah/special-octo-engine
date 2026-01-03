# Changelog

All notable changes to this monorepo template will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Environment Hub - Phase 2 Complete**: Worker implementation across dev/stg/prd.
  - Types for Env, Notion payloads, D1 records, and API contracts
  - Notion client + transformer, D1 client with CRUD/filtering, sync engines (Notion → D1, D1 → Notion)
  - Cloudflare Access middleware with JWT verification, API routes, dashboard HTML/JS, worker entrypoint with scheduled sync
  - Source synced to all environments for promotion
- **Environment Hub - Phase 1 Complete** ✅: Infrastructure for centralized environment variable, secret, and binding management.
  - **D1 Databases**: Created and migrated for dev, staging, and production environments
    - Schema: `environment_hub` table (20+ fields), `sync_log` table, 3 views
    - Dev: `14bf17c9-c510-4ed7-80f7-6c002eb68e0f`
    - Staging: `1da3307c-452a-4f30-a7ea-f4d9359a0af5`
    - Production: `5567ec3e-7a65-448b-9fc7-7d74670101c5`
  - **KV Namespaces**: Created for caching layer in all environments
  - **Configuration**: wrangler.jsonc files with D1/KV bindings, cron schedules
  - **Dependencies**: Hono 4.6.14, Wrangler 4.54.0, TypeScript 5.7.2
  - **Documentation**: README, SETUP.md, QUICK_START.md, INFRASTRUCTURE_STATUS.md
  - **Next**: Phase 2 - Worker implementation (types, Notion client, sync engine)

### Changed
- Updated repository documentation for accuracy and consistency.
- Clarified tenant naming conventions in root README.
- Added `app-environmenthub` to tenant list and project structure diagram.
- Updated `.gitignore` to exclude Notion export directories.
- Enhanced README with Phase 1 completion status.

## [0.1.0] — 2026-01-03

### Added
- Established multi-tenant, multi-environment repo structure.
- Three tenants: `com-mrrainbowsmoke`, `com-rainbowsmokeofficial`, `com-ai`.
- Environment folders (`02dev`, `01stg`, `00prd`) per tenant.
- Baseline documentation, agent guidance, and planning templates.
- LLM/agent context directory (`.llm/`) with environment-specific prompts.
- VSCode workspace configuration (`cf.code-workspace`).

### Security
- Removed embedded secrets from MCP configuration files.
