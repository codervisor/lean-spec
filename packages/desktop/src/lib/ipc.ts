import { invoke } from '@tauri-apps/api/core';
import type { DesktopBootstrapPayload } from '../types';

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
