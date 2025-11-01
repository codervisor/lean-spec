import React from 'react';
import { render } from 'ink';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecFilterOptions } from '../frontmatter.js';
import { Board } from '../components/Board.js';
import { withSpinner } from '../utils/ui.js';

export async function boardCommand(options: {
  showComplete?: boolean;
  tag?: string;
  assignee?: string;
}): Promise<void> {
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs with spinner (exclude archived, they go in their own archive view)
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: false,
      filter,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Render with Ink
  const filterOptions = {
    tag: options.tag,
    assignee: options.assignee,
  };

  render(
    React.createElement(Board, {
      specs,
      showComplete: options.showComplete,
      filter: (options.tag || options.assignee) ? filterOptions : undefined,
    })
  );
}
