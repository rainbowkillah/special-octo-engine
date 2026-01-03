# Copilot / AI Agent Instructions — Cloudflare Workers Template

Purpose: give AI coding agents the exact, discoverable context needed to be
productive in this Cloudflare Workers monorepo template.

- Big picture
  - This is a Cloudflare Workers monorepo template with tenant-based
    environments (see `README.md`).
  - Each tenant contains three environment folders: `02dev` → `01stg` → `00prd`.
    Code is shared at the workspace level and configured per-env via
    `wrangler.{jsonc,toml}`.
  - Keep platform limits in mind; always verify current Cloudflare plan limits
    before shipping.

- Developer workflows (concrete)
  - Local dev (edge-like): `cd com-yourbrand/02dev` then
    `wrangler dev src/index.ts --test-scheduled --var ENV=dev`.
  - Edge-local testing: prefer `wrangler dev --local` when unit tests need edge
    semantics.
  - Deploy per-env: `wrangler deploy --env dev` (map to `02dev`), then promote
    to `01stg` and `00prd` in order.
  - Secrets: use `wrangler secret put <NAME> --env <env>`; never commit secrets
    to git.
  - Logs / live debugging: `wrangler tail --env prd`.

- Project-specific conventions
  - Environments are ordered and named; treat `02dev` as the primary developer
    sandbox directory.
  - Each env should have its own `wrangler.jsonc` and `CHANGELOG.md` in the env
    folder.
  - Promotion flow: `02dev` → `01stg` → `00prd` (manual deployment per env).
  - Keep `console.log` minimal; use `wrangler tail` and platform metrics for
    detailed telemetry. Avoid PII in logs.

- Testing & CI hints
  - Tests are Node unit tests; if you need to emulate edge behavior, run
    `wrangler dev --local` or use small mocks for KV/D1/R2.
  - Prefer fast, focused tests that don't assume large quotas.

- Architecture signposts (files to inspect first)
  - Monorepo entry: `README.md` — architecture and quickstart.
  - Tenant roots: `com-*/README.md` — tenant-specific details.
  - Typical dev entrypoint example: `com-{tenant}/02dev/src/index.ts`.
  - Look for per-env `wrangler.jsonc` under each env folder.

- Integration & external dependencies
  - Cloudflare account + wrangler CLI required (`npm i -g wrangler`).
  - External services are minimal — mostly managed by Cloudflare: KV, D1, R2,
    Durable Objects, Queues.
  - When adding third-party packages, prefer small dependencies to stay within
    Workers bundle size and CPU limits.

- Agent rules & safe actions
  - Do not commit secrets; recommend `wrangler secret put` instead.
  - Prioritize small, incremental edits and include local dev commands in PR
    descriptions so humans can validate on `02dev`.
  - When changing infra (wrangler.jsonc, Durable Object shards, or cron
    triggers), add a short rationale in the tenant CHANGELOG.
