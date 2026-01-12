import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock localStorage with a simple in-memory storage
const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  }),
  key: vi.fn((index: number) => Object.keys(store)[index] || null),
  get length() {
    return Object.keys(store).length;
  },
};

global.localStorage = localStorageMock as Storage;

beforeEach(() => {
  // Clear the store
  Object.keys(store).forEach((key) => delete store[key]);
  // Clear mock call history
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

afterEach(() => {
  cleanup();
});
