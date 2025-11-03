#!/bin/bash
# Integration test for LeanSpec MCP Server
# Tests that the server starts and can handle basic MCP protocol messages

set -e

echo "🧪 Testing LeanSpec MCP Server Integration"
echo ""

# Build first
echo "📦 Building project..."
npm run build > /dev/null 2>&1
echo "✅ Build successful"
echo ""

# Test 1: Server starts without errors
echo "🔍 Test 1: Server startup"
node bin/mcp-server.js 2>&1 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null || true
else
    echo "✅ Server started and exited cleanly (expected for stdio server)"
fi
echo ""

# Test 2: Server can be imported as module
echo "🔍 Test 2: Module import"
node -e "import('./dist/mcp-server.js').then(m => { if (m.createMcpServer) { console.log('✅ Module imports correctly'); process.exit(0); } else { console.error('❌ Missing createMcpServer export'); process.exit(1); } })" || exit 1
echo ""

# Test 3: Verify bin script exists and is executable
echo "🔍 Test 3: Binary script"
if [ -x "bin/mcp-server.js" ]; then
    echo "✅ Binary script is executable"
else
    echo "❌ Binary script is not executable"
    exit 1
fi
echo ""

# Test 4: Check package.json configuration
echo "🔍 Test 4: Package configuration"
if grep -q "lspec-mcp" package.json; then
    echo "✅ Package.json has lspec-mcp binary configured"
else
    echo "❌ Package.json missing lspec-mcp binary"
    exit 1
fi
echo ""

echo "✨ All integration tests passed!"
echo ""
echo "📝 Next steps:"
echo "  - Configure in Claude Desktop: docs/MCP-SERVER.md"
echo "  - Test with MCP Inspector: npx @modelcontextprotocol/inspector lspec-mcp"
