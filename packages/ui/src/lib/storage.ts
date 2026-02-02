
export const STORAGE_KEYS = {
  // Global UI Preferences
  THEME: 'leanspec:ui:theme',
  SIDEBAR_COLLAPSED: 'leanspec:ui:sidebarCollapsed',
  HIERARCHY_VIEW: 'leanspec:ui:hierarchyView',
  SHOW_ARCHIVED: 'leanspec:ui:showArchived',
  
  // Sidebar Filters
  SIDEBAR_FILTER_STATUS: 'leanspec:sidebar:filters:status',
  SIDEBAR_FILTER_PRIORITY: 'leanspec:sidebar:filters:priority',
  SIDEBAR_FILTER_TAGS: 'leanspec:sidebar:filters:tags',
  
  // Specs Page Preferences
  PAGE_PREFERENCES: 'leanspec:page:preferences', // Keeping the object structure for now to minimize refactor risk unless simpler
  
  // Transient (Session Storage)
  SIDEBAR_SCROLL: 'leanspec:ui:sidebarScroll',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Helper to safe access storage
export const storage = {
  get: <T>(key: string, defaultValue: T, useSession = false): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const store = useSession ? sessionStorage : localStorage;
      const item = store.getItem(key);
      if (item === null) return defaultValue;
      
      // Try to parse JSON, fallback to string if it fails or if primitive expected
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`Error reading from storage key "${key}":`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T, useSession = false): void => {
    if (typeof window === 'undefined') return;
    try {
      const store = useSession ? sessionStorage : localStorage;
      if (typeof value === 'string') {
        store.setItem(key, value);
      } else {
        store.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`Error writing to storage key "${key}":`, e);
    }
  },

  remove: (key: string, useSession = false): void => {
    if (typeof window === 'undefined') return;
    try {
      const store = useSession ? sessionStorage : localStorage;
      store.removeItem(key);
    } catch (e) {
      console.warn(`Error removing storage key "${key}":`, e);
    }
  },
  
  // Migration helper
  migrateFromSessionToLocal: (sessionKey: string, localKey: string) => {
    if (typeof window === 'undefined') return;
    try {
        const sessionValue = sessionStorage.getItem(sessionKey);
        const localValue = localStorage.getItem(localKey);
        
        // Only migrate if session has value and local does not
        if (sessionValue !== null && localValue === null) {
            localStorage.setItem(localKey, sessionValue);
        }
        
        // Clean up session storage? Spec says "Remove sessionStorage keys after read"
        if (sessionValue !== null) {
           // We keep it strictly or remove it? Spec says "Remove sessionStorage keys after read"
           sessionStorage.removeItem(sessionKey);
        }
    } catch (e) {
        console.warn(`Error migrating ${sessionKey} to ${localKey}:`, e);
    }
  }
};
