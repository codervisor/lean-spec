import { invoke } from '@tauri-apps/api/tauri';
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

export async function checkForUpdates(): Promise<void> {
  return invoke('desktop_check_updates');
}
