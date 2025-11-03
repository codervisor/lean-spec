import React from 'react';
import { render } from 'ink';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from '../config.js';
import { withSpinner } from '../utils/ui.js';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecFilterOptions, SpecStatus, SpecPriority } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';
import { SpecListView } from '../components/SpecListView.js';

export async function listSpecs(options: {
  showArchived?: boolean;
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  customFields?: Record<string, unknown>;
} = {}): Promise<void> {
  // Auto-check for conflicts before listing
  await autoCheckIfEnabled();
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  try {
    await fs.access(specsDir);
  } catch {
    console.log('');
    console.log('No specs directory found. Initialize with: lspec init');
    console.log('');
    return;
  }

  // Build filter options
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: options.showArchived || false,
      filter,
    })
  );

  // Build filter info for component
  const filterInfo: any = {};
  if (options.status) filterInfo.status = Array.isArray(options.status) ? options.status.join(',') : options.status;
  if (options.tags) filterInfo.tags = options.tags;
  if (options.priority) filterInfo.priority = Array.isArray(options.priority) ? options.priority.join(',') : options.priority;
  if (options.assignee) filterInfo.assignee = options.assignee;

  // Render with Ink
  render(
    React.createElement(SpecListView, {
      specs,
      filter: Object.keys(filterInfo).length > 0 ? filterInfo : undefined,
    })
  );
}
