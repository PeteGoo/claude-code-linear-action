# Syncing with Upstream

This repo is a fork of [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action). We maintain two key branches:

- **`main`** — Our customized branch with Linear integration and other changes
- **`upstream-main`** — A clean mirror of upstream's `main` branch (no local changes)

## Syncing upstream changes

### 1. Update the upstream-main branch

```bash
git fetch upstream
git checkout upstream-main
git reset --hard upstream/main
git checkout main
```

### 2. Merge or rebase upstream changes into main

**Option A: Merge (preserves history, easier)**

```bash
git merge upstream-main
```

**Option B: Rebase (cleaner history, may require more conflict resolution)**

```bash
git rebase upstream-main
```

### 3. Push

```bash
# Push updated upstream-main
git push origin upstream-main

# Push updated main
git push origin main
```

## Conflict resolution tips

- Our Linear integration files (`src/linear/`, `docs/linear-integration.md`, the Cloudflare Worker) are entirely new — they shouldn't conflict with upstream changes.
- `README.md` will always conflict since we've rewritten it. Keep our version and review any upstream README changes for relevant updates to mention.
- `CLAUDE.md` may conflict if upstream updates it. Merge carefully, keeping our Linear-specific notes.
- `action.yml` and `src/entrypoints/run.ts` are the most likely sources of real conflicts since upstream actively develops these. Review changes carefully.
- When in doubt, compare the upstream change against our version using `git diff upstream-main -- <file>` to understand what upstream changed before resolving.
