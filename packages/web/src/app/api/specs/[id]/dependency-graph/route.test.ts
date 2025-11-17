/**
 * Test the dependency-graph API endpoint
 */

import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('Dependency Graph API', () => {
  it('should return complete dependency graph for spec 097', async () => {
    // Mock params
    const params = Promise.resolve({ id: '097' });
    
    // Create mock request
    const request = new Request('http://localhost:3000/api/specs/097/dependency-graph');
    
    // Call the endpoint
    const response = await GET(request, { params });
    
    // Parse response
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('dependsOn');
    expect(data).toHaveProperty('requiredBy');
    expect(data).toHaveProperty('related');
    
    // Verify current spec
    expect(data.current.specName).toBe('097-dag-visualization-library');
    expect(data.current.status).toBe('in-progress');
    
    // Verify dependencies (should include 082)
    expect(data.dependsOn).toBeInstanceOf(Array);
    const dep082 = data.dependsOn.find((s: any) => s.specName === '082-web-realtime-sync-architecture');
    expect(dep082).toBeDefined();
    expect(dep082?.status).toBe('complete');
    
    // Verify required by (should include 099)
    expect(data.requiredBy).toBeInstanceOf(Array);
    const req099 = data.requiredBy.find((s: any) => s.specName === '099-enhanced-dependency-commands-cli-mcp');
    expect(req099).toBeDefined();
    expect(req099?.status).toBe('complete');
  });

  it('should return 404 for non-existent spec', async () => {
    const params = Promise.resolve({ id: '999' });
    const request = new Request('http://localhost:3000/api/specs/999/dependency-graph');
    
    const response = await GET(request, { params });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
