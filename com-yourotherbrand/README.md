# Tenant B (Your Other Brand)

Cloudflare Workers tenant for your secondary domain.

## Environments

- `02dev` → developer sandbox
- `01stg` → staging/preview
- `00prd` → production

Each env keeps its own `wrangler.{jsonc,toml}`, secrets, and CHANGELOG entries.

Per-environment files:

- Each env folder contains a `CHANGELOG.md` and an environment file (for
  example `.env.dev`, `.env.stg`, `.env.prd`).
- Each env may also include a `wrangler.jsonc` or `wrangler.toml` and a
  tenant-level `.gitignore`.

## Stack Highlights (Optional)

- Worker Modules (ESM) for site and API edge handlers.
- KV for feature flags/session hints; D1 for light relational data.
- R2 for assets/media with free egress to Workers.
- Durable Objects for ordered state (chats, counters, locks).
- Cron Triggers and Queues for scheduled or async work.

## Dev Quickstart

```bash
cd com-yourotherbrand/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev
wrangler deploy --env dev   # promote to stg/prd when ready
```

## Contribution Checklist

- Add/update tests; leverage `wrangler dev --local` for edge-like runs.
- Update `CHANGELOG.md` in this tenant root and any touched env folder.
- Keep secrets in Cloudflare via `wrangler secret put`.

## Support Links

- Production: <https://otherdomain.com>
- Monitoring: `wrangler tail --env prd`
- Shared practices live in repo `README.md`.
