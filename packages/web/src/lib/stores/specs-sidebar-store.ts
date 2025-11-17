'use client';

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

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
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
}

export function updateSidebarScrollTop(nextScrollTop: number) {
  if (Math.abs(nextScrollTop - state.scrollTop) < 1) {
    return;
  }

  state = {
    ...state,
    scrollTop: nextScrollTop,
  };
  emitChange();
}

export function getSidebarScrollTop() {
  return state.scrollTop;
}
