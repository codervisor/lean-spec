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
  uiUrl: string;
  activeProjectId?: string;
  config: DesktopConfig;
  projects: DesktopProject[];
}
