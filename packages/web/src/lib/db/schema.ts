/**
 * Database schema for LeanSpec Web
 * Using Drizzle ORM with SQLite (development) / PostgreSQL (production)
 */

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Projects table - GitHub repositories using LeanSpec
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  githubOwner: text('github_owner').notNull(),
  githubRepo: text('github_repo').notNull(),
  displayName: text('display_name'),
  description: text('description'),
  homepageUrl: text('homepage_url'),
  stars: integer('stars').default(0),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Specs table - Cached specification content from GitHub
export const specs = sqliteTable('specs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  specNumber: integer('spec_number'),
  specName: text('spec_name').notNull(),
  title: text('title'),
  status: text('status', { 
    enum: ['planned', 'in-progress', 'complete', 'archived'] 
  }),
  priority: text('priority', { 
    enum: ['low', 'medium', 'high', 'critical'] 
  }),
  tags: text('tags'), // JSON string array
  assignee: text('assignee'),
  contentMd: text('content_md').notNull(), // Full markdown content
  contentHtml: text('content_html'), // Pre-rendered HTML (optional optimization)
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  filePath: text('file_path').notNull(), // Path in repo
  githubUrl: text('github_url'), // Direct GitHub file link
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Unique constraint on projectId + specNumber (prevent duplicates within a project)
  uniqueSpecNumber: uniqueIndex('unique_spec_number').on(table.projectId, table.specNumber),
}));

// Spec relationships table - Tracks dependencies between specs
export const specRelationships = sqliteTable('spec_relationships', {
  id: text('id').primaryKey(),
  specId: text('spec_id').notNull().references(() => specs.id, { onDelete: 'cascade' }),
  relatedSpecId: text('related_spec_id').notNull().references(() => specs.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type', {
    enum: ['depends_on', 'related']
  }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Sync logs table - Audit trail for GitHub sync operations
export const syncLogs = sqliteTable('sync_logs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['pending', 'running', 'success', 'failed']
  }).notNull(),
  specsAdded: integer('specs_added').default(0),
  specsUpdated: integer('specs_updated').default(0),
  specsDeleted: integer('specs_deleted').default(0),
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  durationMs: integer('duration_ms'),
});

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
  specs: many(specs),
  syncLogs: many(syncLogs),
}));

export const specsRelations = relations(specs, ({ one, many }) => ({
  project: one(projects, {
    fields: [specs.projectId],
    references: [projects.id],
  }),
  dependencies: many(specRelationships, { relationName: 'spec' }),
  dependents: many(specRelationships, { relationName: 'relatedSpec' }),
}));

export const specRelationshipsRelations = relations(specRelationships, ({ one }) => ({
  spec: one(specs, {
    fields: [specRelationships.specId],
    references: [specs.id],
    relationName: 'spec',
  }),
  relatedSpec: one(specs, {
    fields: [specRelationships.relatedSpecId],
    references: [specs.id],
    relationName: 'relatedSpec',
  }),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  project: one(projects, {
    fields: [syncLogs.projectId],
    references: [projects.id],
  }),
}));

// Export types
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Spec = typeof specs.$inferSelect;
export type NewSpec = typeof specs.$inferInsert;
export type SpecRelationship = typeof specRelationships.$inferSelect;
export type NewSpecRelationship = typeof specRelationships.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
