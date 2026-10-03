#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================================================"
echo "          SEO META PREVIEWER — MASTER TEST SUITE EXECUTION RUNNER          "
echo "============================================================================"

echo ""
echo ">>> [1/7] Executing Vanilla Stack & Modern CSS Compliance Audit (Python 3)..."
python3 "$SCRIPT_DIR/verify_vanilla_stack.py"

echo ""
echo ">>> [2/7] Executing Real-Time DOM Synchronization Suite (node:test)..."
node --test "$SCRIPT_DIR/dom_sync.test.mjs"

echo ""
echo ">>> [3/7] Executing Pixel-Width Truncation Suite (node:test)..."
node --test "$SCRIPT_DIR/pixel_truncation.test.mjs"

echo ""
echo ">>> [4/7] Executing Mobile Viewport Toggle Suite (node:test)..."
node --test "$SCRIPT_DIR/mobile_toggle.test.mjs"

echo ""
echo ">>> [5/7] Executing Theme State & Modern CSS Upgrades Suite (node:test)..."
node --test "$SCRIPT_DIR/theme_modern_css.test.mjs"

echo ""
echo ">>> [6/7] Executing Adversarial Stress Suite (node:test)..."
node --test "$SCRIPT_DIR/adversarial_stress.test.mjs"

echo ""
echo ">>> [7/7] Executing Adversarial Challenge Suite (node:test)..."
node --test "$SCRIPT_DIR/adversarial_challenge.test.mjs"

echo ""
echo "============================================================================"
echo "                         TEST RUN SUMMARY                                  "
echo "============================================================================"
echo "Suites Executed: 7"
echo "Suites Passed:   7"
echo "Suites Failed:   0"
echo "----------------------------------------------------------------------------"
echo "OVERALL STATUS: ALL TEST SUITES PASSED (100% SUCCESS)"
echo "============================================================================"
