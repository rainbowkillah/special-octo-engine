# Tenant A (Your Brand)

Cloudflare Workers tenant for your primary domain.

## Environments

- `02dev` → developer sandbox
- `01stg` → staging/preview
- `00prd` → production

Each env owns its own `wrangler.{jsonc,toml}`, secrets, and CHANGELOG entry.

Per-environment files:

- Each env folder contains a `CHANGELOG.md` and an environment file (for
  example `.env.dev`, `.env.stg`, `.env.prd`).
- Each env may also include a `wrangler.jsonc` or `wrangler.toml` and a
  tenant-level `.gitignore`.

## Stack Highlights (Optional)

- Worker Modules (ESM) fronting the site + APIs.
- KV for low-latency feature flags and request caches.
- D1 for relational data that fits plan limits.
- R2 for media/static with zero egress to Workers.
- Durable Objects for ordered state when needed.
- Cron Triggers, Queues, and Email Routing for scheduled or async work.

## Dev Quickstart

```bash
cd com-yourbrand/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev
wrangler deploy --env dev   # promote later to stg/prd
```

## Contribution Checklist

- Add/update tests; prefer edge-mocking with `wrangler dev --local`.
- Update `CHANGELOG.md` in this tenant root and relevant env subdir.
- Keep secrets out of git; use `wrangler secret put`.

## Support Links

- Production: <https://yourdomain.com>
- Monitoring: `wrangler tail --env prd`
- Docs: see monorepo `README.md` for shared conventions.
