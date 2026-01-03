# com-rainbowsmokeofficial

Cloudflare Workers tenant for the secondary domain.

## Environments

- `02dev` → developer sandbox
- `01stg` → staging/preview
- `00prd` → production

Each env owns its own `wrangler.jsonc`, secrets, and `CHANGELOG.md`.

## Stack Highlights (Optional)

- Worker Modules (ESM) for site and API edge handlers.
- KV for feature flags/session hints; D1 for light relational data.
- R2 for assets/media with free egress to Workers.
- Durable Objects for ordered state (chats, counters, locks).
- Cron Triggers and Queues for scheduled or async work.

## Dev Quickstart

```bash
cd com-rainbowsmokeofficial/02dev
wrangler dev src/index.ts --test-scheduled --var ENV=dev --local
wrangler deploy --env dev   # promote to stg/prd when ready
```

## Contribution Checklist

- Add/update tests; leverage `wrangler dev --local` for edge-like runs.
- Update `CHANGELOG.md` in this tenant root and any touched env folder.
- Keep secrets in Cloudflare via `wrangler secret put`.

## Support Links

- Production: TBD (configure in `wrangler.jsonc`)
- Monitoring: `wrangler tail --env prd`
- Docs: See monorepo [README.md](../README.md) for shared conventions.
