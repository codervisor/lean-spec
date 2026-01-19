#!/bin/bash
# Copy platform binaries from artifacts to package directories
# 
# Usage:
#   ./scripts/copy-platform-binaries.sh <artifacts-dir>
#
# Example:
#   ./scripts/copy-platform-binaries.sh artifacts/

set -e

if [ -z "$1" ]; then
  echo "Error: Missing artifacts directory argument"
  echo "Usage: $0 <artifacts-dir>"
  exit 1
fi

ARTIFACTS_DIR="$1"
PLATFORMS="darwin-x64 darwin-arm64 linux-x64 windows-x64"

echo "📦 Copying platform binaries from $ARTIFACTS_DIR"
echo ""

for platform in $PLATFORMS; do
  echo "Processing platform: $platform"
  
  # CLI binaries
  if [ -d "$ARTIFACTS_DIR/binaries-$platform" ]; then
    mkdir -p "packages/cli/binaries/$platform"
    cp "$ARTIFACTS_DIR/binaries-$platform/lean-spec"* "packages/cli/binaries/$platform/" || true
    echo "  ✓ Copied CLI binaries"
  else
    echo "  ⚠ WARNING: Missing artifacts/binaries-$platform"
  fi
  
  # MCP binaries
  if [ -d "$ARTIFACTS_DIR/binaries-$platform" ]; then
    mkdir -p "packages/mcp/binaries/$platform"
    cp "$ARTIFACTS_DIR/binaries-$platform/leanspec-mcp"* "packages/mcp/binaries/$platform/" || true
    echo "  ✓ Copied MCP binaries"
  else
    echo "  ⚠ WARNING: Missing MCP binaries for $platform"
  fi
  
  # HTTP server binaries
  if [ -d "$ARTIFACTS_DIR/binaries-$platform" ]; then
    mkdir -p "packages/http-server/binaries/$platform"
    cp "$ARTIFACTS_DIR/binaries-$platform/leanspec-http"* "packages/http-server/binaries/$platform/" || true
    echo "  ✓ Copied HTTP server binaries"
  else
    echo "  ⚠ WARNING: Missing HTTP server binaries for $platform"
  fi
done

echo ""
echo "✅ Binary copying complete"
echo ""
echo "Copied binaries:"
find packages/cli/binaries packages/mcp/binaries packages/http-server/binaries -type f \( -name "lean-spec*" -o -name "leanspec-mcp*" -o -name "leanspec-http*" \) | sort
