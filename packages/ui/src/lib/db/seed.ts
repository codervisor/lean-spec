/**
 * Seed database with LeanSpec's own specs
 */

import { db, schema } from './index';
import matter from 'gray-matter';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Path to specs directory (relative to monorepo root)
const SPECS_DIR = join(process.cwd(), '../../specs');

type Frontmatter = {
  title?: string;
  status?: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: string;
  created?: string;
  created_at?: string;
  updated?: string;
  updated_at?: string;
  completed?: string;
  completed_at?: string;
};

interface ParsedSpec {
  number: number | null;
  name: string;
  frontmatter: Frontmatter;
  content: string;
  filePath: string;
}

function parseSpecDirectory(dirPath: string): ParsedSpec | null {
  try {
    const readmePath = join(dirPath, 'README.md');
    const content = readFileSync(readmePath, 'utf-8');
    const { data: frontmatter, content: markdownContent } = matter(content);
    
    // Extract spec number and name from directory name
    const dirName = dirPath.split('/').pop() || '';
    const match = dirName.match(/^(\d+)-(.+)$/);
    const specNumber = match ? parseInt(match[1], 10) : null;
    const specName = match ? match[2] : dirName;
    
    return {
      number: specNumber,
      name: specName,
      frontmatter: frontmatter as Frontmatter,
      content: markdownContent, // Use the parsed content without frontmatter
      filePath: `specs/${dirName}/README.md`,
    };
  } catch (error) {
    console.error(`Failed to parse spec ${dirPath}:`, error);
    return null;
  }
}

function getAllSpecs(): ParsedSpec[] {
  const specs: ParsedSpec[] = [];
  const entries = readdirSync(SPECS_DIR);
  
  for (const entry of entries) {
    const entryPath = join(SPECS_DIR, entry);
    const stat = statSync(entryPath);
    
    // Skip archived specs and non-directories
    if (!stat.isDirectory() || entry === 'archived') {
      continue;
    }
    
    const spec = parseSpecDirectory(entryPath);
    if (spec) {
      specs.push(spec);
    }
  }
  
  return specs.sort((a, b) => (a.number || 0) - (b.number || 0));
}

async function seed() {
  console.log('Seeding database with LeanSpec specs...');
  
  // Clear existing data for LeanSpec project (idempotent seed)
  console.log('Clearing existing LeanSpec data...');
  const existingProjects = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.githubRepo, 'lean-spec'));
  
  for (const project of existingProjects) {
    // Cascade delete will remove associated specs
    await db.delete(schema.projects).where(eq(schema.projects.id, project.id));
  }
  
  // Create LeanSpec project
  const projectId = randomUUID();
  await db.insert(schema.projects).values({
    id: projectId,
    githubOwner: 'codervisor',
    githubRepo: 'lean-spec',
    displayName: 'LeanSpec',
    description: 'Lightweight spec methodology for AI-powered development',
    homepageUrl: 'https://lean-spec.dev',
    stars: 0,
    isPublic: true,
    isFeatured: true,
    lastSyncedAt: new Date(),
  });
  
  console.log(`Created project: ${projectId}`);
  
  // Load and insert specs
  const specs = getAllSpecs();
  console.log(`Found ${specs.length} specs`);
  
  for (const spec of specs) {
    const specId = randomUUID();
    const fm = spec.frontmatter;
    const parseDate = (value?: string) => (value ? new Date(value) : null);
    const created = fm.created_at ?? fm.created;
    const updated = fm.updated_at ?? fm.updated;
    const completed = fm.completed_at ?? fm.completed;
    
    await db.insert(schema.specs).values({
      id: specId,
      projectId,
      specNumber: spec.number,
      specName: spec.name,
      title: fm.title || spec.name,
      status: fm.status || 'planned',
      priority: fm.priority || 'medium',
      tags: fm.tags ? JSON.stringify(fm.tags) : null,
      assignee: fm.assignee || null,
      contentMd: spec.content,
      createdAt: parseDate(created),
      updatedAt: parseDate(updated),
      completedAt: parseDate(completed),
      filePath: spec.filePath,
      githubUrl: `https://github.com/codervisor/lean-spec/blob/main/${spec.filePath}`,
      syncedAt: new Date(),
    });
    
    console.log(`Inserted spec ${spec.number}: ${spec.name}`);
  }
  
  console.log('Seed complete!');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
