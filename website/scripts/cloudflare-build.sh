#!/usr/bin/env bash
#
# Cloudflare Pages build entrypoint.
# The Pages build image pins an old bun, so install a pinned recent bun first.
# Dashboard settings (Root directory = website):
#   Build command:   bash scripts/cloudflare-build.sh
#   Output directory: dist
#
# Bump BUN_TAG to move to a newer bun (verify locally first with that binary).
set -euo pipefail

BUN_TAG="${BUN_TAG:-bun-v1.4.3}"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"

want="${BUN_TAG#bun-v}"
have="$("$BUN_INSTALL/bin/bun" --version 2>/dev/null || echo none)"
if [[ "$have" != "$want" ]]; then
  echo "Installing $BUN_TAG (have: $have)..."
  curl -fsSL https://bun.sh/install | bash -s -- "$BUN_TAG"
else
  echo "Reusing cached bun $have"
fi

export PATH="$BUN_INSTALL/bin:$PATH"
echo "bun $(bun --version) at $(command -v bun)"

bun install --frozen-lockfile
bun run build
