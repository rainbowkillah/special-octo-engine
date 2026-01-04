# Phase 2.7 Quick Start Guide

**Goal:** Test Environment Hub with real credentials and prepare for production.

---

## Prerequisites Checklist

Before starting Phase 2.7 tasks:

- [ ] You have access to Cloudflare dashboard (Zero Trust section)
- [ ] You have a Notion account with integration capabilities
- [ ] You know your Cloudflare team name
- [ ] Staging worker is deployed: `https://environmenthub-stg.mrrainbowsmoke.workers.dev`

---

## Step 1: Resolve Authentication (30-60 min)

### 1.1 Get Your Cloudflare Access Values

**Find Team Name:**
```
1. Go to https://one.dash.cloudflare.com/
2. Navigate to Zero Trust → Settings → Custom Pages
3. Your team domain: https://YOUR_TEAM.cloudflareaccess.com
4. Team name = YOUR_TEAM (just the subdomain part)
```

**Find AUD Tag:**
```
1. Go to Zero Trust → Access → Applications
2. Find "Environment Hub - Staging" (or create if doesn't exist)
3. Click on the application
4. In Overview tab, find "Application Audience (AUD) Tag"
5. Copy the long alphanumeric string
```

**Quick Test:**
```bash
# Replace YOUR_TEAM with your actual team name
curl https://YOUR_TEAM.cloudflareaccess.com/cdn-cgi/access/certs

# Should return JSON with "keys" array
# If 404 = wrong team name
```

### 1.2 Test Local Development

```bash
# Start local dev server
cd app-environmenthub/02dev
npm run dev

# In another terminal, test bypass (should work)
curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/health

# Should return: {"success":true,"status":"healthy","env":"dev"}
```

✅ **If this works, proceed to Step 2**  
❌ **If this fails, see [AUTH_TROUBLESHOOTING.md](./AUTH_TROUBLESHOOTING.md)**

---

## Step 2: Set Up Notion Integration (15 min)

### 2.1 Create Notion Integration

```
1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name: "Environment Hub Sync"
4. Associated workspace: [Your workspace]
5. Type: Internal
6. Capabilities: Read content, Update content, Insert content
7. Submit
8. Copy the "Internal Integration Secret" (starts with secret_)
```

### 2.2 Share Database with Integration

```
1. Open your Notion database
2. Click "..." menu (top right)
3. Click "Add connections"
4. Select "Environment Hub Sync"
5. Click "Confirm"
```

### 2.3 Get Database ID

**From URL:**
```
https://notion.so/workspace/DATABASE_ID?v=...
                         ^^^^^^^^^^^
                         32 characters, no hyphens
```

**Or from Share menu:**
```
1. Click "..." → "Copy link"
2. Extract ID from URL
3. Remove any hyphens
```

---

## Step 3: Configure Staging Secrets (10 min)

```bash
cd app-environmenthub/01stg

# Set Notion credentials
npx wrangler secret put NOTION_API_KEY
# Paste: secret_your_integration_key

npx wrangler secret put NOTION_DATABASE_ID
# Paste: your_database_id_32_chars

# Set Access credentials
npx wrangler secret put CF_ACCESS_TEAM_NAME
# Paste: your_team_name (just subdomain)

npx wrangler secret put CF_ACCESS_AUD
# Paste: your_aud_tag

# Verify all secrets are set
npx wrangler secret list
# Should show all 4 secrets

# Deploy to apply secrets
npx wrangler deploy
```

---

## Step 4: Test Staging Access (10 min)

### 4.1 Get Access JWT Token

**Method 1: Browser (recommended)**
```
1. Visit https://environmenthub-stg.mrrainbowsmoke.workers.dev
2. Login via Cloudflare Access
3. Open DevTools (F12) → Network tab
4. Refresh page
5. Click on request to worker
6. Go to Headers → Request Headers
7. Find "cf-access-jwt-assertion: eyJ..."
8. Copy the token value (starts with eyJ)
```

**Method 2: Service Token (for automation)**
```
1. Zero Trust → Access → Service Auth → Service Tokens
2. Create New Token
3. Name: "Environment Hub API"
4. Copy Client ID and Client Secret
5. Add to Access Application policy
```

### 4.2 Test Health Endpoint

**With JWT (Browser method):**
```bash
JWT="eyJhbGc..."  # Paste your JWT token

curl -H "cf-access-jwt-assertion: $JWT" \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health

# Expected: {"success":true,"status":"healthy","env":"stg"}
```

**With Service Token:**
```bash
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"

curl -H "CF-Access-Client-Id: $CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CLIENT_SECRET" \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
```

✅ **If 200 OK, proceed to Step 5**  
❌ **If 401, check [AUTH_TROUBLESHOOTING.md](./AUTH_TROUBLESHOOTING.md)**

---

## Step 5: Sync Notion → D1 (10 min)

### 5.1 Prepare Notion Database

Ensure your Notion database has:
- At least 5-10 test entries
- Various environment tags (dev, stg, prd)
- Mix of sensitive and non-sensitive entries
- All required fields filled

### 5.2 Trigger Sync

```bash
JWT="your_jwt_token"  # From Step 4

curl -X POST \
  -H "cf-access-jwt-assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}' \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync

# Expected: {"success":true,"data":{...sync_results...}}
```

### 5.3 Verify Sync

**Check entry count:**
```bash
cd app-environmenthub/01stg

npx wrangler d1 execute DB --remote --command \
  "SELECT COUNT(*) as total FROM environment_hub"
```

**View entries:**
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?limit=10"
```

**Check logs:**
```bash
npx wrangler tail
```

---

## Step 6: Test Dashboard (5 min)

```
1. Visit https://environmenthub-stg.mrrainbowsmoke.workers.dev/
2. Login via Access
3. Dashboard should show your entries
4. Verify:
   - Data loads
   - Sensitive values are masked (***MASKED***)
   - Filters work (try filtering by tenant or environment)
   - Search works (try searching for a key name)
```

---

## Step 7: Monitor Scheduled Sync (Passive)

```bash
cd app-environmenthub/01stg

# Start log monitoring
npx wrangler tail --format pretty

# Wait for next hour (cron runs at :00)
# Watch for "Scheduled sync triggered" message
# Verify sync completes successfully
```

---

## Common Issues & Quick Fixes

### Issue: "missing Cloudflare Access token"
**Fix:** Access app not configured or not in front of worker URL

```bash
# Check Access app exists and matches worker URL
# Zero Trust → Access → Applications
```

### Issue: "invalid Access token"
**Fix:** Secrets don't match Access app configuration

```bash
# Re-verify and re-set secrets
cd app-environmenthub/01stg
npx wrangler secret put CF_ACCESS_TEAM_NAME
npx wrangler secret put CF_ACCESS_AUD
npx wrangler deploy
```

### Issue: "Notion API error: 400"
**Fix:** Database schema mismatch or integration not shared

```
1. Verify integration has access to database
2. Check database properties match expected schema
3. Ensure integration has read/write capabilities
```

### Issue: Sync returns 0 entries
**Fix:** Database ID incorrect or database empty

```bash
# Verify database ID
npx wrangler secret list

# Check Notion database has entries
# Re-sync if needed
```

---

## Success Criteria

Phase 2.7 is complete when:

- [ ] Local dev server works with bypass header
- [ ] Staging health endpoint returns 200 with JWT
- [ ] Notion → D1 sync imports all entries successfully
- [ ] Dashboard displays data with proper masking
- [ ] Scheduled sync runs and completes successfully
- [ ] D1 → Notion sync updates entries correctly

---

## Next Steps After Phase 2.7

1. **Monitor for 24 hours** - Ensure scheduled syncs run reliably
2. **Test edge cases** - Try large datasets, concurrent syncs, etc.
3. **Document runbook** - Operational procedures for team
4. **Plan production** - Review checklist in Phase 2.7 plan
5. **Deploy to production** - After staging validation complete

---

## Need Help?

1. **Authentication issues:** See [AUTH_TROUBLESHOOTING.md](./AUTH_TROUBLESHOOTING.md)
2. **Detailed task breakdown:** See [../.llm/plans/PHASE2_7_PLAN.md](../.llm/plans/PHASE2_7_PLAN.md)
3. **Deployment info:** See [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)
4. **General setup:** See [SETUP.md](./SETUP.md)

---

**Estimated Total Time:** 1.5 - 2 hours  
**Last Updated:** 2026-01-04
