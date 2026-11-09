#!/usr/bin/env bash
# What a fork has done since the last time we looked at it.
#
#   scripts/fork-diff.sh <fork-url> <base-sha> [remote-name]
#
# Adds (once) and fetches the fork as a remote, then prints:
#   1. the commits after <base-sha>, oldest first;
#   2. the diffstat of code (everything outside data/ and public/);
#   3. the diffstat of data and media (data/ and public/);
#   4. the conversations whose existing message ids changed — a renumbering,
#      which must never be ported (see data/README.md, "id").
#
# It only reads. It never merges, rebases or checks anything out: changes from
# a fork are ported one feature at a time, by hand.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "uso: $0 <url-do-fork> <sha-base> [nome-do-remote]" >&2
  exit 2
fi
URL=$1
BASE=$2
REMOTE=${3:-fork}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if git remote get-url "$REMOTE" >/dev/null 2>&1; then
  if [[ "$(git remote get-url "$REMOTE")" != "$URL" ]]; then
    echo "o remote '$REMOTE' já aponta para $(git remote get-url "$REMOTE"); use outro nome" >&2
    exit 1
  fi
else
  git remote add "$REMOTE" "$URL"
  # Never push to a fork by accident.
  git remote set-url --push "$REMOTE" no-push
fi
git fetch --quiet "$REMOTE"

HEAD_REF=$(git symbolic-ref --quiet --short "refs/remotes/$REMOTE/HEAD" 2>/dev/null || echo "$REMOTE/main")
if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  echo "o SHA base $BASE não existe no fork nem aqui" >&2
  exit 1
fi
TIP=$(git rev-parse --short "$HEAD_REF")

echo "== $REMOTE ($URL)"
echo "   base $BASE → $HEAD_REF $TIP"
echo
echo "== commits novos"
git log --reverse --date=short --format='%h %ad %an  %s' "$BASE..$HEAD_REF"
echo
echo "== código"
git diff --stat=120 "$BASE" "$HEAD_REF" -- . ':!data' ':!public'
echo
echo "== dados e mídia"
git diff --stat=120 "$BASE" "$HEAD_REF" -- data public
echo
echo "== conversas com ids renumerados (não portar como estão)"
CHANGED=0
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT
while IFS= read -r path; do
  conv=$(basename "$path" .json)
  git show "$BASE:$path" > "$SCRATCH/before.json" 2>/dev/null || echo '{}' > "$SCRATCH/before.json"
  git show "$HEAD_REF:$path" > "$SCRATCH/after.json" 2>/dev/null || echo '{}' > "$SCRATCH/after.json"
  # id → (sender, timestamp, content), base against tip.
  out=$(node -e '
    const fs = require("fs");
    const [a, b] = process.argv.slice(1).map(f => JSON.parse(fs.readFileSync(f, "utf8")).messages || []);
    const key = m => JSON.stringify([m.sender, m.timestamp, m.content]);
    const before = new Map(a.map(m => [m.id, key(m)]));
    const after = new Map(b.map(m => [m.id, key(m)]));
    let changed = 0, gone = 0;
    for (const [id, k] of before) {
      if (!after.has(id)) gone++;
      else if (after.get(id) !== k) changed++;
    }
    if (changed || gone) console.log(`${changed} ids com outro conteúdo, ${gone} sumiram`);
  ' "$SCRATCH/before.json" "$SCRATCH/after.json")
  if [[ -n "$out" ]]; then
    echo "  $conv: $out"
    CHANGED=1
  fi
done < <(git diff --name-only "$BASE" "$HEAD_REF" -- 'data/conversations/*.json')
if [[ $CHANGED -eq 0 ]]; then echo "  nenhuma"; fi
echo
echo "Depois de classificar as mudanças, registre $TIP como a nova base."
