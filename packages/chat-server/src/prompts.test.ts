import { describe, it, expect } from 'vitest';
import { systemPrompt } from './prompts';

describe('systemPrompt', () => {
  it('should include core capabilities', () => {
    expect(systemPrompt).toContain('list');
    expect(systemPrompt).toContain('search');
    expect(systemPrompt).toContain('create');
    expect(systemPrompt).toContain('update');
    expect(systemPrompt).toContain('validate');
  });

  it('should include LeanSpec rules', () => {
    expect(systemPrompt).toContain('2000 tokens');
    expect(systemPrompt).toContain('kebab-case');
  });

  it('should emphasize tool usage', () => {
    expect(systemPrompt).toContain('Use tools');
    expect(systemPrompt).toContain('never invent spec IDs');
  });

  it('should be concise (under 500 chars)', () => {
    expect(systemPrompt.length).toBeLessThan(500);
  });
});
