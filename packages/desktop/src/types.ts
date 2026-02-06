import type {
  DependencyGraph as UiDependencyGraph,
  DependencyInfo as UiDependencyInfo,
  LightweightSpec as UiLightweightSpec,
  Spec as UiSpec,
  SpecDependencies as UiSpecDependencies,
  StatsResult as UiStatsResult,
  ValidationIssue as UiValidationIssue,
  ValidationResult as UiValidationResult,
} from '@leanspec/ui';

export interface DesktopWindowPreferences {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

export interface DesktopBehaviorPreferences {
  startMinimized: boolean;
  minimizeToTray: boolean;
  launchAtLogin: boolean;
}

export interface DesktopShortcutConfig {
  toggleWindow: string;
  quickSwitcher: string;
  newSpec: string;
}

export interface DesktopUpdatesConfig {
  autoCheck: boolean;
  autoInstall: boolean;
  channel: 'stable' | 'beta';
}

export interface DesktopAppearanceConfig {
  theme: 'light' | 'dark' | 'system';
}

export interface DesktopConfig {
  window: DesktopWindowPreferences;
  behavior: DesktopBehaviorPreferences;
  shortcuts: DesktopShortcutConfig;
  updates: DesktopUpdatesConfig;
  appearance: DesktopAppearanceConfig;
}

export interface DesktopProject {
  id: string;
  name: string;
  path: string;
  specsDir: string;
  lastAccessed: string;
  favorite: boolean;
  color?: string;
  description?: string;
}

export interface DesktopBootstrapPayload {
  activeProjectId?: string;
  config: DesktopConfig;
  projects: DesktopProject[];
}

// ============================================================================
// Spec Types (Phase 4 of spec 169 - Native Tauri API)
// ============================================================================

/** A full spec with all content */
export type Spec = UiSpec;

/** Lightweight spec without full content (for list views) */
export type LightweightSpec = UiLightweightSpec;

/** Statistics result for a project */
export type StatsResult = UiStatsResult;

/** Complete dependency graph */
export type DependencyGraph = UiDependencyGraph;

/** Dependencies for a specific spec */
export type SpecDependencies = UiSpecDependencies;

/** Information about a dependency */
export type DependencyInfo = UiDependencyInfo;

/** Validation result */
export type ValidationResult = UiValidationResult;

/** Validation issue */
export type ValidationIssue = UiValidationIssue;
