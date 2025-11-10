# Task Management Feature

## Overview

Core task management system allowing users to create, organize, and track tasks within projects.

## Problem

Users need a reliable way to:
- Create and organize tasks
- Track task status and progress
- Assign tasks to team members
- Set due dates and priorities
- Group tasks into projects

## Solution

Build a flexible task management system with:
- Hierarchical task organization (projects > tasks > subtasks)
- Rich task metadata (status, priority, assignee, due date)
- Real-time updates via WebSocket
- Drag-and-drop task reordering
- Bulk operations for efficiency

## Success Criteria

- Tasks can be created in < 3 seconds
- Support 1000+ tasks per project without performance degradation
- Real-time updates reach all connected clients within 500ms
- 99.9% uptime for task CRUD operations

## Key Features

### Task Properties

```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  dueDate?: Date;
  tags: string[];
  subtasks: Subtask[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Operations

- Create task with required fields (title, projectId)
- Update any task property
- Move tasks between projects
- Duplicate tasks with subtasks
- Archive/delete tasks
- Bulk status updates

## Technical Design

### Database Schema

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  assignee_id UUID REFERENCES users(id),
  due_date TIMESTAMP,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id),
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (task_id, tag)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### API Endpoints

```
GET    /projects/:id/tasks     - List tasks in project
POST   /projects/:id/tasks     - Create task
GET    /tasks/:id              - Get task details
PUT    /tasks/:id              - Update task
DELETE /tasks/:id              - Delete task
POST   /tasks/bulk-update      - Update multiple tasks
```

### Real-time Updates

Use Socket.io for WebSocket connections:

```typescript
socket.on('task:created', (task) => {
  // Broadcast to all users in project
  io.to(`project:${task.projectId}`).emit('task:created', task);
});

socket.on('task:updated', (taskId, updates) => {
  // Optimistic update on client
  // Broadcast changes to other clients
});
```

## Dependencies

- Projects service for project validation
- Users service for assignee validation
- Notifications service for task reminders
- Search service for task search

## Open Questions

- Should we support task templates?
- Do we need task comments/activity feed?
- What's the max subtask depth (current: 1 level)?
- Should deleted tasks be soft-deleted or hard-deleted?

## Non-Goals

- Time tracking (separate feature)
- Gantt charts (separate feature)
- Custom fields (v2 feature)
