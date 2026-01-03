# Repository Guidelines

## Project Structure & Module Organization

- Root has shared docs only (`README.md`, `CHANGELOG.md`).
- Tenants live at the root (e.g., `com-yourbrand`, `com-yourotherbrand`).
- Env order per tenant: `02dev/` → `01stg/` → `00prd/`.
- Each env owns `wrangler.{jsonc,toml}`, secrets, and its `CHANGELOG.md`.
- Code typically lives under env dirs (example:
  `com-yourbrand/02dev/src/index.ts`).

## Build, Test, and Development Commands

- Commands are run from a tenant env directory. Example:
  `cd com-yourbrand/02dev`.

- Dev server
  - Command: `wrangler dev src/index.ts --test-scheduled --var ENV=dev`
  - Example `cd`: `cd com-yourbrand/02dev`
- Deploy (dev)
  - Command: `wrangler deploy --env dev`
  - Example `cd`: `cd com-yourbrand/02dev`
- Deploy (stg)
  - Command: `wrangler deploy --env stg`
  - Example `cd`: `cd com-yourbrand/01stg`
- Deploy (prd)
  - Command: `wrangler deploy --env prd`
  - Example `cd`: `cd com-yourbrand/00prd`
- Logs
  - Command: `wrangler tail --env dev|stg|prd`
  - Example `cd`: `cd com-yourbrand/01stg`

Deploy sequence per tenant (dev → stg → prd):

```bash
cd com-yourbrand/02dev && wrangler deploy --env dev
cd com-yourbrand/01stg && wrangler deploy --env stg
cd com-yourbrand/00prd && wrangler deploy --env prd
```

Staging/production smoke checks:

- Hit the URL, verify a 200 response and critical flows (home, one API route).
- Watch logs during the check: `wrangler tail --env stg` or
  `wrangler tail --env prd`.

## Coding Style & Naming Conventions

- Match existing style; no formatter or linter enforced yet.
- Use clear names; keep env config in the matching env folder.
- Keep promotion order: `02dev` → `01stg` → `00prd`.

## Testing Guidelines

- No test runner yet; document any new test command in the nearest tenant
  `README.md`.
- For edge-like validation, use `wrangler dev --local` or manual checks via
  `wrangler dev`.

## Commit & Pull Request Guidelines

- Commit messages: concise, imperative subject, optional scope (e.g.,
  `fix: tighten wrangler dev script`).
- PRs: summary, linked issue/ticket, testing notes, screenshots/logs for
  UI/edge changes.
- Update `CHANGELOG.md` for user-visible changes (tenant root plus affected env
  changelog).

## Security & Configuration Tips

- Keep secrets out of git; use `wrangler secret put` and local `.dev.vars`.
- Scrub PII/tokens from prompt/context files before committing.

## Agent-Specific Notes

- Shared agent guidance and plans live under `.llm/` when present; update plan
  files first, then promote finalized guidance into environment prompts.
