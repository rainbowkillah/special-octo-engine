#!/bin/bash
# Script to set all staging secrets for Environment Hub

set -e

echo "🔐 Setting Staging Secrets for Environment Hub"
echo "================================================"
echo ""
echo "You'll be prompted for each secret. Paste the value and press Enter."
echo ""

echo "1️⃣  NOTION_API_KEY (should start with 'secret_')"
npx wrangler secret put NOTION_API_KEY

echo ""
echo "2️⃣  NOTION_DATABASE_ID (32 char hex, no hyphens)"
npx wrangler secret put NOTION_DATABASE_ID

echo ""
echo "3️⃣  CF_ACCESS_TEAM_NAME (e.g., 'rainbowsmoke')"
npx wrangler secret put CF_ACCESS_TEAM_NAME

echo ""
echo "4️⃣  CF_ACCESS_AUD (long alphanumeric string)"
npx wrangler secret put CF_ACCESS_AUD

echo ""
echo "✅ All secrets set! Listing..."
npx wrangler secret list
