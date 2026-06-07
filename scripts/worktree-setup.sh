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
# Guard on npm's install marker (node_modules/.package-lock.json), not on the
# directory itself: tools like vitest and turbopack drop caches under
# node_modules/ (e.g. .vite, .cache), so a bare `-d node_modules` check sees the
# directory exist and wrongly assumes deps are installed — leaving an empty
# node_modules that breaks `next dev` (Turbopack can't resolve `next`).
INSTALL_MARKER="node_modules/.package-lock.json"
if [ ! -e "$INSTALL_MARKER" ] || [ "package.json" -nt "$INSTALL_MARKER" ]; then
  echo "Running npm install…"
  npm install
fi
