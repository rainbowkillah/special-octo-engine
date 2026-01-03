# Investigation Notes and Design Documents

This file contains research notes, architectural investigations, and design documents for significant features or changes.

## Purpose

Use this file to:
- Document research into new technologies or approaches
- Design significant features before implementation
- Evaluate architectural decisions
- Record trade-off analysis
- Share knowledge about complex topics

## Format

Research entries should include context, findings, and recommendations.

---

## Active Research

### Example: Evaluating Durable Objects for Real-Time Features
**Date Started:** 2026-01-03  
**Researcher:** Team  
**Status:** Active Investigation

#### Context
We're exploring whether Durable Objects could improve our real-time notification system, which currently uses polling.

#### Questions to Answer
- Can Durable Objects reduce latency compared to polling?
- What are the cost implications on our Free tier?
- How does it scale compared to current approach?
- What are the migration complexities?

#### Research Notes

**Durable Objects Basics:**
- Single-threaded, strongly consistent
- Automatic state persistence
- WebSocket support for real-time
- Billed per GB-second and requests

**Current Polling Approach:**
- Client polls every 30 seconds
- Simple to implement and understand
- Works well for current scale
- Higher latency (up to 30s delay)

**Durable Objects Approach:**
- WebSocket connections for instant updates
- More complex state management
- Requires migration plan for existing sessions
- Better UX with instant notifications

#### Trade-offs

| Factor | Polling | Durable Objects |
|--------|---------|----------------|
| Latency | High (30s) | Low (<1s) |
| Complexity | Low | High |
| Cost | Predictable | Variable |
| Scalability | Good | Excellent |
| Browser Support | Universal | Modern only |

#### Proof of Concept Plan
1. Build minimal DO-based notification system in dev
2. Measure latency and resource usage
3. Estimate costs at current and 10x scale
4. Test with various client scenarios
5. Document migration path from polling

#### Next Steps
- [ ] Create proof of concept in dev environment
- [ ] Measure performance metrics
- [ ] Calculate cost projections
- [ ] Present findings to team
- [ ] Decide: implement, defer, or reject

**Recommendation:** _[To be completed after research]_

---

## Completed Research

### Example: Selection of TypeScript vs JavaScript
**Date:** 2025-11-15  
**Status:** Completed  

#### Decision
Use TypeScript for all new Workers.

#### Rationale
- Type safety catches errors at compile time
- Better IDE support and autocomplete
- Easier refactoring
- Wrangler has excellent TS support
- Minimal bundle size impact with proper config

#### Trade-offs Accepted
- Slight increase in build complexity
- Learning curve for team members new to TS

**Outcome:** Implemented. All new Workers use TypeScript. Team productivity improved due to better tooling.

---

## Design Documents

### Example: Multi-Tenant Architecture Design
**Date:** 2025-12-01  
**Status:** Implemented

#### Overview
Design a monorepo structure that supports multiple independent tenants (brands/domains) while sharing common infrastructure code.

#### Requirements
- Isolate tenant configurations and deployments
- Share common code and utilities
- Support independent promotion flows per tenant
- Clear environment progression (dev → stg → prd)

#### Design

**Directory Structure:**
```
com-{tenant}/
├── 00prd/          # Production
├── 01stg/          # Staging
└── 02dev/          # Development
    ├── src/        # Worker code
    ├── wrangler.jsonc
    ├── CHANGELOG.md
    └── .dev.vars
```

**Key Decisions:**
1. Directory-based environments (not git branches)
2. Numeric prefixes for sort order (00prd first in listings)
3. Per-environment wrangler.jsonc files
4. Shared code at workspace level when needed

**Alternatives Considered:**
- Git branch-based environments (rejected: too complex)
- Single wrangler.toml with multiple environments (rejected: harder to manage)
- Separate repos per tenant (rejected: too much duplication)

#### Implementation Status
✅ Implemented and in use across all tenants.

---

## Research Topics to Explore

Ideas for future investigation:

- **Queue Integration:** Could Cloudflare Queues improve our async processing?
- **R2 for Assets:** Cost-benefit analysis of R2 vs external CDN
- **Edge Analytics:** Built-in analytics vs external service
- **Workers AI:** Use cases for LLM integration at edge
- **Hyperdrive:** Database connection pooling benefits

---

## Notes

- Keep research focused and actionable
- Document decisions to prevent re-litigating later
- Archive old research periodically
- Cross-reference with UPDATES.md when research leads to implementation
- Sanitize any sensitive information before committing
