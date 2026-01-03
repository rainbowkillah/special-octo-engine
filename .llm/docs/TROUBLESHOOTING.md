# Troubleshooting Guide

## Common Issues and Solutions

### Local Development Issues

#### Worker Not Starting

**Symptom:** `wrangler dev` fails to start or crashes

**Solutions:**
1. Check for syntax errors: `npx tsc --noEmit` (if using TypeScript)
2. Verify `wrangler.jsonc` is valid JSON
3. Update wrangler: `npm install -g wrangler@latest`
4. Clear wrangler cache: `rm -rf .wrangler/`

#### Changes Not Reflecting

**Symptom:** Code changes don't appear when refreshing

**Solutions:**
1. Restart `wrangler dev`
2. Check if watching the correct file
3. Verify no syntax errors blocking compilation
4. Try hard refresh in browser (Cmd/Ctrl + Shift + R)

#### Cannot Access Local Worker

**Symptom:** `http://localhost:8787` not responding

**Solutions:**
1. Check if another process is using port 8787
2. Specify different port: `wrangler dev --port 8788`
3. Verify firewall isn't blocking localhost connections
4. Check wrangler dev output for actual port being used

### Deployment Issues

#### Deployment Fails with Auth Error

**Symptom:** `Error: Not authenticated`

**Solutions:**
1. Login to wrangler: `wrangler login`
2. Verify correct Cloudflare account: `wrangler whoami`
3. Check API token permissions (if using CI/CD)

#### Deployment Succeeds but Worker Not Working

**Symptom:** Deployment completes but worker returns errors

**Solutions:**
1. Check deployed logs: `wrangler tail --env dev`
2. Verify environment variables are set correctly
3. Check secrets are configured: `wrangler secret list --env dev`
4. Confirm routes are configured in `wrangler.jsonc`

#### "Exceeded Free Plan Limits"

**Symptom:** Deployment blocked due to plan limits

**Solutions:**
1. Review current Cloudflare plan limits
2. Check number of workers deployed
3. Consider upgrading plan or removing unused workers
4. Verify you're deploying to correct account

### Runtime Issues

#### KV Store Not Working

**Symptom:** KV reads/writes failing

**Solutions:**
1. Verify KV namespace binding in `wrangler.jsonc`
2. Check KV namespace exists: `wrangler kv:namespace list`
3. For local dev, ensure `--local` flag is used
4. Verify KV permissions for API token

#### D1 Database Errors

**Symptom:** Database queries failing

**Solutions:**
1. Verify D1 binding in `wrangler.jsonc`
2. Check database exists: `wrangler d1 list`
3. Run migrations if needed: `wrangler d1 migrations apply`
4. For local dev, verify local D1 setup

#### Scheduled Events Not Triggering

**Symptom:** Cron jobs not running

**Solutions:**
1. For local dev, use `--test-scheduled` flag
2. Verify cron syntax in `wrangler.jsonc`
3. Check Cloudflare dashboard for scheduled event logs
4. Confirm trigger schedule (may take time for first run)

### Secret Management Issues

#### Secrets Not Available in Worker

**Symptom:** `env.SECRET_NAME` is undefined

**Solutions:**
1. Local: Verify `.dev.vars` file exists and has correct format
2. Deployed: Check secret is set: `wrangler secret list --env dev`
3. Restart `wrangler dev` after adding `.dev.vars`
4. Verify secret name matches exactly (case-sensitive)

#### Cannot Set Secret

**Symptom:** `wrangler secret put` fails

**Solutions:**
1. Ensure you're in correct environment directory
2. Verify authentication: `wrangler whoami`
3. Check worker name in `wrangler.jsonc` matches deployed worker
4. Confirm you have permission to manage secrets

### Performance Issues

#### Worker Exceeding CPU Time

**Symptom:** "Error: Exceeded CPU time limit"

**Solutions:**
1. Optimize heavy computations
2. Use async operations properly
3. Consider caching expensive operations
4. Review Cloudflare Workers CPU limits for your plan

#### Worker Exceeding Memory

**Symptom:** Worker crashes or runs slowly

**Solutions:**
1. Reduce in-memory data structures
2. Stream large responses instead of buffering
3. Review dependencies - remove unused packages
4. Check for memory leaks

### Multi-Environment Issues

#### Inconsistent Behavior Across Environments

**Symptom:** Works in dev, fails in staging/prod

**Solutions:**
1. Compare `wrangler.jsonc` files across environments
2. Verify secrets are set in all environments
3. Check environment-specific variables (`ENV` var)
4. Review bindings (KV, D1, etc.) - ensure they exist in target env

#### Wrong Environment Deployed

**Symptom:** Deployed to wrong environment

**Solutions:**
1. Always verify current directory before deploying
2. Check `wrangler.jsonc` name and env flag match
3. Use full deployment commands from DEPLOYMENTS.md
4. If mistake made, immediately deploy correct version

## Getting Help

### Log Analysis

Always include logs when seeking help:

```bash
# Get recent logs
wrangler tail --env dev --format json > logs.json

# Search for errors
wrangler tail --env prd | grep -i error
```

### Diagnostic Information

Gather this info before asking for help:

```bash
# Wrangler version
wrangler --version

# Account info
wrangler whoami

# Worker configuration
cat wrangler.jsonc

# List bindings
wrangler kv:namespace list
wrangler d1 list
```

### Resources

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- Cloudflare Community: https://community.cloudflare.com/
- Status Page: https://www.cloudflarestatus.com/
