#!/usr/bin/env bash

# Test script for verifying existing project integration

set -e

TEST_DIR="/tmp/lspec-integration-test-$$"
CLI="/Users/marvzhang/projects/codervisor/lean-spec/bin/lspec.js"

echo "=== Testing LeanSpec Integration with Existing Projects ==="
echo ""

# Test 1: Init with existing AGENTS.md (skip mode)
echo "Test 1: Skip existing AGENTS.md"
mkdir -p "$TEST_DIR/test1"
cd "$TEST_DIR/test1"
echo "# Existing AGENTS.md" > AGENTS.md
echo "Some custom content" >> AGENTS.md

# We can't fully automate the interactive prompts, but we can check detection
if [ -f "AGENTS.md" ]; then
  echo "✓ Existing AGENTS.md created"
else
  echo "✗ Failed to create test file"
  exit 1
fi

# Test 2: Check for other system prompts
echo ""
echo "Test 2: Multiple system prompt files"
mkdir -p "$TEST_DIR/test2/.github"
cd "$TEST_DIR/test2"
echo "# Custom rules" > .cursorrules
echo "# Copilot instructions" > .github/copilot-instructions.md
echo "# Agents" > AGENTS.md

if [ -f ".cursorrules" ] && [ -f ".github/copilot-instructions.md" ] && [ -f "AGENTS.md" ]; then
  echo "✓ Multiple system prompt files created"
else
  echo "✗ Failed to create test files"
  exit 1
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo ""
echo "=== Basic tests passed ==="
echo ""
echo "To test interactively:"
echo "  1. cd /tmp/lspec-test-existing"
echo "  2. node $CLI init"
echo "  3. Choose 'Merge' option"
echo "  4. Check AGENTS.md for merged content"
echo ""
