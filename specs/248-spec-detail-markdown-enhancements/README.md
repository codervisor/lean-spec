---
status: complete
created: 2026-01-29
priority: medium
tags:
- ui
- ux
- markdown
- enhancement
created_at: 2026-01-29T01:15:22.716843137Z
updated_at: 2026-01-29T01:15:22.716843137Z
---

# Spec Detail Page Markdown Rendering Enhancements

> **Status**: 🟢 Complete · **Priority**: Medium · **Created**: 2025-01-29 · **Tags**: ui, ux, markdown, enhancement

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: The spec detail page's markdown renderer lacks interactive features that would enhance the reading and data extraction experience. Users cannot easily copy code blocks, view enlarged Mermaid diagrams, or export table data for use in external tools like Excel.

**Request**: Enhance the `MarkdownRenderer` component with three key improvements:
1. **Advanced Code Blocks** - Copy button and language indicator
2. **Optimized Mermaid Diagrams** - Click-to-enlarge modal, remove redundant outer border
3. **Advanced Tables** - Copy to clipboard (Excel-compatible) and CSV export

**Impact**:
- Improved developer experience when working with spec content
- Faster extraction of code snippets and data from specs
- Better visualization of complex diagrams
- Professional data export capabilities for reporting and analysis

## Design

### 1. Advanced Code Blocks

**Current State**: Code blocks use `rehype-highlight` for syntax highlighting but have no copy functionality or language display.

**Enhanced Features**:
- **Copy Button**: Appears on hover (top-right corner), copies raw code to clipboard
- **Language Badge**: Shows language name (e.g., "typescript", "json") if specified in the fenced block
- **Visual Feedback**: Checkmark icon briefly shown after successful copy

```tsx
interface EnhancedCodeBlockProps {
  language: string | null;
  code: string;
  children: React.ReactNode;
}

function EnhancedCodeBlock({ language, code, children }: EnhancedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      {language && (
        <span className="absolute top-2 left-3 text-xs text-muted-foreground font-mono">
          {language}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <pre className="pt-8">{children}</pre>
    </div>
  );
}
```

### 2. Optimized Mermaid Diagrams

**Current State**: `MermaidDiagram` component renders diagrams inline with a border that duplicates Mermaid's own styling.

**Enhanced Features**:
- **Click to Enlarge**: Full-screen modal for complex diagrams with zoom/pan
- **Remove Outer Border**: Mermaid SVG already has its own styling; remove container border
- **Download as PNG/SVG** (stretch goal): Export diagram for presentations

```tsx
interface EnhancedMermaidProps {
  chart: string;
  className?: string;
}

function EnhancedMermaid({ chart, className }: EnhancedMermaidProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <div 
        className={cn("cursor-pointer hover:bg-muted/50 rounded-lg p-2", className)}
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="Click to enlarge diagram"
      >
        <MermaidDiagram chart={chart} />
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <MermaidDiagram chart={chart} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Border Removal**: Update existing `MermaidDiagram` component:
```tsx
// Current: border border-border rounded-lg
// New: no border wrapper, let Mermaid handle its own styling
<div className="my-4 flex justify-center overflow-x-auto">
  {/* SVG content */}
</div>
```

### 3. Advanced Tables

**Current State**: Tables render with basic GFM styling via `remarkGfm`, no interactivity.

**Enhanced Features**:
- **Copy Button**: Copies table as tab-separated values (TSV) for direct paste into Excel/Sheets
- **Export CSV**: Downloads table data as .csv file
- **Toolbar UI**: Small action bar above table (appears on hover or as persistent icons)

```tsx
interface EnhancedTableProps {
  children: React.ReactNode;
  tableData: string[][];  // Extracted from table structure
}

function EnhancedTable({ children, tableData }: EnhancedTableProps) {
  const copyAsExcel = async () => {
    // Convert to TSV (tab-separated) for Excel paste
    const tsv = tableData.map(row => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(tsv);
  };
  
  const exportCsv = () => {
    const csv = tableData.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="relative group">
      <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 flex gap-1">
        <Button size="sm" variant="ghost" onClick={copyAsExcel}>
          <ClipboardIcon className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={exportCsv}>
          <DownloadIcon className="h-4 w-4" />
        </Button>
      </div>
      <table>{children}</table>
    </div>
  );
}
```

**Table Data Extraction Strategy**:

Option A: Parse from rendered DOM after mount (simpler but less robust)
Option B: Custom remark plugin to extract table structure during AST traversal (more robust)

**Recommended**: Option B - Create a custom remark plugin that attaches table data to the `table` node, then access it in the component.

### Implementation Location

All enhancements are in `packages/ui/src/components/spec-detail/MarkdownRenderer.tsx`:

```tsx
function useMarkdownComponents(specName: string, basePath: string): Components {
  return {
    code({ className, children, ...props }) {
      // Enhanced code block logic
    },
    pre({ children, ...props }) {
      // Wrapper for code block with copy button
    },
    table({ children, ...props }) {
      // Enhanced table with copy/export
    },
    a({ href, children, ...props }) {
      // Existing link handling
    },
  };
}
```

## Plan

### Phase 1: Advanced Code Blocks
- [x] Create `EnhancedCodeBlock` component with copy button
- [x] Add language badge display for fenced code blocks
- [x] Implement copy-to-clipboard with visual feedback
- [x] Style hover states and button positioning
- [x] Handle inline code vs block code differentiation

### Phase 2: Optimized Mermaid Diagrams  
- [x] Remove outer border from `MermaidDiagram` container
- [x] Create `MermaidModal` dialog component for enlarged view
- [x] Add click handler to open modal from inline diagram
- [x] Ensure dark mode works correctly in modal
- [x] Add keyboard shortcuts (Escape to close)

### Phase 3: Advanced Tables
- [x] Create table data extraction utility (parse from AST or DOM)
- [x] Implement `EnhancedTable` wrapper component
- [x] Add copy-as-TSV functionality (Excel-compatible)
- [x] Add CSV export/download functionality
- [x] Style toolbar and action buttons

### Phase 4: Polish & Testing
- [x] Add tooltips to all action buttons
- [x] Ensure accessibility (ARIA labels, keyboard nav)
- [x] Test with various markdown content (edge cases)
- [x] Add loading states where needed
- [x] Document usage in component

## Test

### Code Block Tests
- [x] Copy button appears on hover for fenced code blocks
- [x] Language badge shows correct language name
- [x] Copying works and shows success feedback
- [x] Inline code (`like this`) does not show copy button
- [x] Code blocks without language specified work correctly

### Mermaid Diagram Tests
- [x] Diagrams render without double border
- [x] Clicking diagram opens enlarged modal
- [x] Modal displays diagram at larger size
- [x] Modal closes on Escape or click outside
- [x] Dark mode theme applies in modal

### Table Tests
- [x] Copy button copies as TSV (paste into Excel works)
- [x] Export downloads valid CSV file
- [x] Tables with special characters export correctly
- [x] Empty cells handled properly
- [x] Multi-row, multi-column tables work

### General Tests
- [x] No regressions in existing markdown rendering
- [x] Performance acceptable with many code blocks/tables
- [x] Works on mobile (touch-friendly buttons)
- [x] Accessibility: screen reader announces actions

## Dependencies

- **Relates to**: [119-ui-diagram-rendering](../119-ui-diagram-rendering/) (Mermaid implementation)
- **Relates to**: [093-spec-detail-ui-improvements](../093-spec-detail-ui-improvements/) (Previous UI polish)

## Notes

### Why TSV for Copy?
Tab-separated values paste correctly into Excel/Google Sheets with proper column alignment. CSV requires file import which is less convenient for quick operations.

### Alternative: remark/rehype plugins
Could use existing plugins like `rehype-copy-code-button`, but custom implementation gives more control over styling and behavior consistent with shadcn/ui design system.

### Bundle Size Considerations
- Dialog component already used elsewhere in UI
- Clipboard API is native, no additional dependencies
- CSV generation is simple string manipulation

### Future Enhancements
- Syntax-aware copy (format code before copying)
- Code block line numbers
- Code block filename display (from meta string)
- Table sorting/filtering (more complex, separate spec)
