#!/bin/sh
# Copies the data file and the scoring module from the data repo (Hockey-BuyLowSellHigh) into the portfolio.
# They belong together: copy both, and never edit rescore.js here (changes go in the data repo).
set -e
SRC="${1:-$HOME/Hockey-BuyLowSellHigh}"
cd "$(dirname "$0")/.."
cp "$SRC/public/players.json" public/data/players.json
cp "$SRC/web/rescore.js" src/design-system/buylow/rescore.js
echo "Copied players.json and rescore.js from $SRC"
