import React from 'react';
import { render } from 'ink';
import { loadAllSpecs } from '../spec-loader.js';
import { GanttChart } from '../components/GanttChart.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export async function ganttCommand(options: {
  weeks?: number;
  showComplete?: boolean;
  criticalPath?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const weeks = options.weeks || 4;
  
  // Load all specs with spinner
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: false,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Render with Ink
  render(
    React.createElement(GanttChart, {
      specs,
      weeks,
      showComplete: options.showComplete,
    })
  );
}
