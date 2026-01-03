# WIP Updates and Experiments

This file tracks work-in-progress experiments, improvements, and planned updates that are being explored but not yet finalized.

## Purpose

Use this file to:
- Document experimental features being investigated
- Track ongoing improvements and refactoring efforts
- Note ideas for future enhancements
- Keep research notes that inform development decisions

## Format

Each entry should include:
- Date started
- Description of the experiment/update
- Current status
- Next steps
- Outcome (when completed)

---

## Active Experiments

### Example: Evaluating New Caching Strategy
**Started:** 2026-01-03  
**Status:** In Progress  
**Description:** Investigating KV-based caching for API responses to reduce external API calls and improve response times.

**Progress:**
- Researched KV TTL options
- Created proof-of-concept in dev environment
- Initial testing shows 40% reduction in API calls

**Next Steps:**
- [ ] Load testing in staging
- [ ] Measure cache hit rates
- [ ] Document cache invalidation strategy
- [ ] Promote to production if metrics are positive

**Outcome:** _[To be filled when completed]_

---

## Completed Updates

### Example: Migrated to New Wrangler Version
**Started:** 2025-12-15  
**Completed:** 2025-12-20  
**Description:** Upgraded from Wrangler 2.x to 3.x

**Outcome:** Successfully migrated all tenants. Configuration simplified with new wrangler.jsonc format. Deployment times reduced by ~30%.

---

## Ideas for Future Exploration

- Evaluate Durable Objects for session management
- Consider implementing rate limiting at edge
- Explore R2 for media storage use cases
- Investigate Queue integration for async processing

---

## Notes

- Keep sensitive information out of this file
- Move completed experiments to "Completed Updates" section
- Archive very old entries periodically
- Cross-reference with INCIDENTS.md if experiments were triggered by production issues
