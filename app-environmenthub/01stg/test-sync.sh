#!/bin/bash
# Quick Sync Testing Script for Environment Hub Staging
# Run from: app-environmenthub/01stg

set -e

echo "🔄 Environment Hub - Sync Testing"
echo "=================================="
echo ""

# Check if JWT is set
if [ -z "$JWT" ]; then
    echo "⚠️  JWT token not set!"
    echo ""
    echo "To get your JWT token:"
    echo "1. Visit: https://environmenthub-stg.mrrainbowsmoke.workers.dev"
    echo "2. Login via Cloudflare Access"
    echo "3. Open DevTools (F12) → Network → Refresh page"
    echo "4. Find 'cf-access-jwt-assertion' header"
    echo "5. Run: export JWT=\"your_token_value\""
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ JWT token found"
echo ""

STAGING_URL="https://environmenthub-stg.mrrainbowsmoke.workers.dev"

# Test 1: Health Check
echo "🏥 Testing health endpoint..."
HEALTH=$(curl -s -H "cf-access-jwt-assertion: $JWT" "$STAGING_URL/api/v1/health")
echo "$HEALTH" | jq .

if echo "$HEALTH" | grep -q '"success":true'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

echo ""
echo "─────────────────────────────────────"
echo ""

# Test 2: Notion → D1 Sync
echo "📥 Testing Notion → D1 sync..."
echo "This will import data from Notion database into D1"
echo ""

SYNC_RESULT=$(curl -s -X POST \
    -H "cf-access-jwt-assertion: $JWT" \
    -H "Content-Type: application/json" \
    -d '{"direction": "notion_to_d1"}' \
    "$STAGING_URL/api/v1/sync")

echo "$SYNC_RESULT" | jq .

if echo "$SYNC_RESULT" | grep -q '"success":true'; then
    echo ""
    echo "✅ Notion → D1 sync succeeded!"
    
    # Extract stats
    PROCESSED=$(echo "$SYNC_RESULT" | jq -r '.data.processed // 0')
    CREATED=$(echo "$SYNC_RESULT" | jq -r '.data.created // 0')
    UPDATED=$(echo "$SYNC_RESULT" | jq -r '.data.updated // 0')
    
    echo "   📊 Stats:"
    echo "      • Processed: $PROCESSED entries"
    echo "      • Created: $CREATED new"
    echo "      • Updated: $UPDATED existing"
    
elif echo "$SYNC_RESULT" | grep -q "Notion API error"; then
    echo ""
    echo "❌ Notion API Error"
    echo ""
    echo "Possible causes:"
    echo "  • API key is invalid (should start with 'secret_')"
    echo "  • Database ID is incorrect"
    echo "  • Database not shared with integration"
    echo ""
    echo "To fix:"
    echo "  1. Go to: https://www.notion.so/my-integrations"
    echo "  2. Create/verify integration"
    echo "  3. Share database with integration"
    echo "  4. Update secret: npx wrangler secret put NOTION_API_KEY"
    exit 1
else
    echo ""
    echo "❌ Sync failed with unexpected error"
    exit 1
fi

echo ""
echo "─────────────────────────────────────"
echo ""

# Test 3: Check D1 Database
echo "💾 Checking D1 database..."
ENTRY_COUNT=$(npx wrangler d1 execute DB --remote --command \
    "SELECT COUNT(*) as count FROM environment_hub" 2>/dev/null | grep -o '[0-9]\+' | tail -1)

echo "   Total entries in D1: $ENTRY_COUNT"

if [ "$ENTRY_COUNT" -gt 0 ]; then
    echo "✅ D1 has data!"
    echo ""
    echo "   Sample entries:"
    npx wrangler d1 execute DB --remote --command \
        "SELECT id, key, environment_type, tenant, is_sensitive 
         FROM environment_hub LIMIT 3" 2>/dev/null | tail -n +2
else
    echo "⚠️  D1 is empty (sync may have failed or Notion database is empty)"
fi

echo ""
echo "─────────────────────────────────────"
echo ""

# Test 4: API Query
echo "🔍 Testing API query..."
ENTRIES=$(curl -s -H "cf-access-jwt-assertion: $JWT" \
    "$STAGING_URL/api/v1/entries?limit=5")

ENTRY_COUNT_API=$(echo "$ENTRIES" | jq -r '.meta.total // 0')
echo "   API reports $ENTRY_COUNT_API total entries"

if [ "$ENTRY_COUNT_API" -gt 0 ]; then
    echo "✅ API returns data"
    echo ""
    echo "   Sample entry keys:"
    echo "$ENTRIES" | jq -r '.data[].key' | head -3 | sed 's/^/      • /'
else
    echo "⚠️  API returns no data"
fi

echo ""
echo "─────────────────────────────────────"
echo ""

# Test 5: D1 → Notion Sync (optional, only if data exists)
if [ "$ENTRY_COUNT" -gt 0 ]; then
    echo "📤 Testing D1 → Notion sync..."
    echo "This will update Notion with any D1 changes"
    read -p "   Proceed? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        D1_SYNC=$(curl -s -X POST \
            -H "cf-access-jwt-assertion: $JWT" \
            -H "Content-Type: application/json" \
            -d '{"direction": "d1_to_notion"}' \
            "$STAGING_URL/api/v1/sync")
        
        echo "$D1_SYNC" | jq .
        
        if echo "$D1_SYNC" | grep -q '"success":true'; then
            echo "✅ D1 → Notion sync succeeded!"
        else
            echo "❌ D1 → Notion sync failed"
        fi
    else
        echo "⏭️  Skipped D1 → Notion sync"
    fi
fi

echo ""
echo "─────────────────────────────────────"
echo ""
echo "🎉 Sync testing complete!"
echo ""
echo "Next steps:"
echo "  • View dashboard: https://environmenthub-stg.mrrainbowsmoke.workers.dev/"
echo "  • Watch logs: npx wrangler tail"
echo "  • Check sync log: npx wrangler d1 execute DB --remote --command 'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5'"
echo ""
