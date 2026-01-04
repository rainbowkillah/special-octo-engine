# Testing Staging Environment - Step by Step

## Current Status ✅

- **Staging URL:** https://environmenthub-stg.mrrainbowsmoke.workers.dev
- **Version:** dc851335-3505-4d7e-9440-9bf782e71f02
- **Secrets:** All 4 secrets configured ✅
  - CF_ACCESS_TEAM_NAME
  - CF_ACCESS_AUD
  - NOTION_API_KEY
  - NOTION_DATABASE_ID

---

## Step 1: Get Access JWT Token

### Method A: Browser (Recommended)

1. **Open staging URL in browser:**
   ```
   https://environmenthub-stg.mrrainbowsmoke.workers.dev
   ```

2. **Login via Cloudflare Access:**
   - You'll be redirected to Access login
   - Enter your email or SSO credentials
   - You'll be redirected back to the worker

3. **Extract JWT Token:**
   - Open Developer Tools (F12)
   - Go to **Network** tab
   - Refresh the page
   - Click on the request to `environmenthub-stg.mrrainbowsmoke.workers.dev`
   - Go to **Headers** section
   - Find **Request Headers**
   - Look for: `cf-access-jwt-assertion: eyJ...`
   - Copy the entire value (starts with `eyJ`)

4. **Save the token for testing:**
   ```bash
   export JWT="eyJhbGc..."  # Paste your token here
   echo $JWT  # Verify it's set
   ```

### Method B: Create Service Token (For API automation)

1. **Go to Cloudflare Dashboard:**
   ```
   https://one.dash.cloudflare.com/
   → Zero Trust → Access → Service Auth → Service Tokens
   ```

2. **Create new token:**
   - Click "Create Service Token"
   - Name: "Environment Hub API Access"
   - Copy Client ID and Client Secret (shown only once!)

3. **Add to Access Policy:**
   - Go to Access → Applications
   - Find "Environment Hub - Staging"
   - Edit the policy
   - Add rule: Include → Service Auth → [Your Token Name]
   - Save

4. **Use service token:**
   ```bash
   export CLIENT_ID="your_client_id"
   export CLIENT_SECRET="your_client_secret"
   ```

---

## Step 2: Test Health Endpoint

### With JWT Token:
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health

# Expected: {"success":true,"status":"healthy","env":"stg"}
```

### With Service Token:
```bash
curl -H "CF-Access-Client-Id: $CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CLIENT_SECRET" \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
```

**✅ Success:** JSON response with `"success":true`  
**❌ Error 401:** Token is invalid or expired (get new token)

---

## Step 3: Test Notion → D1 Sync

### Trigger Manual Sync:
```bash
curl -X POST \
  -H "cf-access-jwt-assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}' \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync | jq .
```

### Expected Response (Success):
```json
{
  "success": true,
  "data": {
    "syncLogId": 1,
    "processed": 10,
    "created": 10,
    "updated": 0,
    "deleted": 0,
    "conflicts": 0,
    "duration_ms": 1234,
    "errors": []
  }
}
```

### Expected Response (Notion API Error):
```json
{
  "success": false,
  "error": "Notion API error: 400 Bad Request"
}
```

**If you get 400 error:**
- Notion API key format is wrong (should start with `secret_`)
- Database ID is incorrect
- Database hasn't been shared with integration
- See "Notion Setup" section below

---

## Step 4: Verify Data in D1

### Count entries:
```bash
cd /workspaces/special-octo-engine/app-environmenthub/01stg
npx wrangler d1 execute DB --remote --command \
  "SELECT COUNT(*) as total FROM environment_hub"
```

### View sample entries:
```bash
npx wrangler d1 execute DB --remote --command \
  "SELECT id, key, environment_type, tenant, is_sensitive 
   FROM environment_hub 
   LIMIT 5"
```

### Check sync log:
```bash
npx wrangler d1 execute DB --remote --command \
  "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 3"
```

---

## Step 5: Test API Endpoints

### Get all entries (paginated):
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?limit=10" | jq .
```

### Filter by tenant:
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?tenant=com-mrrainbowsmoke" | jq .
```

### Filter by environment:
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?environment=stg" | jq .
```

### Search by key name:
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?search=API" | jq .
```

### Filter sensitive entries:
```bash
curl -H "cf-access-jwt-assertion: $JWT" \
  "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?isSensitive=true" | jq .
```

**Note:** Sensitive values should be masked as `***MASKED***` in API responses!

---

## Step 6: Test Dashboard

1. **Open in browser:**
   ```
   https://environmenthub-stg.mrrainbowsmoke.workers.dev/
   ```

2. **Login via Access** (if not already logged in)

3. **Verify dashboard displays:**
   - [ ] Data loads in table
   - [ ] Sensitive values are masked
   - [ ] Filters work (tenant, environment, type)
   - [ ] Search works
   - [ ] All columns display correctly

---

## Step 7: Monitor Logs

### Watch live logs:
```bash
cd /workspaces/special-octo-engine/app-environmenthub/01stg
npx wrangler tail --format pretty
```

### Watch for scheduled sync (runs every hour):
- Cron schedule: `0 * * * *` (top of every hour)
- Look for: "Scheduled sync triggered" and "Scheduled sync completed"
- Verify no errors

---

## Notion Setup (If sync fails with 400)

### 1. Create Notion Integration:
```
https://www.notion.so/my-integrations
→ + New integration
→ Name: Environment Hub Sync
→ Type: Internal
→ Capabilities: Read, Update, Insert content
→ Submit
→ Copy "Internal Integration Secret" (starts with secret_)
```

### 2. Share Database with Integration:
```
Open your Notion database
→ Click "..." menu (top right)
→ "Add connections"
→ Select "Environment Hub Sync"
→ Confirm
```

### 3. Get Database ID:
```
From URL: https://notion.so/workspace/DATABASE_ID?v=...
Or: "..." → "Copy link" → Extract 32-char ID
Remove hyphens if present
```

### 4. Update Staging Secret:
```bash
cd /workspaces/special-octo-engine/app-environmenthub/01stg
npx wrangler secret put NOTION_API_KEY
# Paste the real secret_ value

# Re-deploy to apply
npx wrangler deploy
```

---

## Quick Troubleshooting

### Error: "missing Cloudflare Access token"
**Cause:** No JWT in request  
**Fix:** Get JWT from browser or use service token

### Error: "invalid Access token"
**Cause:** Token expired or wrong team/AUD  
**Fix:** Get fresh JWT, verify CF_ACCESS_TEAM_NAME and CF_ACCESS_AUD secrets

### Error: "Notion API error: 400"
**Cause:** Bad API key or database not shared  
**Fix:** Use real `secret_` key, share database with integration

### Error: Sync returns 0 entries
**Cause:** Database empty or wrong ID  
**Fix:** Verify database ID, check database has entries in Notion

### Dashboard shows empty table
**Cause:** No sync has run yet, or sync failed  
**Fix:** Trigger manual sync first, check logs for errors

---

## Success Checklist

Phase 2.7 is complete when:

- [ ] Can get JWT token from browser
- [ ] Health endpoint returns 200 with JWT
- [ ] Notion → D1 sync imports data successfully
- [ ] D1 database has entries (check with `wrangler d1 execute`)
- [ ] API endpoints return filtered data
- [ ] Dashboard displays data with proper masking
- [ ] Scheduled sync runs successfully (wait for next hour)

---

## Next Commands to Run

1. **Get JWT and test health:**
   ```bash
   # After getting JWT from browser:
   export JWT="your_jwt_here"
   curl -H "cf-access-jwt-assertion: $JWT" \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
   ```

2. **Trigger sync:**
   ```bash
   curl -X POST \
     -H "cf-access-jwt-assertion: $JWT" \
     -H "Content-Type: application/json" \
     -d '{"direction": "notion_to_d1"}' \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync | jq .
   ```

3. **Check D1:**
   ```bash
   cd /workspaces/special-octo-engine/app-environmenthub/01stg
   npx wrangler d1 execute DB --remote --command \
     "SELECT COUNT(*) as total FROM environment_hub"
   ```

4. **Watch logs:**
   ```bash
   npx wrangler tail --format pretty
   ```

---

**Last Updated:** 2026-01-04  
**Staging Version:** dc851335-3505-4d7e-9440-9bf782e71f02
