# Notification System

## Overview

Real-time notification system for user actions and events.

## Problem

Users need to stay informed about:
- Task assignments and updates
- Project invitations
- Mentions in comments
- Due date reminders
- System announcements

## Solution

Multi-channel notification system supporting:
- In-app notifications (real-time via WebSocket)
- Email notifications (batched digest option)
- Push notifications (mobile app, future)
- SMS for critical alerts (optional)

## Features

### Notification Types

- `task.assigned` - Task assigned to user
- `task.updated` - Task you're watching updated
- `task.due_soon` - Task due within 24 hours
- `comment.mention` - User mentioned in comment
- `project.invited` - Invited to join project
- `system.announcement` - Important system messages

### User Preferences

Users can configure per channel:
- Which notification types to receive
- Quiet hours (no notifications 10pm-8am)
- Digest mode (batch emails daily/weekly)
- Mute specific projects

## Technical Design

### Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_digest VARCHAR(20) DEFAULT 'instant',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  muted_projects UUID[]
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
```

### Real-time Delivery

```typescript
// WebSocket event
io.to(`user:${userId}`).emit('notification', {
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  link: notification.link,
  createdAt: notification.createdAt
});
```

### Email Queue

Use message queue (Redis/RabbitMQ) for async email delivery:

```typescript
await queue.add('send-notification-email', {
  userId,
  notificationId,
  type: 'instant' // or 'digest'
});
```

## Implementation Phases

1. **Week 1**: Database schema, basic in-app notifications
2. **Week 2**: WebSocket real-time delivery, notification center UI
3. **Week 3**: Email notifications with preferences
4. **Week 4**: Digest mode, quiet hours, muting

## Dependencies

- WebSocket infrastructure (Socket.io)
- Email service (SendGrid/Mailgun)
- Message queue (Redis)

## Open Questions

- Should we implement push notifications in v1?
- Retention policy for old notifications (archive after 90 days?)
- Rate limiting to prevent notification spam?
