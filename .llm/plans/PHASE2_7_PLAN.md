# Phase 2.7 Plan - Environment Hub Testing & Production Readiness

**Status:** 🟡 Planning Complete - Ready for implementation  
**Created:** 2026-01-04  
**Goal:** Test with real credentials, validate dashboard, prepare for production

**Quick Links:**
- [Quick Start Guide](../../app-environmenthub/PHASE2_7_QUICKSTART.md) - Step-by-step walkthrough
- [Auth Troubleshooting](../../app-environmenthub/AUTH_TROUBLESHOOTING.md) - Detailed auth debugging
- [Deployment Status](../../app-environmenthub/DEPLOYMENT_STATUS.md) - Current deployment state

---

## Current State

### ✅ What's Working
- Staging deployed: `https://environmenthub-stg.mrrainbowsmoke.workers.dev`
- Local dev environment functional with bypass header
- Infrastructure complete: D1 databases, KV namespaces, cron schedules
- Worker code complete: sync engines, API routes, dashboard, middleware

### ⚠️ Known Issues
- **Authentication errors** reported by user
- Secrets not set with real Notion credentials in staging
- No real data in D1 databases yet
- Cloudflare Access configuration needs verification

---

## Prerequisites & Dependencies

### 1. Cloudflare Access Setup

**Required Information:**
- Cloudflare Team Name (e.g., `rainbowsmoke`)
- Access Application AUD tag (audience)
- Access Application URL (should match worker URL)
- Service Token credentials (optional, for API access)

**Authentication Troubleshooting Checklist:**

- [ ] Verify Cloudflare Access application exists for worker URL
- [ ] Confirm team name matches Access dashboard: `https://one.dash.cloudflare.com/<account>/access/apps`
- [ ] Check AUD tag from Access app settings
- [ ] Test Access app access: visit worker URL in browser, should redirect to Access login
- [ ] Verify JWT header name: should be `cf-access-jwt-assertion`
- [ ] Confirm worker secrets are set correctly (case-sensitive)

**Common Authentication Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `missing Cloudflare Access token` | No JWT header sent | Add `cf-access-jwt-assertion` header or use bypass |
| `invalid Access token` | Wrong team name/AUD | Verify secrets match Access app config |
| `Failed to fetch Access certs` | Team name incorrect | Check team domain in Access dashboard |
| `Unsupported alg` | Not using RS256 | Access app should use default RS256 algorithm |

### 2. Notion API Setup

**Required Information:**
- Notion Integration Token (starts with `secret_`)
- Notion Database ID (32-char hex without hyphens)
- Database must grant integration access

**Notion Setup Checklist:**

- [ ] Create Notion Integration: https://www.notion.so/my-integrations
- [ ] Copy Integration Token (Internal Integration)
- [ ] Find Database ID from database URL or share menu
- [ ] Share database with integration (via "Add connections")
- [ ] Verify database properties match schema (see below)

**Expected Notion Database Schema:**

```
- Key (Title) - Required
- Description (Text)
- Value (Text)
- Value Type (Select): String, Number, Boolean, JSON, etc.
- Environment (Multi-select): dev, stg, prd, All Environments, etc.
- Environment Type (Select): Variable, Secret, Token, API Key, Certificate, etc.
- Tenant (Text)
- Is Sensitive (Checkbox)
- Required (Checkbox)
- Status (Select): Active, Deprecated, Pending, etc.
- Service/Component (Multi-select): API, Backend, Infrastructure, etc.
- Reference (URL)
- Notes (Text)
- Last Updated/Rotated (Date)
- Updated/Rotated By (People) - Optional, skipped in D1→Notion sync
- Rotation Policy (Select): Daily, Weekly, Monthly, Quarterly, Annually, None
```

### 3. Local Testing Environment

**Development Bypass Options:**

1. **Dev Bypass Header** (recommended for local testing)
   ```bash
   curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/health
   ```

2. **Update .dev.vars** with real credentials
   ```env
   NOTION_API_KEY=secret_your_real_key_here
   NOTION_DATABASE_ID=2dddb3b70ecd81fbb716f2c5ef579cc0
   CF_ACCESS_TEAM_NAME=rainbowsmoke
   CF_ACCESS_AUD=your-aud-tag-from-access-app
   ```

---

## Phase 2.7 Task Breakdown

### Task 1: Resolve Authentication Issues 🔴 HIGH PRIORITY

**Owner:** DevOps/Security  
**Estimated Time:** 1-2 hours  
**Dependencies:** Access to Cloudflare dashboard

**Steps:**

1. **Diagnose Current Error**
   - Run local dev server: `cd app-environmenthub/02dev && npm run dev`
   - Test without bypass: `curl http://localhost:8787/api/v1/health`
   - Expected: 401 with "missing Cloudflare Access token"
   - Test with bypass: `curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/health`
   - Expected: 200 with health status

2. **Verify Cloudflare Access Configuration**
   - Go to Cloudflare dashboard → Zero Trust → Access → Applications
   - Find or create application for staging worker URL
   - Note down:
     - Application Domain: `environmenthub-stg.mrrainbowsmoke.workers.dev`
     - Application AUD tag: (in Application settings → Overview)
     - Team name: (in Zero Trust overview)

3. **Test Access App in Browser**
   - Visit `https://environmenthub-stg.mrrainbowsmoke.workers.dev`
   - Should redirect to Access login
   - After login, should show 401 from worker (secrets not set yet, expected)
   - Check browser dev tools → Network → Headers for `cf-access-jwt-assertion`

4. **Document Findings**
   - Record team name, AUD tag, any error messages
   - Create `AUTH_TROUBLESHOOTING.md` with specific error and resolution

**Success Criteria:**
- [ ] Understand exact authentication error
- [ ] Have correct team name and AUD values
- [ ] Access app redirects and issues JWT tokens
- [ ] Dev bypass works in local environment

---

### Task 2: Configure Staging Secrets

**Owner:** DevOps  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 1 complete, Notion integration created

**Steps:**

1. **Set Notion Credentials**
   ```bash
   cd app-environmenthub/01stg
   
   # You'll be prompted to enter the value
   npx wrangler secret put NOTION_API_KEY
   npx wrangler secret put NOTION_DATABASE_ID
   ```

2. **Set Access Credentials**
   ```bash
   npx wrangler secret put CF_ACCESS_TEAM_NAME
   npx wrangler secret put CF_ACCESS_AUD
   ```

3. **Verify Secrets**
   ```bash
   npx wrangler secret list
   ```

4. **Test Configuration**
   ```bash
   # Deploy updated configuration
   npx wrangler deploy
   
   # Wait 10 seconds for propagation
   sleep 10
   
   # Test health endpoint (will require Access JWT)
   # Option A: Use service token
   curl -H "CF-Access-Client-Id: <client_id>" \
        -H "CF-Access-Client-Secret: <secret>" \
        https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
   
   # Option B: Get JWT from browser and use it
   # 1. Visit worker URL in browser
   # 2. Login via Access
   # 3. Open dev tools → Application → Cookies
   # 4. Copy cf_authorization cookie value
   curl -H "cf-access-jwt-assertion: <jwt_token>" \
        https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
   ```

**Success Criteria:**
- [ ] All 4 secrets set successfully
- [ ] Health endpoint returns 200 with real Access JWT
- [ ] No 500 errors in logs

---

### Task 3: Test Notion → D1 Sync

**Owner:** Backend Developer  
**Estimated Time:** 1-2 hours  
**Dependencies:** Task 2 complete

**Steps:**

1. **Prepare Notion Database**
   - Ensure at least 5-10 test entries exist
   - Verify database schema matches expected structure
   - Include mix of sensitive and non-sensitive entries
   - Use various environment tags (dev, stg, prd)

2. **Trigger Manual Sync**
   ```bash
   # Get Access JWT (browser method or service token)
   ACCESS_JWT="<your_jwt_token>"
   
   # Trigger Notion → D1 sync
   curl -X POST \
     -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     -H "Content-Type: application/json" \
     -d '{"direction": "notion_to_d1"}' \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync
   ```

3. **Verify Sync Results**
   ```bash
   # Check logs
   cd app-environmenthub/01stg
   npx wrangler tail
   
   # Query D1 directly
   npx wrangler d1 execute DB --remote --command \
     "SELECT COUNT(*) as total FROM environment_hub"
   
   # Check via API
   curl -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?limit=10"
   ```

4. **Validate Data**
   - [ ] Entry count matches Notion database
   - [ ] All fields populated correctly
   - [ ] Sensitive values present (not masked in D1, only in API response)
   - [ ] Timestamps set correctly
   - [ ] Sync log entry created

**Success Criteria:**
- [ ] Sync completes without errors
- [ ] All Notion entries imported to D1
- [ ] Data structure matches expectations
- [ ] Sync log records operation

---

### Task 4: Test D1 → Notion Sync

**Owner:** Backend Developer  
**Estimated Time:** 1 hour  
**Dependencies:** Task 3 complete

**Steps:**

1. **Modify Data in D1**
   ```bash
   cd app-environmenthub/01stg
   
   # Update an entry
   npx wrangler d1 execute DB --remote --command \
     "UPDATE environment_hub 
      SET value = 'test_updated_value', updated_at = datetime('now')
      WHERE key = 'TEST_KEY'
      LIMIT 1"
   ```

2. **Trigger D1 → Notion Sync**
   ```bash
   curl -X POST \
     -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     -H "Content-Type: application/json" \
     -d '{"direction": "d1_to_notion"}' \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/sync
   ```

3. **Verify in Notion**
   - Open Notion database
   - Find updated entry
   - Confirm value changed
   - Check "Last Edited" timestamp

4. **Test Conflict Handling**
   - Update same entry in both Notion and D1
   - Trigger Notion → D1 sync
   - Verify Notion wins (source of truth)

**Success Criteria:**
- [ ] D1 changes sync back to Notion
- [ ] Notion properties updated correctly
- [ ] Conflicts resolved (Notion wins)
- [ ] No 400 errors from Notion API

---

### Task 5: Validate Dashboard

**Owner:** Frontend Developer  
**Estimated Time:** 1-2 hours  
**Dependencies:** Task 3 complete

**Steps:**

1. **Access Dashboard**
   - Visit `https://environmenthub-stg.mrrainbowsmoke.workers.dev/`
   - Login via Cloudflare Access
   - Verify dashboard loads with data

2. **Test Filters**
   - [ ] Filter by tenant (should show/hide entries)
   - [ ] Filter by environment (dev, stg, prd)
   - [ ] Filter by environment type (Variable, Secret, etc.)
   - [ ] Search functionality (key name search)
   - [ ] Status filter (Active, Deprecated, etc.)

3. **Test Data Display**
   - [ ] Table shows all entries
   - [ ] Sensitive values masked (`***MASKED***`)
   - [ ] Non-sensitive values visible
   - [ ] All columns display correctly
   - [ ] Pagination works (if implemented)

4. **Test API Endpoints**
   ```bash
   # Test filtering
   curl -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?tenant=com-mrrainbowsmoke"
   
   # Test sensitive flag
   curl -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?isSensitive=true"
   
   # Test search
   curl -H "cf-access-jwt-assertion: $ACCESS_JWT" \
     "https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/entries?search=API_KEY"
   ```

**Success Criteria:**
- [ ] Dashboard accessible via Access
- [ ] All filters functional
- [ ] Sensitive data properly masked
- [ ] UI renders correctly with real data
- [ ] API returns filtered results

---

### Task 6: Monitor Scheduled Sync

**Owner:** DevOps  
**Estimated Time:** 1 hour (passive monitoring)  
**Dependencies:** Task 3 complete

**Steps:**

1. **Start Log Monitoring**
   ```bash
   cd app-environmenthub/01stg
   npx wrangler tail --format pretty
   ```

2. **Wait for Scheduled Execution**
   - Staging cron: every hour (`0 * * * *`)
   - Next execution: top of the hour
   - Monitor logs for sync trigger

3. **Verify Scheduled Sync**
   - [ ] Cron triggers at expected time
   - [ ] Sync completes successfully
   - [ ] No errors in logs
   - [ ] Sync log entry created
   - [ ] New/updated entries processed

4. **Check Sync Logs Table**
   ```bash
   npx wrangler d1 execute DB --remote --command \
     "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5"
   ```

**Success Criteria:**
- [ ] Cron executes on schedule
- [ ] Automated sync completes without errors
- [ ] Sync results logged correctly
- [ ] No performance issues observed

---

## Optional Enhancements

### Enhancement 1: Dashboard UX Improvements

**Priority:** Medium  
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Add loading spinners during API calls
- [ ] Implement proper error messages with retry
- [ ] Add debounced search (300ms delay)
- [ ] Add pagination controls (prev/next, page numbers)
- [ ] Add "Sync Now" button in dashboard
- [ ] Show last sync timestamp and status
- [ ] Add export to CSV functionality
- [ ] Improve mobile responsiveness

### Enhancement 2: Monitoring & Alerts

**Priority:** High  
**Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Set up Cloudflare Workers Analytics
- [ ] Configure error rate alerts
- [ ] Monitor D1 database size
- [ ] Track sync success/failure rates
- [ ] Set up Slack/Discord webhook for failures
- [ ] Create health check dashboard
- [ ] Document runbook for common issues

### Enhancement 3: Testing Suite

**Priority:** Medium  
**Estimated Time:** 6-8 hours

**Tasks:**
- [ ] Unit tests for transformer logic
- [ ] Integration tests for sync engines
- [ ] API endpoint tests
- [ ] Mock Notion API responses
- [ ] Test Access verification logic
- [ ] Test database queries and filters
- [ ] Load testing for API endpoints

### Enhancement 4: Production Deployment

**Priority:** High (after testing complete)  
**Estimated Time:** 1-2 hours

**Tasks:**
- [ ] Review staging test results
- [ ] Set production secrets
- [ ] Deploy to production
- [ ] Test production sync
- [ ] Update DNS/routing if needed
- [ ] Document production URLs
- [ ] Create rollback plan

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Authentication config incorrect | High | Complete Task 1 thoroughly, document exact values |
| Notion API rate limits | Medium | Implement backoff, monitor usage |
| D1 database size limits | Medium | Monitor size, implement archival strategy |
| Sync conflicts/data loss | High | Notion is source of truth, test thoroughly |
| Production downtime | High | Test in staging first, have rollback plan |
| Secret leakage | Critical | Never commit secrets, use wrangler secrets only |

---

## Success Metrics

### Phase 2.7 Complete When:
- [ ] All 6 main tasks completed successfully
- [ ] Authentication working in staging
- [ ] Bidirectional sync tested with real data
- [ ] Dashboard validated with real data
- [ ] Scheduled sync monitored for 24 hours
- [ ] All documentation updated
- [ ] Runbook created for operations team

### Ready for Production When:
- [ ] Phase 2.7 complete
- [ ] No critical bugs in staging
- [ ] Monitoring in place
- [ ] Runbook approved
- [ ] Rollback plan documented
- [ ] Stakeholder sign-off

---

## Next Steps

1. **Immediate (This Session):**
   - Investigate authentication errors (Task 1)
   - Document specific error messages
   - Create troubleshooting guide

2. **Short Term (This Week):**
   - Configure staging secrets (Task 2)
   - Test Notion sync (Task 3-4)
   - Validate dashboard (Task 5)

3. **Medium Term (Next Week):**
   - Monitor scheduled syncs (Task 6)
   - Implement critical enhancements
   - Prepare for production

---

## Support Resources

- **Cloudflare Access Docs:** https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/
- **Notion API Docs:** https://developers.notion.com/
- **Wrangler Secrets:** https://developers.cloudflare.com/workers/wrangler/commands/#secret
- **D1 Database:** https://developers.cloudflare.com/d1/
- **Workers Analytics:** https://developers.cloudflare.com/workers/observability/

---

**Last Updated:** 2026-01-04  
**Next Review:** After Task 1 completion
