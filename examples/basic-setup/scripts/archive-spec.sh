#!/usr/bin/env bash

# archive-spec.sh - Archive a LeanSpec document
# Usage: ./archive-spec.sh <spec-file> [reason]
#   spec-file: path to the spec file to archive
#   reason: optional reason for archiving

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 <spec-file> [reason]"
    echo ""
    echo "Arguments:"
    echo "  spec-file   Path to the LeanSpec file to archive"
    echo "  reason      Optional reason for archiving (e.g., 'feature deprecated')"
    echo ""
    echo "Examples:"
    echo "  $0 ./specs/LEANSPEC_old-feature.md"
    echo "  $0 ./specs/LEANSPEC_old-feature.md 'Replaced by new implementation'"
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    usage
fi

SPEC_FILE="$1"
REASON="${2:-No reason provided}"

# Check if spec file exists
if [ ! -f "$SPEC_FILE" ]; then
    echo -e "${RED}Error: Spec file not found: $SPEC_FILE${NC}"
    exit 1
fi

# Get directory and filename
SPEC_DIR="$(dirname "$SPEC_FILE")"
SPEC_NAME="$(basename "$SPEC_FILE")"

# Create archive directory
ARCHIVE_DIR="$SPEC_DIR/archived"
mkdir -p "$ARCHIVE_DIR"

# Generate archive filename with timestamp
TIMESTAMP=$(date +%Y%m%d)
ARCHIVE_FILE="$ARCHIVE_DIR/${SPEC_NAME%.md}_archived_${TIMESTAMP}.md"

# If archive file already exists, add a counter
COUNTER=1
while [ -f "$ARCHIVE_FILE" ]; do
    ARCHIVE_FILE="$ARCHIVE_DIR/${SPEC_NAME%.md}_archived_${TIMESTAMP}_${COUNTER}.md"
    COUNTER=$((COUNTER + 1))
done

# Copy the spec to archive
cp "$SPEC_FILE" "$ARCHIVE_FILE"

# Add archive header to the archived file
ARCHIVE_DATE=$(date +%Y-%m-%d)
ARCHIVE_HEADER="---
**ARCHIVED**: $ARCHIVE_DATE
**Reason**: $REASON
**Original Location**: $SPEC_FILE

This spec has been archived and should be considered historical documentation only.
For current specifications, refer to the active specs directory.

---

"

# Prepend archive header
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "$ARCHIVE_HEADER" | cat - "$ARCHIVE_FILE" > "$ARCHIVE_FILE.tmp" && mv "$ARCHIVE_FILE.tmp" "$ARCHIVE_FILE"
else
    # Linux
    echo "$ARCHIVE_HEADER" | cat - "$ARCHIVE_FILE" > "$ARCHIVE_FILE.tmp" && mv "$ARCHIVE_FILE.tmp" "$ARCHIVE_FILE"
fi

echo -e "${GREEN}✓ Archived spec: $ARCHIVE_FILE${NC}"
echo ""
echo "The original file is still at: $SPEC_FILE"
echo ""
read -p "Delete the original file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$SPEC_FILE"
    echo -e "${GREEN}✓ Deleted original file${NC}"
else
    echo -e "${YELLOW}Original file kept. You may want to delete it manually.${NC}"
fi

echo ""
echo "Archive location: $ARCHIVE_FILE"
