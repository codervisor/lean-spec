import React from 'react';
import { render } from 'ink';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';
import { StatsDisplay } from '../components/StatsDisplay.js';
import { withSpinner } from '../utils/ui.js';

export async function statsCommand(options: {
  tag?: string;
  assignee?: string;
  json?: boolean;
}): Promise<void> {
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs with spinner (including archived for total count)
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: true,
      filter,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Output as JSON if requested
  if (options.json) {
    // Calculate statistics for JSON output
    const statusCounts: Record<SpecStatus, number> = {
      planned: 0,
      'in-progress': 0,
      complete: 0,
      archived: 0,
    };

    const priorityCounts: Record<SpecPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const tagCounts: Record<string, number> = {};

    for (const spec of specs) {
      statusCounts[spec.frontmatter.status]++;
      if (spec.frontmatter.priority) {
        priorityCounts[spec.frontmatter.priority]++;
      }
      if (spec.frontmatter.tags) {
        for (const tag of spec.frontmatter.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const data = {
      total: specs.length,
      status: statusCounts,
      priority: priorityCounts,
      tags: tagCounts,
      filter: filter,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Render with Ink
  const filterOptions = {
    tag: options.tag,
    assignee: options.assignee,
  };

  render(
    React.createElement(StatsDisplay, {
      specs,
      filter: (options.tag || options.assignee) ? filterOptions : undefined,
    })
  );
}
