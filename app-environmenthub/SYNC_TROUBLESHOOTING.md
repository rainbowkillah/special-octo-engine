# Sync Troubleshooting Guide

## Common Sync Errors & Solutions

### Error: "Notion API error: 400 Bad Request"

**Causes:**
1. **Invalid API Key Format**
   - Must start with `secret_` not `ntn_`
   - Check: `cd 01stg && npx wrangler secret list`

2. **Database Not Shared**
   - Integration must have access to database
   - Fix: Notion → Database → "..." → "Add connections" → Select your integration

3. **Wrong Database ID**
   - Must be 32-char hex without hyphens
   - Get from URL: `https://notion.so/workspace/ID?v=...`

**Solution:**
\`\`\`bash
# Update API key
cd app-environmenthub/01stg
npx wrangler secret put NOTION_API_KEY
# Paste: secret_your_real_key_here

# Verify and redeploy
npx wrangler secret list
npx wrangler deploy
\`\`\`

---

### Error: "Notion API error: 401 Unauthorized"

**Cause:** API key is invalid or revoked

**Solution:**
1. Go to https://www.notion.so/my-integrations
2. Verify integration exists and is active
3. Regenerate secret if needed
4. Update secret in staging
5. Redeploy

---

### Error: "Notion API error: 404 Not Found"

**Cause:** Database ID is incorrect

**Solution:**
1. Open your Notion database
2. Get correct ID from URL or share link
3. Update secret:
   \`\`\`bash
   cd app-environmenthub/01stg
   npx wrangler secret put NOTION_DATABASE_ID
   npx wrangler deploy
   \`\`\`

---

### Sync Returns 0 Entries

**Causes:**
1. Notion database is empty
2. Wrong database ID
3. All entries filtered out

**Debug:**
\`\`\`bash
# Check D1
cd app-environmenthub/01stg
npx wrangler d1 execute DB --remote --command \
  "SELECT COUNT(*) FROM environment_hub"

# Check Notion (verify database has entries in Notion UI)

# Check sync log for details
npx wrangler d1 execute DB --remote --command \
  "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 1"
\`\`\`

---

### D1 → Notion Sync Fails with 400

**Causes:**
1. **Select/Multi-select Value Mismatch**
   - D1 has values not in Notion's options
   - Example: D1 has `"dev"` but Notion only allows `"development"`

2. **Invalid Property Types**
   - Trying to write text to number field, etc.

**Solution:**
1. Ensure D1 values match Notion schema exactly
2. Check Notion property options (Select/Multi-select dropdowns)
3. Update D1 values or add options to Notion

---

### JWT Token Issues

**Error:** "missing Cloudflare Access token"
- Not sending JWT header
- Use: `-H "cf-access-jwt-assertion: $JWT"`

**Error:** "invalid Access token"
- Token expired (get new one)
- Wrong team name or AUD in secrets

**Solution:**
\`\`\`bash
# Get fresh JWT from browser
# Open DevTools → Network → cf-access-jwt-assertion header

export JWT="your_new_token"

# Test
curl -H "cf-access-jwt-assertion: $JWT" \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
\`\`\`

---

## Quick Diagnostic Commands

### 1. Verify Secrets Are Set
\`\`\`bash
cd app-environmenthub/01stg
npx wrangler secret list
# Should show: CF_ACCESS_AUD, CF_ACCESS_TEAM_NAME, NOTION_API_KEY, NOTION_DATABASE_ID
\`\`\`

### 2. Check Recent Logs
\`\`\`bash
npx wrangler tail --format pretty
# Look for error messages during sync
\`\`\`

### 3. Verify D1 Schema
\`\`\`bash
npx wrangler d1 execute DB --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table'"
# Should show: environment_hub, sync_log
\`\`\`

### 4. Check Last Sync Status
\`\`\`bash
npx wrangler d1 execute DB --remote --command \
  "SELECT sync_type, direction, status, error_message, processed, created, updated 
   FROM sync_log 
   ORDER BY started_at DESC 
   LIMIT 1"
\`\`\`

### 5. Verify Notion Integration
- Go to: https://www.notion.so/my-integrations
- Check integration exists and is active
- Verify which databases it has access to

---

## Testing Checklist

Before running sync:
- [ ] Notion integration created
- [ ] Database shared with integration
- [ ] API key starts with `secret_`
- [ ] Database ID is 32 chars (no hyphens)
- [ ] All 4 secrets set in staging
- [ ] Staging deployed after setting secrets
- [ ] JWT token obtained from browser
- [ ] Health endpoint returns 200

---

## Manual Sync Test

\`\`\`bash
# Set JWT
export JWT="your_jwt_token"

# Test Notion → D1
curl -X POST \
  -H "cf-access-jwt-assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"direction": "notion_to_d1"}' \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync | jq .

# Check result
cd app-environmenthub/01stg
npx wrangler d1 execute DB --remote --command \
  "SELECT COUNT(*) as total FROM environment_hub"

# If successful, test reverse
curl -X POST \
  -H "cf-access-jwt-assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"direction": "d1_to_notion"}' \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync | jq .
\`\`\`

---

## Still Not Working?

1. **Check Notion Database Schema**
   - Required fields: Key (Title), Description, Value, Environment, etc.
   - See: app-environmenthub/README.md for full schema

2. **Verify API Key Format**
   - WRONG: `ntn_...`
   - RIGHT: `secret_...`

3. **Test with curl -v** (verbose)
   \`\`\`bash
   curl -v -X POST \
     -H "cf-access-jwt-assertion: $JWT" \
     -H "Content-Type: application/json" \
     -d '{"direction": "notion_to_d1"}' \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync
   \`\`\`

4. **Watch Live Logs**
   \`\`\`bash
   cd app-environmenthub/01stg
   npx wrangler tail --format pretty
   # Keep this running, then trigger sync in another terminal
   \`\`\`

---

**Last Updated:** 2026-01-04
