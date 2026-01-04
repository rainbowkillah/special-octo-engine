# Authentication Troubleshooting Guide - Environment Hub

**Purpose:** Diagnose and resolve Cloudflare Access authentication issues for Environment Hub worker.

---

## Quick Reference

### Authentication Flow
```
User Request → Cloudflare Access → JWT Token → Worker → Access Middleware → Verify JWT → API/Dashboard
```

### Required Components
1. **Cloudflare Access Application** (configured in Zero Trust dashboard)
2. **Worker Secrets** (CF_ACCESS_TEAM_NAME, CF_ACCESS_AUD)
3. **JWT Token** (from Access login or service token)
4. **JWKS Endpoint** (https://TEAM.cloudflareaccess.com/cdn-cgi/access/certs)

---

## Step-by-Step Diagnosis

### Step 1: Verify Local Development

**Test without Access (should fail with 401):**
```bash
curl http://localhost:8787/api/v1/health
```

**Expected Response:**
```json
{"success":false,"error":"Unauthorized: missing Cloudflare Access token"}
```

**Test with dev bypass (should succeed):**
```bash
curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/health
```

**Expected Response:**
```json
{"success":true,"status":"healthy","env":"dev"}
```

✅ **If both work correctly:** Local dev is fine, issue is with Access configuration  
❌ **If dev bypass doesn't work:** Check middleware code and .dev.vars file

---

### Step 2: Check Cloudflare Access Application

**Navigate to Zero Trust Dashboard:**
1. Go to https://one.dash.cloudflare.com/
2. Select your account
3. Navigate to **Zero Trust** → **Access** → **Applications**

**Verify Application Exists:**
- [ ] Application for staging worker exists
- [ ] Application domain: `environmenthub-stg.mrrainbowsmoke.workers.dev`
- [ ] Application type: Self-hosted
- [ ] Session duration: configured (e.g., 24 hours)

**Get Required Values:**

1. **Team Name/Domain:**
   - Location: Zero Trust → Settings → Custom Pages
   - Format: `rainbowsmoke` (without .cloudflareaccess.com)
   - Full URL: `https://rainbowsmoke.cloudflareaccess.com`

2. **Application AUD Tag:**
   - Location: Access → Applications → [Your App] → Overview
   - Look for "Application Audience (AUD) Tag"
   - Format: Long alphanumeric string (e.g., `abc123...xyz789`)

**Test Access Endpoint:**
```bash
# Replace TEAM_NAME with your actual team name
curl https://TEAM_NAME.cloudflareaccess.com/cdn-cgi/access/certs
```

**Expected Response:**
```json
{
  "keys": [
    {
      "kid": "...",
      "kty": "RSA",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ],
  "public_certs": [...]
}
```

✅ **If you get JSON with keys:** Team name is correct  
❌ **If 404 or error:** Team name is wrong, check Zero Trust dashboard

---

### Step 3: Verify Worker Secrets

**List current secrets:**
```bash
cd app-environmenthub/01stg
npx wrangler secret list
```

**Expected Output:**
```
 Secret Name            
─────────────────────── 
 CF_ACCESS_AUD         
 CF_ACCESS_TEAM_NAME   
 NOTION_API_KEY        
 NOTION_DATABASE_ID    
```

**Check secret values (if needed):**

Secrets are encrypted, but you can verify by:
1. Temporarily adding a debug endpoint that logs env vars (remove after testing)
2. Or re-set the secrets with known values

**Re-set secrets if unsure:**
```bash
# Interactive prompt - paste correct value
npx wrangler secret put CF_ACCESS_TEAM_NAME
npx wrangler secret put CF_ACCESS_AUD
```

---

### Step 4: Test Access App in Browser

**Visit Worker URL:**
```
https://environmenthub-stg.mrrainbowsmoke.workers.dev
```

**Expected Flow:**
1. Redirect to Access login page
2. Enter credentials (email, SSO, etc.)
3. Redirect back to worker
4. See worker response (may be 401 if secrets incorrect, but no Access error)

**Check JWT Token:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Find request to worker
5. Check **Request Headers** for:
   ```
   cf-access-jwt-assertion: eyJ...
   ```

**Extract JWT for Testing:**
```bash
# Copy JWT from browser headers, then:
JWT="eyJhbGc..."

curl -H "cf-access-jwt-assertion: $JWT" \
  https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
```

✅ **If returns health status:** Authentication working!  
❌ **If 401 "invalid Access token":** Secrets mismatch

---

### Step 5: Debug Access Verification

**Check Worker Logs:**
```bash
cd app-environmenthub/01stg
npx wrangler tail --format pretty
```

**Look for error messages:**
- `Access verification failed` - JWT verification failed
- `Failed to fetch Access certs` - Wrong team name
- `Unsupported alg` - Access app using wrong algorithm
- `Unauthorized: invalid Access token` - Generic verification failure

**Common Issues:**

| Log Message | Cause | Fix |
|------------|-------|-----|
| `Failed to fetch Access certs: 404` | Wrong team name | Update CF_ACCESS_TEAM_NAME secret |
| `JWT verification failed: invalid signature` | Wrong AUD or team name | Verify both secrets match Access app |
| `undefined is not a function` | Missing crypto.subtle | Use Node.js compat mode (already configured) |
| `Unauthorized: missing Cloudflare Access token` | No JWT in request | Check Access app is in front of worker |

---

## Common Error Scenarios

### Error: "missing Cloudflare Access token"

**Symptoms:**
- Request reaches worker
- No `cf-access-jwt-assertion` header present

**Possible Causes:**
1. Access app not configured for worker URL
2. Accessing worker without going through Access
3. Access app disabled/bypassed

**Solutions:**
1. Verify Access app domain matches worker URL exactly
2. Always access via `https://` (not direct IP)
3. Check Access app is enabled and not in bypass mode

---

### Error: "invalid Access token"

**Symptoms:**
- JWT present in headers
- Worker logs show "Access verification failed"

**Possible Causes:**
1. CF_ACCESS_TEAM_NAME incorrect
2. CF_ACCESS_AUD doesn't match application
3. JWT expired
4. JWT from different Access app

**Solutions:**
1. Re-verify team name from Zero Trust dashboard
2. Copy exact AUD tag from Access app settings
3. Get fresh JWT (re-login)
4. Ensure using JWT from correct Access app

---

### Error: "Failed to fetch Access certs"

**Symptoms:**
- Worker logs show fetch error
- HTTP 404 or network error

**Possible Causes:**
1. Team name has typo
2. Network issue (unlikely in Workers)
3. Access service down (very rare)

**Solutions:**
1. Double-check team name: `https://TEAM.cloudflareaccess.com/cdn-cgi/access/certs`
2. Test endpoint directly with curl
3. Check Cloudflare status page

---

## Alternative: Use Service Token for API Access

If you need programmatic access (no browser login):

**Create Service Token:**
1. Zero Trust → Access → Service Auth → Service Tokens
2. Create New Token
3. Name: "Environment Hub API"
4. Copy Client ID and Client Secret (shown once!)

**Add to Access Policy:**
1. Go to your Access Application
2. Add new policy or edit existing
3. Include: Service Auth → [Your Token Name]
4. Save

**Use in API Calls:**
```bash
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"

curl -H "CF-Access-Client-Id: $CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CLIENT_SECRET" \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
```

**Note:** Service token headers are different from JWT:
- JWT uses: `cf-access-jwt-assertion`
- Service token uses: `CF-Access-Client-Id` + `CF-Access-Client-Secret`

Our current middleware only supports JWT. To support service tokens, we'd need to modify the middleware (see Enhancement section below).

---

## Quick Fix Checklist

When you have authentication errors, run through this checklist:

1. **Test local dev bypass**
   ```bash
   curl -H "x-dev-bypass: true" http://localhost:8787/api/v1/health
   ```
   If this fails, local code issue.

2. **Verify team name with certs endpoint**
   ```bash
   curl https://YOUR_TEAM.cloudflareaccess.com/cdn-cgi/access/certs
   ```
   If 404, wrong team name.

3. **Check worker secrets**
   ```bash
   npx wrangler secret list
   ```
   Ensure all 4 required secrets exist.

4. **Get fresh JWT from browser**
   - Visit worker URL
   - Login via Access
   - Check DevTools → Network → Headers
   - Copy `cf-access-jwt-assertion` value

5. **Test with fresh JWT**
   ```bash
   curl -H "cf-access-jwt-assertion: YOUR_JWT" \
     https://environmenthub-stg.mrrainbowsmoke.workers.dev/api/v1/health
   ```

6. **Check logs for specific error**
   ```bash
   npx wrangler tail
   ```

7. **Re-deploy if secrets changed**
   ```bash
   npx wrangler deploy
   ```

---

## Temporary Workarounds

### Disable Access for Testing

**⚠️ ONLY FOR TESTING - NOT FOR PRODUCTION**

You can temporarily disable Access verification to test other functionality:

**Option 1: Use dev bypass in staging** (requires code change)
```typescript
// In src/middleware/access.ts
export async function accessGuard(c: Context, next: Next) {
  // Temporarily allow all requests
  return next(); // ⚠️ REMOVE THIS AFTER TESTING
  
  // ... rest of middleware
}
```

**Option 2: Remove Access app** (requires Access dashboard)
1. Go to Access → Applications
2. Delete or disable the application
3. Test worker directly
4. Re-enable after testing

**Remember to re-enable protection after testing!**

---

## Enhancement: Support Service Tokens

If you need service token support, update middleware:

```typescript
// In src/middleware/access.ts
const SERVICE_AUTH_ID = 'CF-Access-Client-Id';
const SERVICE_AUTH_SECRET = 'CF-Access-Client-Secret';

export async function accessGuard(c: Context, next: Next) {
  // Dev bypass
  const bypass = c.req.header(BYPASS_HEADER);
  if (bypass && bypass.toLowerCase() === 'true') {
    return next();
  }

  // Check for service token first
  const clientId = c.req.header(SERVICE_AUTH_ID);
  const clientSecret = c.req.header(SERVICE_AUTH_SECRET);
  
  if (clientId && clientSecret) {
    // Service tokens are validated by Cloudflare before reaching worker
    // If we received them, Access already validated them
    return next();
  }

  // Fall back to JWT validation
  const accessJwt = c.req.header(ACCESS_HEADER);
  // ... rest of JWT validation
}
```

---

## Need More Help?

**Documentation:**
- [Cloudflare Access Docs](https://developers.cloudflare.com/cloudflare-one/identity/)
- [Workers with Access](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
- [Service Tokens](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)

**Common Support Channels:**
- Cloudflare Community: https://community.cloudflare.com/
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Workers Discord: #access channel

**What to Include in Support Request:**
- Worker URL
- Expected behavior vs actual behavior
- Full error message from logs
- Steps to reproduce
- Team name (if not sensitive)

---

**Last Updated:** 2026-01-04  
**Version:** 1.0
