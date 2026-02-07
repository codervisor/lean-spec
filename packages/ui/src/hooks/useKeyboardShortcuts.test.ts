import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, KeyboardShortcut } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown' && typeof handler === 'function') {
        keydownHandler = handler;
      }
    });

    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {
      keydownHandler = null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    keydownHandler = null;
  });

  function simulateKeydown(options: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    target?: EventTarget;
  }) {
    const event = new KeyboardEvent('keydown', {
      key: options.key,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
    });

    // Override readonly target property
    if (options.target) {
      Object.defineProperty(event, 'target', { value: options.target, writable: false });
    }

    keydownHandler?.(event);
  }

  it('should register keydown listener on mount', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action: vi.fn() },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown listener on unmount', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action: vi.fn() },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should trigger action for matching key', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    simulateKeydown({ key: 'h' });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should match keys case-insensitively', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'H', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    simulateKeydown({ key: 'h' });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should not trigger action for non-matching key', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    simulateKeydown({ key: 'x' });

    expect(action).not.toHaveBeenCalled();
  });

  it('should handle ctrl+key combinations', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrl: true, description: 'Save', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without ctrl - should not trigger
    simulateKeydown({ key: 's', ctrlKey: false });
    expect(action).not.toHaveBeenCalled();

    // With ctrl - should trigger
    simulateKeydown({ key: 's', ctrlKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle shift+key combinations', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'n', shift: true, description: 'New', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without shift - should not trigger
    simulateKeydown({ key: 'n', shiftKey: false });
    expect(action).not.toHaveBeenCalled();

    // With shift - should trigger
    simulateKeydown({ key: 'n', shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle ctrl+shift+key combinations', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'i', ctrl: true, shift: true, description: 'Toggle chat', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Only ctrl
    simulateKeydown({ key: 'i', ctrlKey: true, shiftKey: false });
    expect(action).not.toHaveBeenCalled();

    // Only shift
    simulateKeydown({ key: 'i', ctrlKey: false, shiftKey: true });
    expect(action).not.toHaveBeenCalled();

    // Both ctrl and shift
    simulateKeydown({ key: 'i', ctrlKey: true, shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when typing in input', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    simulateKeydown({ key: 'h', target: input });

    expect(action).not.toHaveBeenCalled();
  });

  it('should not trigger when typing in textarea', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    simulateKeydown({ key: 'h', target: textarea });

    expect(action).not.toHaveBeenCalled();
  });

  it('should not trigger when typing in select', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const select = document.createElement('select');
    simulateKeydown({ key: 'h', target: select });

    expect(action).not.toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const homeAction = vi.fn();
    const saveAction = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'Go home', action: homeAction },
      { key: 's', ctrl: true, description: 'Save', action: saveAction },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    simulateKeydown({ key: 'h' });
    expect(homeAction).toHaveBeenCalledTimes(1);
    expect(saveAction).not.toHaveBeenCalled();

    simulateKeydown({ key: 's', ctrlKey: true });
    expect(homeAction).toHaveBeenCalledTimes(1);
    expect(saveAction).toHaveBeenCalledTimes(1);
  });

  it('should only trigger first matching shortcut', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'h', description: 'First H', action: action1 },
      { key: 'h', description: 'Second H', action: action2 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    simulateKeydown({ key: 'h' });

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });

  it('should update shortcuts when dependencies change', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();

    const { rerender } = renderHook(
      ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
      {
        initialProps: {
          shortcuts: [{ key: 'h', description: 'First', action: action1 }],
        },
      }
    );

    simulateKeydown({ key: 'h' });
    expect(action1).toHaveBeenCalledTimes(1);

    rerender({
      shortcuts: [{ key: 'h', description: 'Second', action: action2 }],
    });

    simulateKeydown({ key: 'h' });
    expect(action2).toHaveBeenCalledTimes(1);
  });
});
