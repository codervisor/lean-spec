import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';
import { STORAGE_KEY } from './theme';

// Create a wrapper component for testing
function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  let originalClassList: DOMTokenList;
  let classListMock: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Mock document.documentElement.classList
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
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document.documentElement, 'classList', {
      value: originalClassList,
      writable: true,
      configurable: true,
    });
  });

  it('should provide default theme as system', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('system');
  });

  it('should resolve system theme to light or dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(['light', 'dark']).toContain(result.current.resolvedTheme);
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('should load theme from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  it('should apply theme class to document', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
      vi.runAllTimers();
    });

    expect(classListMock.add).toHaveBeenCalledWith('dark');
  });

  it('should remove old theme classes when changing theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
      vi.runAllTimers();
    });

    expect(classListMock.remove).toHaveBeenCalledWith('light', 'dark');
  });

  it('should add changing-theme class during transition', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('light');
    });

    expect(classListMock.add).toHaveBeenCalledWith('changing-theme');
  });

  it('should remove changing-theme class after transition', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('light');
      vi.advanceTimersByTime(100);
    });

    expect(classListMock.remove).toHaveBeenCalledWith('changing-theme');
  });

  it('should update theme when setTheme is called', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should handle switching to system theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('should handle switching between light and dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.resolvedTheme).toBe('light');

    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.resolvedTheme).toBe('dark');
  });
});
