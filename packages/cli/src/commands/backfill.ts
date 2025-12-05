import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Command } from 'commander';
import { loadAllSpecs, getSpec, type SpecInfo } from '../spec-loader.js';
import { updateFrontmatter, type SpecFrontmatter, type SpecStatus } from '../frontmatter.js';
import { loadConfig } from '../config.js';
import { 
  isGitRepository,
  extractGitTimestamps,
  fileExistsInGit,
  getFirstCommitTimestamp,
  type GitTimestampData,
} from '../utils/git-timestamps.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { 
  loadSpecsForBootstrap, 
  type BootstrapSpecInfo,
  inferStatusFromContent,
  inferCreatedFromContent,
} from '../utils/bootstrap-helpers.js';

export interface BackfillResult {
  specPath: string;
  specName: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  assignee?: string;
  transitionsCount?: number;
  source: 'git' | 'existing' | 'skipped' | 'bootstrapped';
  reason?: string;
  bootstrapped?: boolean; // Was frontmatter created from scratch?
}

export interface BackfillOptions {
  dryRun?: boolean;
  force?: boolean;
  includeAssignee?: boolean;
  includeTransitions?: boolean;
  specs?: string[]; // specific specs to target
  json?: boolean;
  bootstrap?: boolean; // Create frontmatter for files without it
}

/**
 * Backfill command - backfill timestamps from git history
 */
export function backfillCommand(): Command {
  return new Command('backfill')
    .description('Backfill timestamps from git history')
    .argument('[specs...]', 'Specific specs to backfill (optional)')
    .option('--dry-run', 'Show what would be updated without making changes')
    .option('--force', 'Overwrite existing timestamp values')
    .option('--assignee', 'Include assignee from first commit author')
    .option('--transitions', 'Include full status transition history')
    .option('--all', 'Include all optional fields (assignee + transitions)')
    .option('--bootstrap', 'Create frontmatter for files without valid frontmatter')
    .option('--json', 'Output as JSON')
    .action(async (specs: string[] | undefined, options: {
      dryRun?: boolean;
      force?: boolean;
      assignee?: boolean;
      transitions?: boolean;
      all?: boolean;
      json?: boolean;
      bootstrap?: boolean;
    }) => {
      await backfillTimestamps({
        dryRun: options.dryRun,
        force: options.force,
        includeAssignee: options.assignee || options.all,
        includeTransitions: options.transitions || options.all,
        specs: specs && specs.length > 0 ? specs : undefined,
        json: options.json,
        bootstrap: options.bootstrap,
      });
    });
}

/**
 * Backfill timestamps from git history for all or specific specs
 */
export async function backfillTimestamps(options: BackfillOptions = {}): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];
  
  // Check if we're in a git repository
  if (!isGitRepository()) {
    console.error('\x1b[31mError:\x1b[0m Not in a git repository');
    console.error('Git history is required for backfilling timestamps');
    process.exit(1);
  }
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  // Bootstrap mode: also load specs without valid frontmatter
  if (options.bootstrap) {
    console.log('\x1b[36m🔧 Bootstrap mode - will create frontmatter for files without it\x1b[0m\n');
    
    const bootstrapSpecs = await loadSpecsForBootstrap(specsDir, {
      includeArchived: true,
      targetSpecs: options.specs,
    });
    
    if (bootstrapSpecs.length === 0) {
      console.log('No specs found to bootstrap');
      return results;
    }
    
    console.log(`Analyzing git history for ${bootstrapSpecs.length} spec${bootstrapSpecs.length === 1 ? '' : 's'}...\n`);
    
    for (const spec of bootstrapSpecs) {
      const result = await bootstrapSpec(spec, options);
      results.push(result);
    }
    
    printSummary(results, options);
    return results;
  }
  
  // Normal mode: load specs with valid frontmatter only
  let specs: SpecInfo[];
  
  if (options.specs && options.specs.length > 0) {
    // Load specific specs
    specs = [];
    
    for (const specPath of options.specs) {
      const resolved = await resolveSpecPath(specPath, cwd, specsDir);
      if (!resolved) {
        console.warn(`\x1b[33mWarning:\x1b[0m Spec not found: ${specPath}`);
        continue;
      }
      const spec = await getSpec(resolved);
      if (spec) {
        specs.push(spec);
      }
    }
  } else {
    // Load all specs (including archived)
    specs = await loadAllSpecs({ includeArchived: true });
  }
  
  if (specs.length === 0) {
    console.log('No specs found to backfill');
    console.log('\x1b[36mℹ\x1b[0m  Use --bootstrap to create frontmatter for files without it');
    return results;
  }
  
  // Show what we're doing
  if (options.dryRun) {
    console.log('\x1b[36m🔍 Dry run mode - no changes will be made\x1b[0m\n');
  }
  
  console.log(`Analyzing git history for ${specs.length} spec${specs.length === 1 ? '' : 's'}...\n`);
  
  // Process each spec
  for (const spec of specs) {
    const result = await backfillSpecTimestamps(spec, options);
    results.push(result);
  }
  
  // Print summary
  printSummary(results, options);
  
  return results;
}

/**
 * Backfill timestamps for a single spec
 */
async function backfillSpecTimestamps(
  spec: SpecInfo,
  options: BackfillOptions
): Promise<BackfillResult> {
  const result: BackfillResult = {
    specPath: spec.path,
    specName: spec.name,
    source: 'skipped',
  };
  
  // Skip specs without valid frontmatter (missing required fields)
  if (!spec.frontmatter.status || !spec.frontmatter.created) {
    result.reason = 'Missing required frontmatter (status or created)';
    console.log(`\x1b[33m⊘\x1b[0m ${spec.name} - Missing required frontmatter`);
    return result;
  }
  
  // Check if file exists in git history
  if (!fileExistsInGit(spec.filePath)) {
    result.reason = 'Not in git history';
    console.log(`\x1b[33m⊘\x1b[0m ${spec.name} - Not in git history`);
    return result;
  }
  
  // Extract git timestamps
  const gitData = extractGitTimestamps(spec.filePath, {
    includeAssignee: options.includeAssignee,
    includeTransitions: options.includeTransitions,
  });
  
  // Determine what needs to be updated
  const updates: Partial<SpecFrontmatter> = {};
  let hasUpdates = false;
  
  // Check created_at
  if (gitData.created_at && (options.force || !spec.frontmatter.created_at)) {
    updates.created_at = gitData.created_at;
    result.created_at = gitData.created_at;
    result.source = 'git';
    hasUpdates = true;
  } else if (spec.frontmatter.created_at) {
    result.created_at = spec.frontmatter.created_at;
    result.source = 'existing';
  }
  
  // Check updated_at
  if (gitData.updated_at && (options.force || !spec.frontmatter.updated_at)) {
    updates.updated_at = gitData.updated_at;
    result.updated_at = gitData.updated_at;
    result.source = 'git';
    hasUpdates = true;
  } else if (spec.frontmatter.updated_at) {
    result.updated_at = spec.frontmatter.updated_at;
    result.source = 'existing';
  }
  
  // Check completed_at
  if (gitData.completed_at && (options.force || !spec.frontmatter.completed_at)) {
    updates.completed_at = gitData.completed_at;
    result.completed_at = gitData.completed_at;
    result.source = 'git';
    hasUpdates = true;
  } else if (spec.frontmatter.completed_at) {
    result.completed_at = spec.frontmatter.completed_at;
    result.source = 'existing';
  }
  
  // Check assignee (optional)
  if (options.includeAssignee && gitData.assignee && (options.force || !spec.frontmatter.assignee)) {
    updates.assignee = gitData.assignee;
    result.assignee = gitData.assignee;
    result.source = 'git';
    hasUpdates = true;
  } else if (spec.frontmatter.assignee) {
    result.assignee = spec.frontmatter.assignee;
  }
  
  // Check transitions (optional)
  if (options.includeTransitions && gitData.transitions && gitData.transitions.length > 0) {
    if (options.force || !spec.frontmatter.transitions || spec.frontmatter.transitions.length === 0) {
      updates.transitions = gitData.transitions;
      result.transitionsCount = gitData.transitions.length;
      result.source = 'git';
      hasUpdates = true;
    } else {
      // Merge with existing transitions (optional: could implement smart merge)
      result.transitionsCount = spec.frontmatter.transitions.length;
    }
  }
  
  // Sync updated date field with updated_at timestamp
  if (updates.updated_at && !updates.updated) {
    updates.updated = updates.updated_at.split('T')[0];
  }
  
  if (!hasUpdates) {
    result.reason = 'Already has complete data';
    console.log(`\x1b[90m✓\x1b[0m ${spec.name} - Already complete`);
    return result;
  }
  
  // Apply updates (unless dry run)
  if (!options.dryRun) {
    try {
      await updateFrontmatter(spec.filePath, updates);
      console.log(`\x1b[32m✓\x1b[0m ${spec.name} - Updated`);
    } catch (error) {
      result.source = 'skipped';
      result.reason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      console.log(`\x1b[31m✗\x1b[0m ${spec.name} - Failed: ${result.reason}`);
    }
  } else {
    console.log(`\x1b[36m→\x1b[0m ${spec.name} - Would update`);
    // Show what would be updated
    if (updates.created_at) console.log(`  created_at:   ${updates.created_at} (git)`);
    if (updates.updated_at) console.log(`  updated_at:   ${updates.updated_at} (git)`);
    if (updates.completed_at) console.log(`  completed_at: ${updates.completed_at} (git)`);
    if (updates.assignee) console.log(`  assignee:     ${updates.assignee} (git)`);
    if (updates.transitions) console.log(`  transitions:  ${updates.transitions.length} status changes (git)`);
  }
  
  return result;
}

/**
 * Bootstrap a spec file with missing or incomplete frontmatter
 */
async function bootstrapSpec(
  spec: BootstrapSpecInfo,
  options: BackfillOptions
): Promise<BackfillResult> {
  const result: BackfillResult = {
    specPath: spec.path,
    specName: spec.name,
    source: 'skipped',
    bootstrapped: false,
  };
  
  // Skip specs that already have valid frontmatter (unless --force)
  if (spec.hasValidFrontmatter && !options.force) {
    // Still run normal backfill logic for timestamps
    result.reason = 'Already has valid frontmatter';
    console.log(`\x1b[90m✓\x1b[0m ${spec.name} - Already valid`);
    return result;
  }
  
  // Build frontmatter from existing + inferred data
  const frontmatter: Partial<SpecFrontmatter> = {
    ...(spec.existingFrontmatter || {}),
    status: spec.inferredStatus || 'planned',
    created: spec.inferredCreated || new Date().toISOString().split('T')[0],
  };
  
  // Get git timestamps
  if (fileExistsInGit(spec.filePath)) {
    const gitData = extractGitTimestamps(spec.filePath, {
      includeAssignee: options.includeAssignee,
      includeTransitions: options.includeTransitions,
    });
    
    if (gitData.created_at) {
      frontmatter.created_at = gitData.created_at;
      result.created_at = gitData.created_at;
    }
    if (gitData.updated_at) {
      frontmatter.updated_at = gitData.updated_at;
      result.updated_at = gitData.updated_at;
    }
    if (gitData.completed_at) {
      frontmatter.completed_at = gitData.completed_at;
      result.completed_at = gitData.completed_at;
    }
    if (options.includeAssignee && gitData.assignee) {
      frontmatter.assignee = gitData.assignee;
      result.assignee = gitData.assignee;
    }
    if (options.includeTransitions && gitData.transitions && gitData.transitions.length > 0) {
      frontmatter.transitions = gitData.transitions;
      result.transitionsCount = gitData.transitions.length;
    }
  }
  
  // Determine source labels for output
  const statusSource = spec.existingFrontmatter?.status ? 'existing' : 
                       (spec.content.match(/\*\*Status\*\*/i) ? 'content' : 'default');
  const createdSource = spec.existingFrontmatter?.created ? 'existing' :
                        (spec.content.match(/\*\*Created\*\*/i) ? 'content' : 
                        (fileExistsInGit(spec.filePath) ? 'git' : 'default'));
  
  if (!options.dryRun) {
    try {
      await writeBootstrapFrontmatter(spec.filePath, spec.content, frontmatter);
      result.source = 'bootstrapped';
      result.bootstrapped = true;
      console.log(`\x1b[32m✓\x1b[0m ${spec.name} - Bootstrapped`);
      console.log(`  status: ${frontmatter.status} (${statusSource})`);
      console.log(`  created: ${frontmatter.created} (${createdSource})`);
    } catch (error) {
      result.source = 'skipped';
      result.reason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      console.log(`\x1b[31m✗\x1b[0m ${spec.name} - Failed: ${result.reason}`);
    }
  } else {
    result.source = 'bootstrapped';
    result.bootstrapped = true;
    console.log(`\x1b[36m→\x1b[0m ${spec.name} - Would bootstrap`);
    console.log(`  status: ${frontmatter.status} (${statusSource})`);
    console.log(`  created: ${frontmatter.created} (${createdSource})`);
    if (frontmatter.created_at) console.log(`  created_at: ${frontmatter.created_at} (git)`);
    if (frontmatter.updated_at) console.log(`  updated_at: ${frontmatter.updated_at} (git)`);
    if (frontmatter.completed_at) console.log(`  completed_at: ${frontmatter.completed_at} (git)`);
    if (frontmatter.assignee) console.log(`  assignee: ${frontmatter.assignee} (git)`);
    if (frontmatter.transitions) console.log(`  transitions: ${frontmatter.transitions.length} (git)`);
  }
  
  return result;
}

/**
 * Write or update frontmatter in a spec file
 */
async function writeBootstrapFrontmatter(
  filePath: string,
  originalContent: string,
  frontmatter: Partial<SpecFrontmatter>
): Promise<void> {
  const matter = await import('gray-matter');
  
  // Parse existing content (may or may not have frontmatter)
  const parsed = matter.default(originalContent);
  
  // Merge new frontmatter with any existing
  const newData = { ...parsed.data, ...frontmatter };
  
  // Write back
  const newContent = matter.default.stringify(parsed.content, newData);
  await fs.writeFile(filePath, newContent, 'utf-8');
}

/**
 * Print summary of backfill results
 */
function printSummary(results: BackfillResult[], options: BackfillOptions): void {
  console.log('\n' + '─'.repeat(60));
  console.log('\x1b[1mSummary:\x1b[0m\n');
  
  const total = results.length;
  const updated = results.filter(r => r.source === 'git').length;
  const bootstrapped = results.filter(r => r.source === 'bootstrapped').length;
  const existing = results.filter(r => r.source === 'existing').length;
  const skipped = results.filter(r => r.source === 'skipped').length;
  
  const timestampUpdates = results.filter(r => 
    (r.source === 'git' || r.source === 'bootstrapped') && (r.created_at || r.updated_at || r.completed_at)
  ).length;
  
  const assigneeUpdates = results.filter(r => 
    (r.source === 'git' || r.source === 'bootstrapped') && r.assignee
  ).length;
  
  const transitionUpdates = results.filter(r => 
    (r.source === 'git' || r.source === 'bootstrapped') && r.transitionsCount
  ).length;
  
  console.log(`  ${total} specs analyzed`);
  
  if (options.dryRun) {
    if (options.bootstrap) {
      console.log(`  ${bootstrapped} would be bootstrapped`);
    }
    console.log(`  ${updated} would be updated`);
    if (timestampUpdates > 0) {
      console.log(`    └─ ${timestampUpdates} with timestamps`);
    }
    if (options.includeAssignee && assigneeUpdates > 0) {
      console.log(`    └─ ${assigneeUpdates} with assignee`);
    }
    if (options.includeTransitions && transitionUpdates > 0) {
      console.log(`    └─ ${transitionUpdates} with transitions`);
    }
  } else {
    if (options.bootstrap) {
      console.log(`  ${bootstrapped} bootstrapped`);
    }
    console.log(`  ${updated} updated`);
  }
  
  console.log(`  ${existing} already complete`);
  console.log(`  ${skipped} skipped`);
  
  // Show reasons for skipped specs
  const skipReasons = results
    .filter(r => r.source === 'skipped' && r.reason)
    .map(r => r.reason);
  
  if (skipReasons.length > 0) {
    console.log('\n\x1b[33mSkipped reasons:\x1b[0m');
    const uniqueReasons = [...new Set(skipReasons)];
    for (const reason of uniqueReasons) {
      const count = skipReasons.filter(r => r === reason).length;
      console.log(`  - ${reason} (${count})`);
    }
  }
  
  // Guidance
  if (options.dryRun) {
    console.log('\n\x1b[36mℹ\x1b[0m  Run without --dry-run to apply changes');
    
    if (!options.includeAssignee || !options.includeTransitions) {
      console.log('\x1b[36mℹ\x1b[0m  Use --all to include optional fields (assignee, transitions)');
    }
    
    if (!options.bootstrap && skipped > 0) {
      console.log('\x1b[36mℹ\x1b[0m  Use --bootstrap to create frontmatter for files without it');
    }
  } else if (updated > 0 || bootstrapped > 0) {
    console.log('\n\x1b[32m✓\x1b[0m Backfill complete!');
    console.log('  Run \x1b[36mlean-spec stats\x1b[0m to see velocity metrics');
  }
}
