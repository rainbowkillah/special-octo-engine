# 02dev Environment — Local Development Prompt (Template)

## Purpose

Primary sandbox for rapid iteration, testing, and experimentation. All code
changes start here before promotion to staging and production.

## Key Commands

- Local dev: `cd com-yourbrand/02dev && wrangler dev src/index.ts --test-scheduled --var ENV=dev --local`
- Deploy to dev: `wrangler deploy --env dev`
- Live logs: `wrangler tail --env dev`
- Set secrets: `wrangler secret put <NAME> --env dev`
- Use `.dev.vars` (git-ignored) for local testing without committing secrets

## Development Priorities

1. **Fast feedback loops** — Prefer `wrangler dev --local` for edge-like behavior.
2. **Testing** — Add unit tests and edge mocks where possible.
3. **Minimal logging** — Use `console.log` sparingly; rely on `wrangler tail`.
4. **Plan limits** — Verify current Cloudflare plan limits before load testing.

## Workflow

1. Make changes in the source tree.
2. Run `wrangler dev` locally to validate.
3. Add/update tests as you go.
4. When ready, `wrangler deploy --env dev`.
5. Manual testing in dev before promotion to staging.

## Tenant Paths

- Tenant A: `com-yourbrand/02dev/`
- Tenant B: `com-yourotherbrand/02dev/`

## Guidelines

- Keep commits small and focused; update the dev CHANGELOG.
- If adding new services (Durable Objects, Queues, etc.), document in CHANGELOG.
- Always test locally with `--local` before deploying to shared infrastructure.

See also: `.llm/docs/DEVELOPMENT.md` and `.llm/docs/TROUBLESHOOTING.md`.
