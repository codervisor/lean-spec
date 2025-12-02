#!/usr/bin/env node

/**
 * Validate MDX Syntax in Chinese Documentation and Blog Posts
 * 
 * This script validates source MDX files for:
 * 1. Unescaped special characters (< > { }) that break MDX (all languages)
 * 2. Bold formatting issues with Chinese text (spacing problems)
 * 3. Bold text with quotes needing proper spacing (all languages)
 * 
 * Usage:
 *   node scripts/validate-mdx-syntax.js
 *   node scripts/validate-mdx-syntax.js --type blog
 *   node scripts/validate-mdx-syntax.js --type docs --file guide/index.mdx
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ZH_BLOG_DIR = path.join(__dirname, '..', 'i18n', 'zh-Hans', 'docusaurus-plugin-content-blog');
const ZH_DOCS_DIR = path.join(__dirname, '..', 'i18n', 'zh-Hans', 'docusaurus-plugin-content-docs', 'current');

// Parse command line arguments
const args = process.argv.slice(2);
const specificFile = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const contentType = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'all'; // 'all', 'blog', or 'docs'
const verbose = args.includes('--verbose');

/**
 * Get all Chinese files (blog posts and/or docs)
 */
function getZhFiles() {
  const results = [];

  // Get blog files
  if (contentType === 'all' || contentType === 'blog') {
    if (fs.existsSync(ZH_BLOG_DIR)) {
      const blogFiles = fs.readdirSync(ZH_BLOG_DIR)
        .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
        .filter(file => !file.includes('authors.yml'));
      
      blogFiles.forEach(file => {
        if (!specificFile || file === specificFile) {
          results.push({ type: 'blog', file, path: path.join(ZH_BLOG_DIR, file) });
        }
      });
    }
  }

  // Get doc files
  if (contentType === 'all' || contentType === 'docs') {
    if (fs.existsSync(ZH_DOCS_DIR)) {
      const getAllMdxFiles = (dir, baseDir = dir) => {
        const items = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            items.push(...getAllMdxFiles(fullPath, baseDir));
          } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
            const relativePath = path.relative(baseDir, fullPath);
            items.push({ type: 'docs', file: relativePath, path: fullPath });
          }
        }
        return items;
      };
      
      const docFiles = getAllMdxFiles(ZH_DOCS_DIR);
      docFiles.forEach(item => {
        if (!specificFile || item.file === specificFile) {
          results.push(item);
        }
      });
    }
  }

  return results;
}

/**
 * Check source file for MDX syntax issues
 */
function checkSourceFile(item) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(item.path, 'utf-8');
    const lines = content.split('\n');
    
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
    
    // Check each line for issues
    for (let i = contentStart; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;
      
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
      
      // Remove inline code and HTML comments for checking
      let withoutInlineCode = line.replace(/`[^`]+`/g, '');
      withoutInlineCode = withoutInlineCode.replace(/<!--.*?-->/g, '');
      
      // Skip markdown syntax lines
      const isBlockquote = trimmed.startsWith('>');
      const isListItem = /^\s*[-*+]\s/.test(line);
      const isOrderedList = /^\s*\d+\.\s/.test(line);
      
      // Check 1: Unescaped angle brackets < >
      // These will break MDX unless they're in tags, URLs, code, or markdown syntax
      const angleMatches = [...withoutInlineCode.matchAll(/[<>]/g)];
      
      if (angleMatches.length > 0 && !isBlockquote) {
        // Check if it's an HTML/JSX tag
        const hasOpenTag = /<[a-zA-Z][^>]*>/.test(withoutInlineCode);
        const hasCloseTag = /<\/[a-zA-Z]+>/.test(withoutInlineCode);
        const hasSelfClosing = /<[a-zA-Z][^>]*\/>/.test(withoutInlineCode);
        const isUrl = /https?:\/\/[^\s]*[<>]/.test(withoutInlineCode);
        const isComparison = /[><=]\s*\d+|[a-zA-Z]+\s*[><=]\s*[a-zA-Z]+/.test(withoutInlineCode);
        
        // If we have angle brackets but they don't look like proper tags or comparisons
        const likelyUnescaped = angleMatches.length > 0 && 
          !(hasOpenTag || hasCloseTag || hasSelfClosing) && 
          !isUrl && 
          !isComparison;
        
        if (likelyUnescaped) {
          issues.push({
            type: 'unescaped-angle-bracket',
            line: lineNum,
            issue: `Unescaped angle bracket (<, >) found`,
            context: line.trim().substring(0, 100) + (line.trim().length > 100 ? '...' : ''),
            suggestion: 'Use HTML entities: &lt; for < and &gt; for >, or wrap in inline code with `backticks`'
          });
        }
      }
      
      // Check 2: Unescaped curly braces { }
      // These can break MDX if not properly escaped or in code
      const braceMatches = [...withoutInlineCode.matchAll(/[{}]/g)];
      
      if (braceMatches.length > 0) {
        // Check if it's JSX expression or component
        const isJsxExpression = /\{[^}]+\}/.test(withoutInlineCode);
        const looksLikeComponent = /<[A-Z][a-zA-Z]*[^>]*>/.test(withoutInlineCode);
        
        // Simple heuristic: if we have braces without JSX context, likely unescaped
        const likelyUnescaped = braceMatches.length > 0 && !isJsxExpression && !looksLikeComponent;
        
        if (likelyUnescaped) {
          issues.push({
            type: 'unescaped-curly-brace',
            line: lineNum,
            issue: `Unescaped curly brace ({, }) found`,
            context: line.trim().substring(0, 100) + (line.trim().length > 100 ? '...' : ''),
            suggestion: 'Escape with backslash: \\{ and \\}, or wrap in inline code with `backticks`'
          });
        }
      }
      
      // Check 3: Bold formatting issues in Chinese text
      // DISABLED: Too many false positives with closing ** detection
      // const hasChinese = /[\u4e00-\u9fa5]/.test(withoutInlineCode);
      // const hasBold = /\*\*[^*]+\*\*/.test(withoutInlineCode);
      
      // if (hasChinese && hasBold) {
      //   // Simple check: Chinese/paren directly followed by ** and then non-whitespace
      //   // This catches: "中文**bold" but not "中文** " or "中文** bold" (with space after **)
      //   const problematicPattern = /[）\u4e00-\u9fa5]\*\*(?=[^\s*])/;
      //   if (problematicPattern.test(withoutInlineCode)) {
      //     issues.push({
      //       type: 'bold-spacing-chinese',
      //       line: lineNum,
      //       issue: `Missing space before bold marker in Chinese text`,
      //       context: line.trim().substring(0, 100),
      //       suggestion: 'Add space: "这与 **term** 形成对比" (note space before **)'
      //     });
      //   }
      // }
      
      
      // Check 4: Bold with quotes without spacing
      const boldQuotePattern = /\*\*"[^"]+"\*\*/;
      if (boldQuotePattern.test(withoutInlineCode)) {
        issues.push({
          type: 'bold-quote-spacing',
          line: lineNum,
          issue: `Bold with quotes needs spacing`,
          context: line.trim().substring(0, 100),
          suggestion: 'Add spaces inside markers: ** "quoted text" ** (spaces inside the ** markers)'
        });
      }
    }
    
  } catch (error) {
    issues.push({
      type: 'file-read-error',
      issue: `Failed to read file: ${error.message}`
    });
  }
  
  return issues;
}

/**
 * Validate all Chinese content
 */
function validateContent() {
  const typeLabel = contentType === 'all' ? 'documentation and blog posts' : contentType === 'blog' ? 'blog posts' : 'documentation';
  console.log(`\n📝 Validating Chinese ${typeLabel} for MDX syntax issues...\n`);

  const items = getZhFiles();
  console.log(`Found ${items.length} Chinese file(s) to validate\n`);

  const results = {
    total: items.length,
    passed: 0,
    failed: 0,
    issues: []
  };

  for (const item of items) {
    console.log(`Checking: [${item.type}] ${item.file}`);

    const issues = checkSourceFile(item);

    if (issues.length === 0) {
      console.log('  ✅ PASS - No syntax issues detected\n');
      results.passed++;
    } else {
      console.log('  ❌ FAIL - Found syntax issues:\n');
      issues.forEach((issue, idx) => {
        console.log(`     ${idx + 1}. [${issue.type}] ${issue.issue}`);
        if (issue.line) {
          console.log(`        Line: ${issue.line}`);
        }
        if (issue.context) {
          console.log(`        Context: ${issue.context}`);
        }
        if (issue.suggestion) {
          console.log(`        💡 ${issue.suggestion}`);
        }
        console.log();
      });
      
      results.failed++;
      results.issues.push({
        type: item.type,
        file: item.file,
        path: item.path,
        issues
      });
    }
  }

  return results;
}

/**
 * Generate summary report
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total files checked: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n⚠️  Files with issues:');
    results.issues.forEach(({ type, file, issues }) => {
      console.log(`  - [${type}] ${file} (${issues.length} issue${issues.length > 1 ? 's' : ''})`);
    });
    console.log('\n💡 Common fixes:');
    console.log('  • Angle brackets: Use &lt; and &gt; or wrap in `backticks`');
    console.log('  • Curly braces: Use \\{ and \\} or wrap in `backticks`');
    console.log('  • Chinese + bold: Add space: "这与 **term** 形成对比"');
    console.log('  • Bold + quotes: Add spaces: ** "text" **');
    console.log('\n📖 See agents/documentation-quality-standards.md for details');
  }
  
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution
 */
function main() {
  try {
    const results = validateContent();
    printSummary(results);
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Error during validation:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { checkSourceFile, getZhFiles };
