# Production Incidents and Postmortems

This file documents production incidents, their resolution, and lessons learned to prevent future occurrences.

## Purpose

Track production incidents to:
- Document what went wrong and why
- Record resolution steps taken
- Identify patterns and systemic issues
- Prevent similar incidents in the future
- Share knowledge across team

## Incident Template

```markdown
### Incident: [Brief Title]
**Date:** YYYY-MM-DD  
**Duration:** X hours/minutes  
**Severity:** Critical / High / Medium / Low  
**Affected Tenant(s):** com-{tenant}  
**Environment:** Production (00prd)

#### Impact
- What users/systems were affected
- Scope of the outage or degradation

#### Timeline
- HH:MM - Issue first detected
- HH:MM - Team alerted
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Issue resolved

#### Root Cause
Detailed explanation of what caused the issue.

#### Resolution
Steps taken to resolve the incident.

#### Prevention
Measures to prevent this from happening again:
- [ ] Action item 1
- [ ] Action item 2

#### Lessons Learned
Key takeaways from this incident.
```

---

## Incidents

### Example: API Rate Limit Exceeded
**Date:** 2026-01-01  
**Duration:** 45 minutes  
**Severity:** High  
**Affected Tenant(s):** com-mrrainbowsmoke  
**Environment:** Production (00prd)

#### Impact
- API requests failing with 429 errors
- Approximately 1,000 user requests failed
- 15% of traffic affected during peak hours

#### Timeline
- 14:23 - Monitoring alerts triggered for elevated error rates
- 14:25 - Team member investigated logs
- 14:30 - Identified third-party API rate limit being exceeded
- 14:35 - Deployed hotfix with caching layer
- 14:45 - Error rates returned to normal
- 15:08 - Validated fix in production, incident closed

#### Root Cause
Recent code deployment removed response caching, causing all requests to hit third-party API directly. Traffic spike during peak hours exceeded API rate limits.

#### Resolution
1. Quickly deployed caching layer using KV store
2. Cached responses for 5 minutes to reduce API calls
3. Monitored for 30 minutes to ensure stability

#### Prevention
- [x] Add rate limit testing to staging environment
- [x] Implement circuit breaker for third-party API calls
- [x] Add monitoring for third-party API usage
- [ ] Document third-party rate limits in DEVELOPMENT.md
- [ ] Create load testing procedure for staging

#### Lessons Learned
- Need better monitoring of third-party API usage
- Caching strategy should be more explicit and tested
- Staging environment should have rate limit testing
- Consider implementing request queuing for rate-limited APIs

---

## Incident Statistics

Track patterns over time:

- Total incidents this quarter: X
- Most common issue type: [e.g., Third-party API issues]
- Average resolution time: X minutes
- Trends: [Improving/Stable/Worsening]

---

## Notes

- **Always sanitize PII** before committing incidents to git
- Include enough detail to learn, but remove sensitive information
- Review incidents monthly to identify patterns
- Use incidents to drive improvements in monitoring and testing
- Cross-reference with UPDATES.md if fixes led to new features
