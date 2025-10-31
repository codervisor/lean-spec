#!/usr/bin/env bash

# list-specs.sh - List all LeanSpec documents in the repository
# Usage: ./list-specs.sh [directory] [--archived]
#   directory: optional directory to search (defaults to current directory)
#   --archived: include archived specs in the listing

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [directory] [--archived]"
    echo ""
    echo "Arguments:"
    echo "  directory   Optional directory to search (defaults to current directory)"
    echo "  --archived  Include archived specs in the listing"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 ./src"
    echo "  $0 . --archived"
    exit 1
}

# Parse arguments
SEARCH_DIR="."
SHOW_ARCHIVED=false

for arg in "$@"; do
    case $arg in
        --archived)
            SHOW_ARCHIVED=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            if [ -d "$arg" ]; then
                SEARCH_DIR="$arg"
            else
                echo "Warning: Directory not found: $arg"
            fi
            shift
            ;;
    esac
done

# Function to extract status from spec
get_status() {
    local file="$1"
    local status=$(grep -i "^\*\*Status\*\*:" "$file" | head -1 | sed 's/.*Status\*\*: *//' | sed 's/\].*//' | sed 's/\[//')
    echo "${status:-Unknown}"
}

# Function to extract creation date
get_created_date() {
    local file="$1"
    local date=$(grep -i "^\*\*Created\*\*:" "$file" | head -1 | sed 's/.*Created\*\*: *//')
    echo "${date:-Unknown}"
}

# Function to format spec entry
format_spec() {
    local file="$1"
    local is_archived="$2"
    local rel_path="${file#$SEARCH_DIR/}"
    local status=$(get_status "$file")
    local created=$(get_created_date "$file")
    
    if [ "$is_archived" = true ]; then
        echo -e "${GRAY}  📦 $rel_path${NC}"
        echo -e "${GRAY}     Status: $status | Created: $created | ARCHIVED${NC}"
    else
        case "$status" in
            *Draft*)
                echo -e "${YELLOW}  📝 $rel_path${NC}"
                ;;
            *Progress*|*Active*)
                echo -e "${BLUE}  🚧 $rel_path${NC}"
                ;;
            *Complete*|*Ready*)
                echo -e "${GREEN}  ✓ $rel_path${NC}"
                ;;
            *)
                echo -e "${CYAN}  📄 $rel_path${NC}"
                ;;
        esac
        echo -e "     Status: $status | Created: $created"
    fi
    echo ""
}

echo ""
echo -e "${GREEN}=== LeanSpec Documents ===${NC}"
echo ""

# Find active specs
ACTIVE_SPECS=$(find "$SEARCH_DIR" -type f -name "LEANSPEC_*.md" ! -path "*/archived/*" ! -path "*/.git/*" | sort)

if [ -z "$ACTIVE_SPECS" ]; then
    echo "No active LeanSpec documents found in $SEARCH_DIR"
else
    echo -e "${CYAN}Active Specs:${NC}"
    echo ""
    while IFS= read -r spec; do
        format_spec "$spec" false
    done <<< "$ACTIVE_SPECS"
fi

# Find archived specs if requested
if [ "$SHOW_ARCHIVED" = true ]; then
    ARCHIVED_SPECS=$(find "$SEARCH_DIR" -type f -name "LEANSPEC_*_archived_*.md" -o -path "*/archived/LEANSPEC_*.md" | sort)
    
    if [ -n "$ARCHIVED_SPECS" ]; then
        echo ""
        echo -e "${GRAY}Archived Specs:${NC}"
        echo ""
        while IFS= read -r spec; do
            format_spec "$spec" true
        done <<< "$ARCHIVED_SPECS"
    fi
fi

# Summary
ACTIVE_COUNT=$(echo "$ACTIVE_SPECS" | grep -c "LEANSPEC_" || echo "0")
if [ "$SHOW_ARCHIVED" = true ]; then
    ARCHIVED_COUNT=$(find "$SEARCH_DIR" -type f \( -name "LEANSPEC_*_archived_*.md" -o -path "*/archived/LEANSPEC_*.md" \) | wc -l | tr -d ' ')
    echo ""
    echo -e "${CYAN}Total: $ACTIVE_COUNT active specs, $ARCHIVED_COUNT archived specs${NC}"
else
    echo ""
    echo -e "${CYAN}Total: $ACTIVE_COUNT active specs${NC}"
    echo -e "${GRAY}(Use --archived flag to include archived specs)${NC}"
fi

echo ""
