#!/bin/bash
# Runs on SessionStart. In a worktree: installs deps.
# In the main repo: exits immediately (no-op).

set -e

# ── Worktree detection ────────────────────────────────────────────────────────
# In a worktree, git-dir differs from git-common-dir.
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || exit 0
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null) || exit 0

if [ "$GIT_DIR" = "$GIT_COMMON_DIR" ]; then
  exit 0  # main repo — skip
fi

WORKTREE_ROOT=$(git rev-parse --show-toplevel)
cd "$WORKTREE_ROOT"
mkdir -p .claude

# ── npm install (skip if node_modules is up to date) ─────────────────────────
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo "Running npm install…"
  npm install
fi
