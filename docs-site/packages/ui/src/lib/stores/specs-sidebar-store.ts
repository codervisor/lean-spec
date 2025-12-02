'use client';

import * as React from 'react';
import { useSyncExternalStore } from 'react';
import type { SidebarSpec } from '@/types/specs';

interface SidebarState {
  specs: SidebarSpec[];
  signature: string | null;
  scrollTop: number;
  activeSpecId: string | null;
}

let state: SidebarState = {
  specs: [],
  signature: null,
  scrollTop: 0,
  activeSpecId: null,
};

const EMPTY_SIDEBAR_SPECS: SidebarSpec[] = [];

const listeners = new Set<() => void>();

// Separate listeners for different state slices to avoid unnecessary re-renders
const specsListeners = new Set<() => void>();
const activeSpecListeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function emitSpecsChange() {
  for (const listener of specsListeners) {
    listener();
  }
}

function emitActiveSpecChange() {
  for (const listener of activeSpecListeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

function computeSignature(specs: SidebarSpec[]): string {
  return specs
    .map((spec) => [
      spec.id,
      spec.specNumber ?? '',
      spec.title ?? '',
      spec.status ?? '',
      spec.priority ?? '',
      spec.updatedAt ? new Date(spec.updatedAt).getTime() : 0,
    ].join(':'))
    .join('|');
}

export function useSpecsSidebarState() {
  return useSyncExternalStore(subscribe, getState, () => state);
}

// Optimized selector hooks that only subscribe to specific state slices
export function useSpecsSidebarSpecs() {
  const subscribeToSpecs = React.useCallback((listener: () => void) => {
    specsListeners.add(listener);
    return () => {
      specsListeners.delete(listener);
    };
  }, []);

  return useSyncExternalStore(
    subscribeToSpecs,
    () => getState().specs,
    () => EMPTY_SIDEBAR_SPECS
  );
}

export function useSpecsSidebarActiveSpec() {
  const subscribeToActiveSpec = React.useCallback((listener: () => void) => {
    activeSpecListeners.add(listener);
    return () => {
      activeSpecListeners.delete(listener);
    };
  }, []);

  return useSyncExternalStore(
    subscribeToActiveSpec,
    () => getState().activeSpecId,
    () => null
  );
}

export function primeSpecsSidebar(specs: SidebarSpec[]) {
  if (specs.length === 0) {
    return;
  }

  const signature = computeSignature(specs);
  if (signature === state.signature) {
    return;
  }

  state = {
    ...state,
    specs,
    signature,
  };
  emitChange();
  emitSpecsChange(); // Notify specs-specific listeners
}

export function setActiveSidebarSpec(specId: string) {
  if (state.activeSpecId === specId) {
    return;
  }

  state = {
    ...state,
    activeSpecId: specId,
  };
  emitChange();
  emitActiveSpecChange(); // Notify activeSpec-specific listeners
}

export function updateSidebarScrollTop(nextScrollTop: number) {
  if (Math.abs(nextScrollTop - state.scrollTop) < 1) {
    return;
  }

  state = {
    ...state,
    scrollTop: nextScrollTop,
  };
  // Scroll position persistence should not trigger subscriber re-renders.
}

export function getSidebarScrollTop() {
  return state.scrollTop;
}
