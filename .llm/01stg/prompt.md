# 01stg Environment — Staging / Preview (Template)

## Purpose

Pre-production validation layer. Code approved in dev gets deployed here for
final testing, performance checks, and sign-off before production release.

## Key Commands

- Deploy to staging: `wrangler deploy --env stg`
- Live logs: `wrangler tail --env stg`
- Set secrets: `wrangler secret put <NAME> --env stg`
- Staging URLs: check `wrangler.jsonc` for route mappings

## Staging Priorities

1. **Mirror production setup** — Use the same services as production.
2. **Full validation** — Run integration tests and manual smoke checks.
3. **Performance checks** — Monitor CPU time, latency, and error rates.
4. **Security audit** — Ensure no PII leaks or mis-scoped secrets.

## Deployment Checklist

- [ ] Changes reviewed and approved.
- [ ] Tests pass locally and on dev.
- [ ] CHANGELOG.md updated with user-visible changes.
- [ ] Secrets configured in staging.
- [ ] Manual smoke tests on staging URLs.
- [ ] Performance metrics reviewed.
- [ ] No console errors in `wrangler tail`.

## Workflow

1. Deploy from main to staging: `wrangler deploy --env stg`.
2. Run integration tests against staging APIs.
3. Manual testing on staging URLs.
4. If issues found, fix on dev, re-test, then re-deploy stg.
5. Once validated, request promotion to production.

## Tenant Paths

- Tenant A: `com-yourbrand/01stg/`
- Tenant B: `com-yourotherbrand/01stg/`

## Guidelines

- No direct changes in staging; always flow dev→stg→prd.
- Keep staging data isolated from production.
- Document staging-only workarounds in the stg CHANGELOG.

See also: `.llm/docs/DEPLOYMENTS.md`.
