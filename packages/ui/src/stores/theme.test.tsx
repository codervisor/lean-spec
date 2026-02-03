import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeStore, STORAGE_KEY } from './theme';

function mockMatchMedia(matches = false) {
  return vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('useThemeStore', () => {
  let originalClassList: DOMTokenList;
  let classListMock: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia(false),
      configurable: true,
    });

    classListMock = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    originalClassList = document.documentElement.classList;
    Object.defineProperty(document.documentElement, 'classList', {
      value: classListMock,
      writable: true,
      configurable: true,
    });

    useThemeStore.setState((state) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: state.setTheme,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document.documentElement, 'classList', {
      value: originalClassList,
      writable: true,
      configurable: true,
    });
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        value: originalMatchMedia,
        configurable: true,
      });
    }
  });

  it('defaults to system theme', () => {
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.theme).toBe('system');
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('applies theme classes to document', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('dark');
      vi.runAllTimers();
    });

    expect(classListMock.add).toHaveBeenCalledWith('dark');
    expect(classListMock.remove).toHaveBeenCalledWith('light', 'dark');
  });

  it('updates resolvedTheme on theme change', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });
});
