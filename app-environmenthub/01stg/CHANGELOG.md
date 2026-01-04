# Changelog - Environment Hub (Staging)

Staging environment changelog for Environment Hub.

## [Unreleased]

## [1.0.0] — 2026-01-04

### Changed - Architecture Refactor
- **BREAKING**: Removed Notion sync - D1 is now the primary datastore
- Removed `lib/notion/` and `lib/sync/` directories
- Removed scheduled sync handler from worker
- Removed cron triggers from wrangler.jsonc
- Updated database schema: `notion_id` now nullable

### Added
- **Full CRUD UI**: Dashboard now includes Add/Edit/Delete forms
- **POST /api/v1/entries**: Create new entries
- **PUT /api/v1/entries/:id**: Update existing entries
- **DELETE /api/v1/entries/:id**: Delete entries
- Modal-based entry management interface
- Improved form validation and error handling

### Removed
- POST /api/v1/sync endpoint (no longer needed)
- Notion API integration
- Scheduled background sync
- NOTION_API_KEY and NOTION_DATABASE_ID secrets

### Fixed
- Database client now uses `??` for defaults instead of `||`
- Proper handling of required fields (value_type, required)
- Entry creation with all necessary schema fields

### Deployed
- ✅ **Version**: `4274fd0a-bd01-43b6-a1c6-a66fcc2572b6`
- URL: `https://environmenthub-stg.mrrainbowsmoke.workers.dev`
- Status: Validated and working ✅

## [0.1.0] — 2026-01-04

### Deployed
- ✅ **First Staging Deployment**: Worker successfully deployed to Cloudflare
  - URL: `https://environmenthub-stg.mrrainbowsmoke.workers.dev`
  - Version ID: `c2ffb2e6-3c9c-4928-a5b2-dcb3dd8c67db`
  - Bindings: D1 Database (environmenthub-stg), KV Namespace (CACHE)
  - Cron Schedule: Every hour (0 * * * *)
  - Cloudflare Access: Enforced (401 responses without valid JWT)

### Added
- Staging environment setup
- Staging D1 database configuration
- Hourly scheduled sync interval for pre-production validation

## Deployment Notes

- Environment: Staging
- Purpose: Pre-production validation and testing
- D1 Database: `environmenthub-stg` (1da3307c-452a-4f30-a7ea-f4d9359a0af5)
- Architecture: D1-primary with web UI management
