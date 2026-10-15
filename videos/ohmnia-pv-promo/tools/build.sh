#!/usr/bin/env bash
# Rebuild index.html end to end: assemble → transitions → voiceover carve.
set -euo pipefail
cd "$(dirname "$0")/.."
SKILLS="$(cd ../../.claude/skills && pwd)"
node tools/assemble.mjs
node "$SKILLS/product-launch-video/scripts/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes .
node "$SKILLS/product-launch-video/scripts/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html
node "$SKILLS/hyperframes-audio/scripts/carve.mjs" --comp ./index.html --bed el-bgm | tail -4
node tools/duck.mjs
