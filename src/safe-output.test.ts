import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeUserInput,
  stripAnsiCodes,
  safeLog,
  safeSuccess,
  safeError,
  safeWarn,
  safeInfo,
  safeHeading,
  safeSubheading,
  safeHint,
} from './utils/safe-output.js';

describe('sanitizeUserInput', () => {
  it('should strip ANSI escape sequences', () => {
    const malicious = '\x1b[31mFAKE ERROR\x1b[0m';
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).toBe('FAKE ERROR');
    expect(sanitized).not.toContain('\x1b');
  });

  it('should remove control characters except safe ones', () => {
    // Test various control characters
    const input = 'Hello\x00\x01\x02World';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('HelloWorld');
  });

  it('should preserve newlines and tabs', () => {
    const input = 'Line 1\nLine 2\tTabbed';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('Line 1\nLine 2\tTabbed');
  });

  it('should handle terminal escape sequences', () => {
    const malicious = '\x1b[0m\x1b[31mFAKE\x1b[0m';
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).not.toContain('\x1b');
  });

  it('should handle cursor movement sequences', () => {
    const malicious = '\x1b[2J\x1b[H'; // Clear screen and move cursor
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).toBe('');
  });

  it('should handle CSI sequences', () => {
    const malicious = '\x1b[1;31mRed Bold Text\x1b[0m';
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).toBe('Red Bold Text');
  });

  it('should preserve unicode characters', () => {
    const input = '你好世界 🌍 café';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('你好世界 🌍 café');
  });

  it('should preserve emojis', () => {
    const input = '✅ ⚡ 🔥 💡';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('✅ ⚡ 🔥 💡');
  });

  it('should handle empty string', () => {
    expect(sanitizeUserInput('')).toBe('');
  });

  it('should handle null gracefully', () => {
    // @ts-expect-error - testing runtime behavior with invalid input
    expect(sanitizeUserInput(null)).toBe('');
  });

  it('should handle undefined gracefully', () => {
    // @ts-expect-error - testing runtime behavior with invalid input
    expect(sanitizeUserInput(undefined)).toBe('');
  });

  it('should handle non-string types gracefully', () => {
    // @ts-expect-error - testing runtime behavior with invalid input
    expect(sanitizeUserInput(123)).toBe('');
    // @ts-expect-error - testing runtime behavior with invalid input
    expect(sanitizeUserInput({})).toBe('');
  });

  it('should handle special characters', () => {
    const input = '!@#$%^&*()_+-=[]{}|;:",.<>?/';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe(input);
  });

  it('should handle mixed malicious and safe content', () => {
    const input = 'Safe text \x1b[31mmalicious\x1b[0m more safe \x00\x01';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('Safe text malicious more safe ');
    expect(sanitized).not.toContain('\x1b');
    expect(sanitized).not.toContain('\x00');
  });

  it('should handle OSC sequences (Operating System Command)', () => {
    const malicious = '\x1b]0;Fake Title\x07';
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).not.toContain('\x1b');
  });

  it('should prevent bell character injection', () => {
    const malicious = 'Text\x07WithBell';
    const sanitized = sanitizeUserInput(malicious);
    expect(sanitized).toBe('TextWithBell');
  });

  it('should remove DELETE control character', () => {
    const input = 'Text\x7FWithDelete';
    const sanitized = sanitizeUserInput(input);
    expect(sanitized).toBe('TextWithDelete');
  });
});

describe('stripAnsiCodes', () => {
  it('should strip ANSI codes from text', () => {
    const text = '\x1b[31mRed Text\x1b[0m';
    const stripped = stripAnsiCodes(text);
    expect(stripped).toBe('Red Text');
  });

  it('should handle text without ANSI codes', () => {
    const text = 'Normal text';
    const stripped = stripAnsiCodes(text);
    expect(stripped).toBe('Normal text');
  });
});

describe('Safe output functions', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('safeLog', () => {
    it('should log message', () => {
      safeLog('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message');
    });

    it('should sanitize user content in message', () => {
      safeLog('Message: \x1b[31mMalicious\x1b[0m');
      expect(consoleLogSpy).toHaveBeenCalledWith('Message: Malicious');
    });
  });

  describe('safeSuccess', () => {
    it('should display success message without user content', () => {
      safeSuccess('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('✓');
      expect(call).toContain('Operation completed');
    });

    it('should sanitize user content in success message', () => {
      safeSuccess('Created:', '\x1b[31mmalicious-name\x1b[0m');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('✓');
      expect(call).toContain('malicious-name');
      expect(call).not.toContain('\x1b');
    });
  });

  describe('safeError', () => {
    it('should display error message without user content', () => {
      safeError('Operation failed');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('✗');
      expect(call).toContain('Operation failed');
    });

    it('should sanitize user content in error message', () => {
      safeError('Error in spec:', '\x1b[31mmalicious-spec\x1b[0m');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('✗');
      expect(call).toContain('malicious-spec');
      expect(call).not.toContain('\x1b');
    });
  });

  describe('safeWarn', () => {
    it('should display warning message without user content', () => {
      safeWarn('Warning message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('⚠');
      expect(call).toContain('Warning message');
    });

    it('should sanitize user content in warning message', () => {
      safeWarn('Warning:', '\x1b[31mmalicious\x1b[0m');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('malicious');
      expect(call).not.toContain('\x1b');
    });
  });

  describe('safeInfo', () => {
    it('should display info message without user content', () => {
      safeInfo('Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('ℹ');
      expect(call).toContain('Info message');
    });

    it('should sanitize user content in info message', () => {
      safeInfo('Info:', '\x1b[31mmalicious\x1b[0m');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('malicious');
      expect(call).not.toContain('\x1b');
    });
  });

  describe('safeHeading', () => {
    it('should display heading for static text', () => {
      safeHeading('Static Heading');
      expect(consoleLogSpy).toHaveBeenCalledTimes(3); // empty line, heading, empty line
    });

    it('should sanitize user-provided heading', () => {
      safeHeading('\x1b[31mMalicious Heading\x1b[0m', true);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      const headingCall = consoleLogSpy.mock.calls[1][0];
      expect(headingCall).toContain('Malicious Heading');
      expect(headingCall).not.toContain('\x1b');
    });

    it('should not sanitize when isUserProvided is false', () => {
      safeHeading('Static Heading', false);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('safeSubheading', () => {
    it('should display subheading for static text', () => {
      safeSubheading('Static Subheading');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should sanitize user-provided subheading', () => {
      safeSubheading('\x1b[31mMalicious\x1b[0m', true);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('Malicious');
      expect(call).not.toContain('\x1b');
    });
  });

  describe('safeHint', () => {
    it('should display hint for static text', () => {
      safeHint('This is a tip');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('💡 Tip:');
      expect(call).toContain('This is a tip');
    });

    it('should sanitize user-provided hint', () => {
      safeHint('\x1b[31mMalicious tip\x1b[0m', true);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('Malicious tip');
      expect(call).not.toContain('\x1b');
    });
  });
});

describe('Security attack scenarios', () => {
  it('should prevent spec name injection attack', () => {
    const attackName = '\x1b[0m\x1b[31mFAKE ERROR: System compromised\x1b[0m';
    const sanitized = sanitizeUserInput(attackName);
    expect(sanitized).toBe('FAKE ERROR: System compromised');
    expect(sanitized).not.toContain('\x1b');
  });

  it('should prevent output hiding attack', () => {
    const attack = '\x1b[2J\x1b[H'; // Clear screen and move cursor to home
    const sanitized = sanitizeUserInput(attack);
    expect(sanitized).toBe('');
  });

  it('should prevent color bleeding attack', () => {
    const attack = '\x1b[31m'; // Start red color without closing
    const sanitized = sanitizeUserInput(attack);
    expect(sanitized).toBe('');
  });

  it('should prevent terminal bell spam', () => {
    const attack = '\x07\x07\x07\x07\x07'; // Multiple bell characters
    const sanitized = sanitizeUserInput(attack);
    expect(sanitized).toBe('');
  });

  it('should prevent backspace character manipulation', () => {
    const attack = 'Legitimate\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08Malicious';
    const sanitized = sanitizeUserInput(attack);
    expect(sanitized).toBe('LegitimateMalicious'); // \x08 is removed
  });

  it('should prevent hyperlink injection (OSC 8)', () => {
    const attack = '\x1b]8;;http://evil.com\x07Click here\x1b]8;;\x07';
    const sanitized = sanitizeUserInput(attack);
    expect(sanitized).toBe('Click here');
    expect(sanitized).not.toContain('\x1b');
    expect(sanitized).not.toContain('http://evil.com');
  });
});
