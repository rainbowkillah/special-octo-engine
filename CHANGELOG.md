# Changelog

All notable changes to this monorepo template will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Environment Hub**: New `app-environmenthub` tenant for centralized environment variable, secret, and binding management.
  - Bidirectional sync between Notion database and Cloudflare D1.
  - Web dashboard with Cloudflare Access authentication.
  - Scheduled syncs (15min dev, 1hr staging, 6hr production).
  - REST API for CRUD operations on configuration entries.

### Changed
- Updated repository documentation for accuracy and consistency.
- Clarified tenant naming conventions in root README.
- Added `app-environmenthub` to tenant list and project structure diagram.
- Updated `.gitignore` to exclude Notion export directories.

## [0.1.0] — 2026-01-03

### Added
- Established multi-tenant, multi-environment repo structure.
- Three tenants: `com-mrrainbowsmoke`, `com-rainbowsmokeofficial`, `com-ai`.
- Environment folders (`02dev`, `01stg`, `00prd`) per tenant.
- Baseline documentation, agent guidance, and planning templates.
- LLM/agent context directory (`.llm/`) with environment-specific prompts.
- VSCode workspace configuration (`cf.code-workspace`).

### Security
- Removed embedded secrets from MCP configuration files.
