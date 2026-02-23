/**
 * Zustand store for Chat page preferences.
 * Uses persist middleware for automatic localStorage sync.
 * Preferences are global (shared across all projects).
 *
 * Persists:
 * - Selected model (provider + model ID)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface SelectedModel {
  providerId: string;
  modelId: string;
}

interface ChatPreferencesState {
  /** Last selected model (global across all projects) */
  selectedModel: SelectedModel | null;
  /** Update the persisted model selection */
  setSelectedModel: (model: SelectedModel | null) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useChatPreferencesStore = create<ChatPreferencesState>()(
  persist(
    (set) => ({
      selectedModel: null,
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: 'leanspec:chat:preferences',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    }
  )
);


