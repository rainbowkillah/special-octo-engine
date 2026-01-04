# Changelog - Environment Hub (Staging)

Staging environment changelog for Environment Hub.

## [Unreleased]

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
- Sync frequency: Every hour
- Purpose: Pre-production validation and testing
- D1 Database: `environmenthub-stg`
