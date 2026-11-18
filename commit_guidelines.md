# Commit Guidelines for Solara Bay Project

## Goal
Make each commit **atomic**, **self‑contained**, and **easy to understand**.  This helps code review, CI, and future maintenance when we start adding large numbers of assets (buildings, roads, trees, textures, etc.).

## Recommended Workflow
1. **Create a branch** for the logical change (e.g. `feat/tokyo‑tower`, `refactor/road‑grid`).
2. **Make small, related changes** (add files, edit code, update docs).  Try to keep the number of files per commit < 20.
3. **Stage only the files that belong to the change**:
   ```bash
   git add path/to/file1 path/to/file2
   ```
4. **Write a clear commit message** using the *Conventional Commits* format:
   ```text
   <type>(<scope>): <short summary>
   
   <optional body – why the change was needed, important notes>
   
   BREAKING CHANGE: <explanation>   # only if it breaks the API
   ```
   *Types*: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`.
   *Scope* is optional but useful (e.g. `assets`, `integration`, `ci`).
5. **Push the branch** and open a Pull Request.  CI will run on every push.
6. **Squash‑merge** (or rebase‑merge) the PR to keep a linear history.

## Example
```bash
# On a new branch
git checkout -b feat/tokyo‑tower
# Add a GLB model and a descriptor
git add client/assets/models/japan/tokyo_tower.glb
git add client/assets/buildings/japan/tokyo_tower.js
# Commit with a clear title and body
git commit -m "feat(assets): add Tokyo Tower GLB model and descriptor" -m "
* Added high‑poly GLB for Tokyo Tower.
* Updated `tokyo_tower.js` to export `modelUrl`.
* This enables `applyJapanIntegration` to load the real building.
"
# Push and create PR
git push origin feat/tokyo‑tower
```

## Automated Helper (optional)
A tiny script `git‑commit‑helper.sh` is provided to prompt for the type, scope, and summary, then run `git add` and `git commit` for you.
```bash
#!/usr/bin/env bash
# Usage: ./git-commit-helper.sh file1 [file2 ...]
# The script will ask for type, scope, and summary, then commit.

type=$(printf "feat\nfix\nrefactor\ndocs\nstyle\nchore\ntest\n" | fzf --prompt='Commit type> ')
read -p "Scope (optional, e.g. assets, integration): " scope
read -p "Short summary: " summary
files=$@
if [ -n "$scope" ]; then
  header="$type($scope): $summary"
else
  header="$type: $summary"
fi

git add $files

git commit -m "$header"
```
Place this script in the repo root (`git-commit-helper.sh`) and make it executable (`chmod +x git-commit-helper.sh`).

---
By following these guidelines, each logical change—whether it’s adding a single building model or a whole road network—will be tracked with a concise, informative commit. This makes the project easier to navigate as we gradually build the full‑scale Tokyo city.
