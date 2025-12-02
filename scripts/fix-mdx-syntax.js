#!/usr/bin/env node

/**
 * Automatically Fix MDX Syntax Issues
 * 
 * This script automatically fixes common MDX syntax issues detected by validate-mdx-syntax.js:
 * 1. Unescaped angle brackets (< >) -> HTML entities (&lt; &gt;)
 * 2. Unescaped curly braces ({ }) -> Escaped braces (\{ \})
 * 3. Bold with quotes -> Add spacing (** "text" **)
 * 
 * Usage:
 *   node scripts/fix-mdx-syntax.js [--dry-run] [--type blog|docs] [--file path]
 * 
 * Options:
 *   --dry-run: Show what would be fixed without making changes
 *   --type: Fix only 'blog' or 'docs' (default: all)
 *   --file: Fix only specific file (relative path)
 *   --verbose: Show detailed output
 */

const fs = require('fs');
const path = require('path');
const { checkSourceFile, getZhFiles } = require('./validate-mdx-syntax.js');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

/**
 * Apply fixes to a single file
 */
function fixFile(item) {
  const content = fs.readFileSync(item.path, 'utf-8');
  const lines = content.split('\n');
  
  let modified = false;
  let fixCount = {
    angleBrackets: 0,
    curlyBraces: 0,
    boldQuotes: 0
  };
  
  // Skip frontmatter
  let inFrontmatter = false;
  let contentStart = 0;
  let inCodeBlock = false;
  let codeBlockMarker = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Handle frontmatter
    if (trimmed === '---') {
      if (i === 0 || !inFrontmatter) {
        inFrontmatter = true;
      } else if (inFrontmatter) {
        contentStart = i + 1;
        break;
      }
    }
  }
  
  // Process each line
  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip HTML comments
    if (trimmed.startsWith('<!--') || trimmed.includes('-->')) {
      continue;
    }
    
    // Track code blocks
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockMarker = trimmed.substring(0, 3);
      } else if (trimmed.startsWith(codeBlockMarker)) {
        inCodeBlock = false;
        codeBlockMarker = '';
      }
      continue;
    }
    
    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }
    
    let newLine = line;
    let lineModified = false;
    
    // Fix 1: Bold with quotes - need spacing
    // Pattern: **"text"** -> ** "text" **
    const boldQuotePattern = /\*\*"([^"]+)"\*\*/g;
    if (boldQuotePattern.test(line)) {
      // Skip if inside inline code
      const inlineCodePattern = /`[^`]*\*\*"[^"]+"\*\*[^`]*`/;
      if (!inlineCodePattern.test(line)) {
        newLine = newLine.replace(boldQuotePattern, '** "$1" **');
        if (newLine !== line) {
          lineModified = true;
          fixCount.boldQuotes++;
        }
      }
    }
    
    // Fix 2: Unescaped angle brackets in comparisons
    // Look for patterns like "> 2000" or "< 3500" that are not in tags/URLs
    // We'll be conservative and only fix obvious cases
    const comparisonPattern = /([^<>\s]+)\s*(>|<)\s*(\d+)/g;
    let match;
    let tempLine = newLine;
    const matches = [];
    while ((match = comparisonPattern.exec(line)) !== null) {
      // Check if it's not in a tag or URL
      const before = line.substring(0, match.index);
      const isInTag = /<[^>]*$/.test(before);
      const isInUrl = /https?:\/\/[^\s]*$/.test(before);
      const isInCode = /`[^`]*$/.test(before);
      
      if (!isInTag && !isInUrl && !isInCode) {
        matches.push({
          index: match.index,
          length: match[0].length,
          operator: match[2],
          replacement: match[2] === '>' ? '&gt;' : '&lt;'
        });
      }
    }
    
    // Apply replacements from end to start to preserve indices
    for (let j = matches.length - 1; j >= 0; j--) {
      const m = matches[j];
      const part1 = tempLine.substring(0, m.index);
      const matchText = tempLine.substring(m.index, m.index + m.length);
      const part2 = tempLine.substring(m.index + m.length);
      tempLine = part1 + matchText.replace(m.operator, ` ${m.replacement} `) + part2;
      lineModified = true;
      fixCount.angleBrackets++;
    }
    newLine = tempLine;
    
    // Fix 3: Standalone angle brackets (not in comparisons)
    // Be very conservative here - only fix obvious standalone cases
    // Pattern: text > text or text < text where it's clearly not a tag/comparison
    const standalonePattern = /([^\d\s<>])\s+(>|<)\s+([^\d\s<>])/g;
    tempLine = newLine;
    const standaloneMatches = [];
    while ((match = standalonePattern.exec(line)) !== null) {
      const before = line.substring(0, match.index);
      const isInTag = /<[^>]*$/.test(before);
      const isInUrl = /https?:\/\/[^\s]*$/.test(before);
      const isInCode = /`[^`]*$/.test(before);
      
      if (!isInTag && !isInUrl && !isInCode) {
        standaloneMatches.push({
          index: match.index + match[1].length + 1, // Position of operator
          operator: match[2]
        });
      }
    }
    
    // Apply replacements from end to start
    for (let j = standaloneMatches.length - 1; j >= 0; j--) {
      const m = standaloneMatches[j];
      const replacement = m.operator === '>' ? '&gt;' : '&lt;';
      tempLine = tempLine.substring(0, m.index) + replacement + tempLine.substring(m.index + 1);
      lineModified = true;
      fixCount.angleBrackets++;
    }
    newLine = tempLine;
    
    // Fix 4: Unescaped curly braces (be very conservative)
    // Only fix if they're clearly not JSX - standalone braces in text
    const standaloneBracePattern = /([^\w\s\\])\s*(\{|\})\s*([^\w\s])/g;
    tempLine = newLine;
    const braceMatches = [];
    while ((match = standaloneBracePattern.exec(line)) !== null) {
      const before = line.substring(0, match.index);
      const isInCode = /`[^`]*$/.test(before);
      const isInJsx = /<[^>]*$/.test(before) || /\{[^}]*$/.test(before);
      
      if (!isInCode && !isInJsx) {
        braceMatches.push({
          index: match.index + match[1].length,
          brace: match[2]
        });
      }
    }
    
    // Apply replacements from end to start
    for (let j = braceMatches.length - 1; j >= 0; j--) {
      const m = braceMatches[j];
      const replacement = m.brace === '{' ? '\\{' : '\\}';
      tempLine = tempLine.substring(0, m.index) + replacement + tempLine.substring(m.index + 1);
      lineModified = true;
      fixCount.curlyBraces++;
    }
    newLine = tempLine;
    
    if (lineModified) {
      lines[i] = newLine;
      modified = true;
    }
  }
  
  return {
    modified,
    fixCount,
    newContent: lines.join('\n')
  };
}

/**
 * Main execution
 */
function main() {
  console.log(`\n🔧 ${dryRun ? 'DRY RUN - ' : ''}Fixing MDX syntax issues...\n`);
  
  const items = getZhFiles();
  console.log(`Found ${items.length} file(s) to process\n`);
  
  const results = {
    total: items.length,
    fixed: 0,
    unchanged: 0,
    totalFixes: {
      angleBrackets: 0,
      curlyBraces: 0,
      boldQuotes: 0
    }
  };
  
  for (const item of items) {
    // Check if file has issues
    const issues = checkSourceFile(item);
    
    if (issues.length === 0) {
      if (verbose) {
        console.log(`✅ SKIP: [${item.type}] ${item.file} (no issues)`);
      }
      results.unchanged++;
      continue;
    }
    
    console.log(`🔍 Processing: [${item.type}] ${item.file}`);
    console.log(`   Found ${issues.length} issue(s)`);
    
    const { modified, fixCount, newContent } = fixFile(item);
    
    if (modified) {
      const totalFixed = fixCount.angleBrackets + fixCount.curlyBraces + fixCount.boldQuotes;
      console.log(`   ✨ Applied ${totalFixed} fix(es):`);
      if (fixCount.angleBrackets > 0) {
        console.log(`      - ${fixCount.angleBrackets} angle bracket(s)`);
        results.totalFixes.angleBrackets += fixCount.angleBrackets;
      }
      if (fixCount.curlyBraces > 0) {
        console.log(`      - ${fixCount.curlyBraces} curly brace(s)`);
        results.totalFixes.curlyBraces += fixCount.curlyBraces;
      }
      if (fixCount.boldQuotes > 0) {
        console.log(`      - ${fixCount.boldQuotes} bold quote(s)`);
        results.totalFixes.boldQuotes += fixCount.boldQuotes;
      }
      
      if (!dryRun) {
        fs.writeFileSync(item.path, newContent, 'utf-8');
        console.log(`   💾 Saved changes`);
      } else {
        console.log(`   [DRY RUN] Would save changes`);
      }
      
      results.fixed++;
    } else {
      console.log(`   ⚠️  No automatic fixes applied (manual review needed)`);
      results.unchanged++;
    }
    
    console.log();
  }
  
  // Print summary
  console.log('='.repeat(70));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total files processed: ${results.total}`);
  console.log(`✨ Fixed: ${results.fixed}`);
  console.log(`⚪ Unchanged: ${results.unchanged}`);
  console.log(`\nTotal fixes applied:`);
  console.log(`  • Angle brackets: ${results.totalFixes.angleBrackets}`);
  console.log(`  • Curly braces: ${results.totalFixes.curlyBraces}`);
  console.log(`  • Bold quotes: ${results.totalFixes.boldQuotes}`);
  
  if (dryRun) {
    console.log(`\n💡 This was a DRY RUN. Run without --dry-run to apply fixes.`);
  } else {
    console.log(`\n✅ Changes saved. Run validate-mdx-syntax.js to verify.`);
  }
  console.log('='.repeat(70) + '\n');
  
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { fixFile };
