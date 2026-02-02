import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let listeners: Array<() => void> = [];
  let mockMatches = false;

  beforeEach(() => {
    listeners = [];
    mockMatches = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: mockMatches,
        media: query,
        onchange: null,
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            listeners.push(callback);
          }
        }),
        removeEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            listeners = listeners.filter((cb) => cb !== callback);
          }
        }),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it('should return false when media query does not match', () => {
    mockMatches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('should return true when media query matches', () => {
    mockMatches = true;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should add event listener on mount', () => {
    const addEventListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener,
        removeEventListener: vi.fn(),
      })),
    });

    renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const removeEventListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener,
      })),
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should respond to different media queries', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { result: darkQuery } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    const { result: lightQuery } = renderHook(() => useMediaQuery('(prefers-color-scheme: light)'));

    expect(darkQuery.current).toBe(true);
    expect(lightQuery.current).toBe(false);
  });

  it('should update on query change', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 768px)' },
    });

    expect(result.current).toBe(false);

    rerender({ query: '(min-width: 1024px)' });
    expect(result.current).toBe(true);
  });
});
