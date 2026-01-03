# 00prd Environment — Production (Template)

## Purpose

Live, customer-facing environment. Changes here affect real users and data.
Only promote changes after successful dev and staging validation.

## Key Commands

- Deploy to production: `wrangler deploy --env prd`
- Live logs: `wrangler tail --env prd`
- Set secrets: `wrangler secret put <NAME> --env prd`
- Monitoring: Cloudflare Analytics + `wrangler tail`
- Rollback: redeploy previous commit if needed

## Production Priorities

1. **Stability first** — Only promote code tested in dev and staging.
2. **Minimal changes** — Avoid large refactors in production deploys.
3. **Observability** — Keep logs/metrics visible during and after deploys.
4. **Data integrity** — Plan and test any schema migrations.
5. **Performance** — Monitor CPU time, latency, and error rates.

## Deployment Checklist

- [ ] Code validated in dev and staging.
- [ ] Tests passing.
- [ ] CHANGELOG.md updated with version and changes.
- [ ] Production secrets set.
- [ ] Data migrations tested and planned.
- [ ] Rollback plan documented.
- [ ] Team notified of deployment timing.
- [ ] `wrangler tail` running during and after deploy.

## Workflow

1. Deploy to production: `wrangler deploy --env prd`.
2. Monitor `wrangler tail --env prd` for errors.
3. Verify customer-facing URLs and key endpoints.
4. If critical issues: revert to previous deploy and document incident.

## Tenant Paths

- Tenant A: `com-yourbrand/00prd/`
- Tenant B: `com-yourotherbrand/00prd/`

## Guidelines

- No hot-fixes in production; always flow dev→stg→prd.
- Rotate production secrets regularly.
- Document incidents in `.llm/plans/INCIDENTS.md`.

See also: `.llm/docs/DEPLOYMENTS.md` and `.llm/docs/TROUBLESHOOTING.md`.
