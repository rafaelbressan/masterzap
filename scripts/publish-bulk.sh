#!/usr/bin/env bash
# Publish the consolidated export as a GitHub Release, so the site never
# serves the big files. The "latest" download URL stays stable:
#   https://github.com/rafaelbressan/masterzap/releases/latest/download/<file>
# Run after `npm run build`. Needs `gh` logged in.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
tag="data-$(date -u +%Y%m%d)"
notes="Export completo gerado em $(date -u +%Y-%m-%d). Ver https://www.masterwhats.com.br/api"
if gh release view "$tag" > /dev/null 2>&1; then
  gh release upload "$tag" release/masterwhats-export.zip release/masterwhats.md release/masterwhats.json --clobber
else
  gh release create "$tag" release/masterwhats-export.zip release/masterwhats.md release/masterwhats.json --title "Export $(date -u +%Y-%m-%d)" --notes "$notes"
fi
echo "publicado: $tag"
