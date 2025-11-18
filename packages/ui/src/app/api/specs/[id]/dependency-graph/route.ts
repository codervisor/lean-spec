/**
 * GET /api/specs/[id]/dependency-graph - Get complete dependency graph for a spec
 * 
 * Returns upstream dependencies, downstream dependents, and related specs
 * for the specified spec using the SpecDependencyGraph from @leanspec/core
 */

import { NextResponse } from 'next/server';
import { getSpecById } from '@/lib/db/service-queries';
import { SpecDependencyGraph, type SpecInfo } from '@/lib/dependency-graph';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/**
 * Load all specs with relationships from filesystem
 */
function loadAllSpecsWithRelationships(specsDir: string): SpecInfo[] {
  const specInfos: SpecInfo[] = [];
  
  try {
    const entries = readdirSync(specsDir);
    
    for (const entry of entries) {
      const specPath = join(specsDir, entry);
      const stat = statSync(specPath);
      
      if (!stat.isDirectory()) continue;
      if (entry === 'archived') continue; // Skip archived
      if (!/^\d{2,}-/.test(entry)) continue; // Must be spec pattern (e.g., 001-name)
      
      try {
        const readmePath = join(specPath, 'README.md');
        const raw = readFileSync(readmePath, 'utf-8');
        const { data } = matter(raw);
        
        if (!data || !data.status) continue;
        
        const frontmatter: any = {
          status: data.status || 'planned',
          created: data.created_at || data.created || new Date().toISOString().split('T')[0],
        };
        
        // Parse relationships - normalize to arrays
        if (data.depends_on) {
          frontmatter.depends_on = Array.isArray(data.depends_on) 
            ? data.depends_on 
            : [data.depends_on];
        } else {
          frontmatter.depends_on = [];
        }
        
        if (data.related) {
          frontmatter.related = Array.isArray(data.related) 
            ? data.related 
            : [data.related];
        } else {
          frontmatter.related = [];
        }
        
        // Add optional fields
        if (data.priority) frontmatter.priority = data.priority;
        if (data.tags) frontmatter.tags = data.tags;
        if (data.assignee) frontmatter.assignee = data.assignee;
        
        specInfos.push({
          path: entry,
          fullPath: specPath,
          filePath: readmePath,
          name: entry,
          frontmatter,
        });
      } catch (err) {
        console.warn(`Failed to parse spec ${entry}:`, err);
      }
    }
  } catch (error) {
    console.error('Failed to load specs:', error);
  }
  
  return specInfos;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the target spec
    const spec = await getSpecById(id);
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec not found' },
        { status: 404 }
      );
    }

    // Load all specs from filesystem with relationships
    const specsDir = join(process.cwd(), '../../specs');
    const specInfos = loadAllSpecsWithRelationships(specsDir);
    
    // Build dependency graph
    const graph = new SpecDependencyGraph(specInfos);
    
    // Get complete graph for the target spec
    const completeGraph = graph.getCompleteGraph(spec.specName);
    
    // Helper to extract spec number from name
    const getSpecNumber = (name: string): number | null => {
      const match = name.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };
    
    // Helper to extract title from name
    const getTitle = (name: string): string => {
      const parts = name.split('-');
      if (parts.length > 1) {
        return parts.slice(1).join('-').replace(/-/g, ' ');
      }
      return name;
    };
    
    // Format response with simplified spec metadata
    const response = {
      current: {
        id: spec.id,
        specNumber: spec.specNumber,
        specName: spec.specName,
        title: spec.title,
        status: spec.status,
        priority: spec.priority,
      },
      dependsOn: completeGraph.dependsOn.map(s => ({
        specNumber: getSpecNumber(s.name),
        specName: s.name,
        title: getTitle(s.name),
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      requiredBy: completeGraph.requiredBy.map(s => ({
        specNumber: getSpecNumber(s.name),
        specName: s.name,
        title: getTitle(s.name),
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      related: completeGraph.related.map(s => ({
        specNumber: getSpecNumber(s.name),
        specName: s.name,
        title: getTitle(s.name),
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
    };
    
    // Return with cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dependency graph' },
      { status: 500 }
    );
  }
}
