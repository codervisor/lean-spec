import React from 'react';
import { Box, Text } from 'ink';
import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus } from '../frontmatter.js';

interface GanttChartProps {
  specs: SpecInfo[];
  weeks: number;
  showComplete?: boolean;
}

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; color: string }> = {
  planned: { emoji: '📋', color: 'gray' },
  'in-progress': { emoji: '⚡', color: 'yellow' },
  complete: { emoji: '✅', color: 'green' },
  archived: { emoji: '📦', color: 'gray' },
};

const PRIORITY_BADGES: Record<string, { text: string; color: 'red' | 'yellow' | 'green' | 'gray' }> = {
  critical: { text: '[CRITICAL]', color: 'red' },
  high: { text: '[HIGH]', color: 'yellow' },
  medium: { text: '[MED]', color: 'yellow' },
  low: { text: '[LOW]', color: 'green' },
};

export const GanttChart: React.FC<GanttChartProps> = ({ specs, weeks, showComplete }) => {
  const today = dayjs();
  const startDate = today.startOf('week');
  const endDate = startDate.add(weeks, 'week');

  // Filter relevant specs
  const relevantSpecs = specs.filter(spec => {
    if (!showComplete && spec.frontmatter.status === 'complete') {
      return false;
    }
    return (
      spec.frontmatter.due ||
      spec.frontmatter.depends_on ||
      spec.frontmatter.status === 'in-progress' ||
      spec.frontmatter.status === 'complete'
    );
  });

  // Sort specs
  const sortedSpecs = [...relevantSpecs].sort((a, b) => {
    if (a.frontmatter.depends_on?.length && !b.frontmatter.depends_on?.length) return -1;
    if (!a.frontmatter.depends_on?.length && b.frontmatter.depends_on?.length) return 1;
    
    if (a.frontmatter.due && !b.frontmatter.due) return -1;
    if (!a.frontmatter.due && b.frontmatter.due) return 1;
    if (a.frontmatter.due && b.frontmatter.due) {
      return dayjs(a.frontmatter.due).diff(dayjs(b.frontmatter.due));
    }
    
    const statusOrder = { 'in-progress': 0, 'planned': 1, 'complete': 2 };
    return (statusOrder[a.frontmatter.status as keyof typeof statusOrder] || 3) - 
           (statusOrder[b.frontmatter.status as keyof typeof statusOrder] || 3);
  });

  // Calculate stats
  const inProgress = relevantSpecs.filter(s => s.frontmatter.status === 'in-progress').length;
  const planned = relevantSpecs.filter(s => s.frontmatter.status === 'planned').length;
  const complete = relevantSpecs.filter(s => s.frontmatter.status === 'complete').length;
  const overdue = relevantSpecs.filter(s => 
    s.frontmatter.due && 
    dayjs(s.frontmatter.due).isBefore(today) && 
    s.frontmatter.status !== 'complete'
  ).length;

  if (sortedSpecs.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">📅 Gantt Chart</Text>
        <Text dimColor>No specs found with due dates or dependencies.</Text>
        <Text dimColor>Tip: Add a "due: YYYY-MM-DD" field to frontmatter to use gantt view.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Text bold color="cyan">📅 Gantt Chart</Text>
      <Text dimColor>Showing {weeks} weeks from {startDate.format('MMM D, YYYY')}</Text>
      <Box marginBottom={1} />

      {/* Legend */}
      <Text bold>Legend:</Text>
      <Text>
        <Text color="green">■</Text> Complete   
        <Text color="yellow">■</Text> In Progress   
        <Text dimColor>□</Text> Planned   
        <Text color="red">▸</Text> Due Date   
        <Text color="blue">○</Text> Today
      </Text>
      <Box marginBottom={1} />

      {/* Timeline header */}
      <TimelineHeader startDate={startDate} weeks={weeks} today={today} />
      <Text dimColor>{'|' + '--------|'.repeat(weeks)}</Text>
      <Box marginBottom={1} />

      {/* Specs */}
      {sortedSpecs.map(spec => (
        <SpecTimeline 
          key={spec.path}
          spec={spec}
          allSpecs={specs}
          startDate={startDate}
          endDate={endDate}
          weeks={weeks}
          today={today}
        />
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text bold>Summary: </Text>
        <Text color="yellow">In Progress: {inProgress}  </Text>
        <Text color="cyan">Planned: {planned}  </Text>
        <Text color="green">Complete: {complete}</Text>
        {overdue > 0 && <Text color="red">  ⚠ Overdue: {overdue}</Text>}
      </Box>
    </Box>
  );
};

interface TimelineHeaderProps {
  startDate: dayjs.Dayjs;
  weeks: number;
  today: dayjs.Dayjs;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ startDate, weeks, today }) => {
  const dates: React.ReactElement[] = [];
  
  for (let i = 0; i < weeks; i++) {
    const date = startDate.add(i, 'week');
    const dateStr = date.format('MMM D').padEnd(8);
    
    if (today.isSame(date, 'week')) {
      dates.push(<Text key={i} bold color="blue">{dateStr}</Text>);
    } else {
      dates.push(<Text key={i} dimColor>{dateStr}</Text>);
    }
  }
  
  return <Box>{dates}</Box>;
};

interface SpecTimelineProps {
  spec: SpecInfo;
  allSpecs: SpecInfo[];
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  weeks: number;
  today: dayjs.Dayjs;
}

const SpecTimeline: React.FC<SpecTimelineProps> = ({ 
  spec, 
  allSpecs, 
  startDate, 
  endDate, 
  weeks,
  today 
}) => {
  const statusConfig = STATUS_CONFIG[spec.frontmatter.status];
  const priorityBadge = spec.frontmatter.priority ? PRIORITY_BADGES[spec.frontmatter.priority] : null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Spec name with status and priority */}
      <Box>
        <Text>{statusConfig.emoji} </Text>
        <Text bold color="cyan">{spec.path}</Text>
        {priorityBadge && (
          <Text color={priorityBadge.color}> {priorityBadge.text}</Text>
        )}
      </Box>

      {/* Dependencies */}
      {spec.frontmatter.depends_on && spec.frontmatter.depends_on.length > 0 && (
        <Box>
          <Text dimColor>  ↳ depends on: </Text>
          {spec.frontmatter.depends_on.map((dep, idx) => {
            const depSpec = allSpecs.find(s => s.path === dep || s.path.includes(dep));
            const icon = depSpec?.frontmatter.status === 'complete' ? '✓' : '○';
            const iconColor = depSpec?.frontmatter.status === 'complete' ? 'green' : 'yellow';
            
            return (
              <React.Fragment key={dep}>
                <Text color={iconColor}>{icon}</Text>
                <Text dimColor> {dep}</Text>
                {idx < spec.frontmatter.depends_on!.length - 1 && <Text dimColor>, </Text>}
              </React.Fragment>
            );
          })}
        </Box>
      )}

      {/* Timeline bar */}
      <Box>
        <Text>  </Text>
        <TimelineBar 
          spec={spec}
          startDate={startDate}
          endDate={endDate}
          weeks={weeks}
          today={today}
        />
      </Box>

      {/* Metadata */}
      <Box>
        <Text dimColor>  {statusConfig.emoji} {spec.frontmatter.status}</Text>
        {spec.frontmatter.created && (
          <Text dimColor> · created: {spec.frontmatter.created}</Text>
        )}
        {spec.frontmatter.due && (() => {
          const dueDate = dayjs(spec.frontmatter.due);
          const isOverdue = dueDate.isBefore(today) && spec.frontmatter.status !== 'complete';
          return isOverdue ? (
            <Text color="red"> · due: {spec.frontmatter.due} ⚠</Text>
          ) : (
            <Text dimColor> · due: {spec.frontmatter.due}</Text>
          );
        })()}
        {spec.frontmatter.completed && (
          <Text color="green"> · completed: {spec.frontmatter.completed}</Text>
        )}
      </Box>
    </Box>
  );
};

interface TimelineBarProps {
  spec: SpecInfo;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  weeks: number;
  today: dayjs.Dayjs;
}

const TimelineBar: React.FC<TimelineBarProps> = ({ spec, startDate, endDate, weeks, today }) => {
  const charsPerWeek = 8;
  const totalChars = weeks * charsPerWeek;
  
  const created = dayjs(spec.frontmatter.created);
  const due = spec.frontmatter.due ? dayjs(spec.frontmatter.due) : null;
  const completed = spec.frontmatter.completed ? dayjs(spec.frontmatter.completed) : null;
  
  let specStart = created;
  let specEnd = due || completed;
  
  if (!specEnd && spec.frontmatter.status !== 'complete') {
    specEnd = created.add(2, 'week');
  }
  
  if (!specEnd) {
    const daysFromStart = created.diff(startDate, 'day');
    const position = Math.floor((daysFromStart / 7) * charsPerWeek);
    
    if (position >= 0 && position < totalChars) {
      return (
        <Text>
          {' '.repeat(position)}
          <Text color="cyan">■</Text>
          {' '.repeat(totalChars - position - 1)}
        </Text>
      );
    }
    return <Text>{' '.repeat(totalChars)}</Text>;
  }
  
  const startDaysFromStart = specStart.diff(startDate, 'day');
  const endDaysFromStart = specEnd.diff(startDate, 'day');
  
  const startPos = Math.floor((startDaysFromStart / 7) * charsPerWeek);
  const endPos = Math.floor((endDaysFromStart / 7) * charsPerWeek);
  
  const barStart = Math.max(0, startPos);
  const barEnd = Math.min(totalChars, endPos);
  const barLength = Math.max(1, barEnd - barStart);
  
  // Calculate marker positions
  const todayDays = today.diff(startDate, 'day');
  const todayPos = Math.floor((todayDays / 7) * charsPerWeek);
  const duePos = due ? Math.floor((due.diff(startDate, 'day') / 7) * charsPerWeek) : -1;
  
  // Build simple bar
  const parts: React.ReactElement[] = [];
  
  // Leading space
  if (barStart > 0) {
    // Check if today marker is in leading space
    if (todayPos >= 0 && todayPos < barStart) {
      parts.push(<Text key="lead1">{' '.repeat(todayPos)}</Text>);
      parts.push(<Text key="today" color="blue">○</Text>);
      parts.push(<Text key="lead2">{' '.repeat(barStart - todayPos - 1)}</Text>);
    } else {
      parts.push(<Text key="leading">{' '.repeat(barStart)}</Text>);
    }
  }
  
  // Bar content based on status
  if (spec.frontmatter.status === 'complete') {
    const barContent = '■'.repeat(barLength);
    if (duePos >= barStart && duePos < barEnd) {
      const beforeDue = barStart;
      const afterDue = barEnd - duePos - 1;
      parts.push(<Text key="bar1" color="green">{'■'.repeat(duePos - barStart)}</Text>);
      parts.push(<Text key="due" color="red">▸</Text>);
      parts.push(<Text key="bar2" color="green">{'■'.repeat(afterDue)}</Text>);
    } else {
      parts.push(<Text key="bar" color="green">{barContent}</Text>);
      if (duePos === barEnd) {
        parts.push(<Text key="due" color="red">▸</Text>);
      }
    }
  } else if (spec.frontmatter.status === 'in-progress') {
    const halfLength = Math.floor(barLength / 2);
    parts.push(<Text key="filled" color="yellow">{'■'.repeat(halfLength)}</Text>);
    parts.push(<Text key="empty" dimColor>{'□'.repeat(barLength - halfLength)}</Text>);
    if (duePos === barEnd) {
      parts.push(<Text key="due" color="red">▸</Text>);
    }
  } else {
    parts.push(<Text key="bar" dimColor>{'□'.repeat(barLength)}</Text>);
    if (duePos === barEnd) {
      parts.push(<Text key="due" color="red">▸</Text>);
    }
  }
  
  // Trailing space
  const trailingStart = barEnd + (duePos === barEnd ? 1 : 0);
  const trailingSpace = totalChars - trailingStart;
  if (trailingSpace > 0) {
    // Check if today marker is in trailing space
    if (todayPos >= trailingStart && todayPos < totalChars) {
      const beforeToday = todayPos - trailingStart;
      const afterToday = totalChars - todayPos - 1;
      if (beforeToday > 0) parts.push(<Text key="trail1">{' '.repeat(beforeToday)}</Text>);
      parts.push(<Text key="today2" color="blue">○</Text>);
      if (afterToday > 0) parts.push(<Text key="trail2">{' '.repeat(afterToday)}</Text>);
    } else {
      parts.push(<Text key="trailing">{' '.repeat(trailingSpace)}</Text>);
    }
  }
  
  return <Box>{parts}</Box>;
};
