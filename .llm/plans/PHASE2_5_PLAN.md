# Phase 2.5 Plan - Environment Hub

**Status:** Phase 2 complete in code (dev/stg/prd source synced). Staging deployment not yet performed.

## Notes / Caveats
- Access verification supports RS256 JWKS from Cloudflare Access. If the Access app uses a different algorithm, extend the verifier.
- D1 → Notion sync updates existing pages by `notion_id` and skips the “Updated/Rotated By” people field (Notion requires user IDs). Ensure D1 values align with Notion select/multi-select options to avoid 400s.
- Local D1 seeding / `wrangler dev` was not re-run here due to sandbox limits; wrangler dev was proven separately. Seed with `src/schema/d1/init.sql` before exercising APIs if needed.

## What to Do Next
1) Set real secrets in `.dev.vars` (Notion keys + Access values) and rerun `wrangler dev`.
2) Call `/api/v1/sync` with `direction=notion_to_d1` and `direction=d1_to_notion` to confirm both paths.
3) Deploy to staging: `cd app-environmenthub/01stg && wrangler deploy --env stg` once dev smoke passes.
4) Validate dashboard filters/masking with real data; confirm Access enforcement with a real JWT.
5) (Optional) Polish dashboard UX and add targeted tests for DB filtering and sync edge cases.
