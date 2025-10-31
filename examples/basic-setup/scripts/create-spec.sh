#!/usr/bin/env bash

# create-spec.sh - Create a new LeanSpec document from template
# Usage: ./create-spec.sh <type> <name> [directory]
#   type: feature, api, or component
#   name: name of the spec (e.g., "user-export")
#   directory: optional directory path (defaults to current directory)

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(dirname "$SCRIPT_DIR")/spec-templates"

# Function to display usage
usage() {
    echo "Usage: $0 <type> <name> [directory]"
    echo ""
    echo "Arguments:"
    echo "  type        Template type: feature, api, or component"
    echo "  name        Name for the spec (e.g., 'user-export')"
    echo "  directory   Optional directory path (defaults to ./specs)"
    echo ""
    echo "Examples:"
    echo "  $0 feature user-export"
    echo "  $0 api payments ./src/api/specs"
    echo "  $0 component button ./src/components/specs"
    exit 1
}

# Check arguments
if [ $# -lt 2 ]; then
    usage
fi

TYPE="$1"
NAME="$2"
TARGET_DIR="${3:-./specs}"

# Validate type
case "$TYPE" in
    feature|api|component)
        TEMPLATE_FILE="$TEMPLATES_DIR/${TYPE}-template.md"
        ;;
    *)
        echo -e "${RED}Error: Invalid type '$TYPE'. Must be: feature, api, or component${NC}"
        usage
        ;;
esac

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Generate filename
SPEC_FILE="$TARGET_DIR/LEANSPEC_${NAME}.md"

# Check if spec already exists
if [ -f "$SPEC_FILE" ]; then
    echo -e "${YELLOW}Warning: Spec file already exists: $SPEC_FILE${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Copy template to new location
cp "$TEMPLATE_FILE" "$SPEC_FILE"

# Get current date
CURRENT_DATE=$(date +%Y-%m-%d)

# Replace placeholders in the new spec
# This works on both macOS and Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\[Date\]/$CURRENT_DATE/g" "$SPEC_FILE"
else
    # Linux
    sed -i "s/\[Date\]/$CURRENT_DATE/g" "$SPEC_FILE"
fi

echo -e "${GREEN}✓ Created new $TYPE spec: $SPEC_FILE${NC}"
echo ""
echo "Next steps:"
echo "  1. Open the file and fill in the template sections"
echo "  2. Replace [bracketed] placeholders with your content"
echo "  3. Delete sections that don't apply to your use case"
echo "  4. Commit the spec to version control"
echo ""
echo -e "${YELLOW}Remember: LeanSpec is about clarity, not completeness. Keep it lean!${NC}"
