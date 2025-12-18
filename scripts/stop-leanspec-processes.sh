#!/usr/bin/env bash
# stop-leanspec-processes.sh
# Stops all running lean-spec and leanspec-mcp processes
# Useful before rebuilding or when processes are stuck

echo "🔍 Looking for lean-spec processes..."

# Find all lean-spec related processes (excluding this script and grep)
PIDS=$(ps aux | grep -E "lean-spec|leanspec-mcp" | grep -v grep | grep -v "stop-leanspec-processes" | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "✅ No lean-spec processes found"
  exit 0
fi

echo "🛑 Found processes to stop:"
ps aux | grep -E "lean-spec|leanspec-mcp" | grep -v grep | grep -v "stop-leanspec-processes"
echo ""

for PID in $PIDS; do
  echo "  Killing PID $PID..."
  kill "$PID" 2>/dev/null || true
done

# Wait a moment for processes to exit
sleep 1

# Check if any survived
REMAINING=$(ps aux | grep -E "lean-spec|leanspec-mcp" | grep -v grep | grep -v "stop-leanspec-processes" | wc -l)

if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  Some processes didn't stop, force killing..."
  for PID in $PIDS; do
    kill -9 "$PID" 2>/dev/null || true
  done
fi

echo "✅ All lean-spec processes stopped"
