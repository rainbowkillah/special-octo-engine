# Deployment Guide

## Promotion Workflow

Deployments follow a strict promotion order:

```
02dev → 01stg → 00prd
```

**Never skip environments or deploy directly to production.**

## Standard Deployment Process

### 1. Deploy to Development

```bash
cd com-mrrainbowsmoke/02dev
wrangler deploy --env dev
```

**Dev Checklist:**
- [ ] Code changes tested locally with `wrangler dev --local`
- [ ] All secrets configured (if new secrets added)
- [ ] CHANGELOG.md updated in `02dev/`
- [ ] Deployment successful
- [ ] Basic smoke test (hit main endpoint, verify response)

### 2. Promote to Staging

```bash
cd com-mrrainbowsmoke/01stg
wrangler deploy --env stg
```

**Staging Checklist:**
- [ ] Dev environment verified and stable
- [ ] CHANGELOG.md updated in `01stg/`
- [ ] Secrets synchronized from dev (if needed)
- [ ] Deployment successful
- [ ] Full integration testing completed
- [ ] Monitor logs: `wrangler tail --env stg`

### 3. Promote to Production

```bash
cd com-mrrainbowsmoke/00prd
wrangler deploy --env prd
```

**Production Checklist:**
- [ ] Staging environment fully validated
- [ ] CHANGELOG.md updated in `00prd/`
- [ ] Production secrets configured
- [ ] Deployment scheduled during maintenance window (if applicable)
- [ ] Deployment successful
- [ ] Production smoke test completed
- [ ] Monitor logs: `wrangler tail --env prd --format json`
- [ ] Alert stakeholders of deployment

## Multi-Tenant Deployment

To deploy all environments for a single tenant:

```bash
cd com-mrrainbowsmoke/02dev && wrangler deploy --env dev
cd ../01stg && wrangler deploy --env stg
cd ../00prd && wrangler deploy --env prd
```

To deploy across multiple tenants:

```bash
# Deploy dev for all tenants
cd com-mrrainbowsmoke/02dev && wrangler deploy --env dev
cd ../../com-rainbowsmokeofficial/02dev && wrangler deploy --env dev
cd ../../com-ai/02dev && wrangler deploy --env dev

# Then staging for all tenants
# Then production for all tenants
```

## Rollback Procedure

If issues are detected in production:

### Quick Rollback

Redeploy the previous working version:

```bash
cd com-mrrainbowsmoke/00prd
# Revert code changes in git first
git checkout <previous-commit>
wrangler deploy --env prd
```

### Investigate and Fix

1. Check logs: `wrangler tail --env prd --format json`
2. Identify the issue
3. Fix in `02dev` first
4. Test locally
5. Re-promote through all environments

## Monitoring Post-Deployment

### Immediate Checks (0-5 minutes)

```bash
# Stream logs
wrangler tail --env prd

# Check for errors
wrangler tail --env prd --format json | grep -i error
```

### Extended Monitoring (5-30 minutes)

- Monitor error rates in Cloudflare dashboard
- Check performance metrics
- Verify critical user flows
- Monitor third-party integrations

## Emergency Procedures

### Production Down

1. Check Cloudflare status page
2. Review recent deployments
3. Roll back if recent deployment caused issue
4. Document incident in `.llm/plans/INCIDENTS.md`

### Partial Outage

1. Identify affected functionality
2. Check if tenant-specific or global
3. Consider rolling back affected tenant only
4. Monitor and document

## Best Practices

- **Always test in dev first** - Never deploy untested code
- **One environment at a time** - Complete validation before promoting
- **Update CHANGELOGs** - Document what changed in each environment
- **Monitor after deployment** - Watch logs for at least 5 minutes
- **Coordinate with team** - Communicate deployments, especially to production
- **Document incidents** - Learn from issues by documenting them
