import { invoke } from '@tauri-apps/api/core';
import type {
  DesktopBootstrapPayload,
  Spec,
  LightweightSpec,
  StatsResult,
  DependencyGraph,
  SpecDependencies,
  ValidationResult,
} from '../types';

// ============================================================================
// Desktop Commands (existing)
// ============================================================================

export async function bootstrapDesktop(): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_bootstrap');
}

export async function switchProject(projectId: string): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_switch_project', { projectId });
}

export async function refreshProjects(): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_refresh_projects');
}

export async function openAddProjectDialog(): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_add_project');
}

export async function toggleFavorite(projectId: string): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_toggle_favorite', { projectId });
}

export async function removeProject(projectId: string): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_remove_project', { projectId });
}

export async function renameProject(projectId: string, newName: string): Promise<DesktopBootstrapPayload> {
  return invoke<DesktopBootstrapPayload>('desktop_rename_project', { projectId, newName });
}

export async function checkForUpdates(): Promise<void> {
  return invoke('desktop_check_updates');
}

export async function getDesktopVersion(): Promise<string> {
  return invoke<string>('desktop_version');
}

// ============================================================================
// Spec Commands (Phase 4 of spec 169 - Native Tauri API)
// ============================================================================

/**
 * Get all specs for a project
 * Replaces: GET /api/projects/[id]/specs
 */
export async function getSpecs(projectId: string): Promise<LightweightSpec[]> {
  return invoke<LightweightSpec[]>('get_specs', { projectId });
}

/**
 * Get a single spec by ID or number
 * Replaces: GET /api/projects/[id]/specs/[spec]
 */
export async function getSpecDetail(projectId: string, specId: string): Promise<Spec> {
  return invoke<Spec>('get_spec_detail', { projectId, specId });
}

/**
 * Get project statistics
 * Replaces: GET /api/projects/[id]/stats
 */
export async function getProjectStats(projectId: string): Promise<StatsResult> {
  return invoke<StatsResult>('get_project_stats', { projectId });
}

/**
 * Get dependency graph for visualization
 * Replaces: GET /api/projects/[id]/specs/[spec]/dependency-graph
 */
export async function getDependencyGraph(projectId: string): Promise<DependencyGraph> {
  return invoke<DependencyGraph>('get_dependency_graph', { projectId });
}

/**
 * Get dependencies for a specific spec
 * Replaces: GET /api/projects/[id]/dependencies (filtered)
 */
export async function getSpecDependencies(projectId: string, specId: string): Promise<SpecDependencies> {
  return invoke<SpecDependencies>('get_spec_dependencies_cmd', { projectId, specId });
}

/**
 * Search specs by query
 * Part of: GET /api/projects/[id]/specs with query param
 */
export async function searchSpecs(projectId: string, query: string): Promise<LightweightSpec[]> {
  return invoke<LightweightSpec[]>('search_specs', { projectId, query });
}

/**
 * Get specs by status
 * Part of: GET /api/projects/[id]/specs with status filter
 */
export async function getSpecsByStatus(projectId: string, status: string): Promise<LightweightSpec[]> {
  return invoke<LightweightSpec[]>('get_specs_by_status', { projectId, status });
}

/**
 * Get all unique tags
 * Replaces: GET /api/projects/[id]/tags
 */
export async function getAllTags(projectId: string): Promise<string[]> {
  return invoke<string[]>('get_all_tags', { projectId });
}

/**
 * Validate a single spec
 * Part of: POST /api/projects/[id]/validate
 */
export async function validateSpec(projectId: string, specId: string): Promise<ValidationResult> {
  return invoke<ValidationResult>('validate_spec_cmd', { projectId, specId });
}

/**
 * Validate all specs in a project
 * Replaces: POST /api/projects/[id]/validate
 */
export async function validateAllSpecs(projectId: string): Promise<ValidationResult[]> {
  return invoke<ValidationResult[]>('validate_all_specs_cmd', { projectId });
}

/**
 * Update spec status
 * Replaces: POST /api/projects/[id]/specs/[spec]/status
 */
export async function updateSpecStatus(
  projectId: string,
  specId: string,
  newStatus: string,
  force?: boolean
): Promise<Spec> {
  return invoke<Spec>('update_spec_status', { projectId, specId, newStatus, force });
}
