#!/usr/bin/env bash
set -euo pipefail

rg --files \
  -g '*.md' \
  -g '!node_modules/**' \
  -g '!.git/**' \
  -g '!.wrangler/**' \
  . | xargs markdownlint
