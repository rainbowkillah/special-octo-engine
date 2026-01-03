# com-mrrainbowsmoke

Cloudflare Workers tenant for the primary domain.

## Environments

- `02dev` → developer sandbox
- `01stg` → staging/preview
- `00prd` → production

Each env owns its own `wrangler.jsonc`, secrets, and `CHANGELOG.md`.

## Stack Highlights (Optional)

- Worker Modules (ESM) fronting the site + APIs.
- KV for low-latency feature flags and request caches.
- D1 for relational data that fits plan limits.
- R2 for media/static with zero egress to Workers.
- Durable Objects for ordered state when needed.
- Cron Triggers, Queues, and Email Routing for scheduled or async work.

## Dev Quickstart

```bash
cd com-mrrainbowsmoke/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev --local
wrangler deploy --env dev   # promote later to stg/prd
```

## Contribution Checklist

- Add/update tests; prefer edge-mocking with `wrangler dev --local`.
- Update `CHANGELOG.md` in this tenant root and relevant env subdir.
- Keep secrets out of git; use `wrangler secret put`.

## Support Links

- Production: TBD (configure in `wrangler.jsonc`)
- Monitoring: `wrangler tail --env prd`
- Docs: See monorepo [README.md](../README.md) for shared conventions.
