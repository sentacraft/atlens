# Atlens Agent Configuration

## Ownership

| Asset | Authoritative source | Native entry point |
|---|---|---|
| Claude, Codex and Antigravity project hooks | `config.yaml` in this directory | `.claude/settings.json`, `.codex/hooks.json` and `.agents/hooks.json`, synchronized by Skillshare |
| Hook implementation | `scripts/worktree-setup.sh` and `scripts/hooks/` | Commands called by the native hooks |
| Project instructions | Root `AGENTS.md` | The `CLAUDE.md` symlink and native client loading |
| Project delivery of shared skills | User-level Skillshare skill pool and local project registration | Project `.claude/skills/` and `.agents/skills/` |

The project source manages dependency setup on `SessionStart` and UI tokens, site facts, Chinese placement, and launch-checklist checks on `PostToolUse` across all three clients. Each binding preserves the client's event shape and matcher.

## Maintenance

Edit hook registrations in `config.yaml` and implementation in the corresponding scripts. Do not independently edit the generated native hook entries. Other unmanaged settings in each native file must be preserved.

From the repository root, preview with `skillshare hooks sync -p --dry-run --json`, then apply with `skillshare hooks sync -p --json`. The global Library does not include this project's hook definitions.

Adoption preserves all five commands, events, matchers, timeouts, and command order. Track the project source and native settings; keep local logs and caches out of Git. Successful synchronization does not prove that every lifecycle event has fired.
