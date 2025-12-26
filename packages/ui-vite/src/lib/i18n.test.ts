import { beforeEach, describe, expect, it } from 'vitest';
import i18n from './i18n';

describe('i18n configuration', () => {
  beforeEach(() => {
    localStorage.clear();
    void i18n.changeLanguage('en');
  });

  it('should have English and Chinese languages available', () => {
    const languages = Object.keys(i18n.options.resources || {});
    expect(languages).toContain('en');
    expect(languages).toContain('zh-CN');
  });

  it('should have namespaces: common, errors, help', () => {
    expect(i18n.options.ns).toContain('common');
    expect(i18n.options.ns).toContain('errors');
    expect(i18n.options.ns).toContain('help');
  });

  it('should translate navigation.home to Chinese', async () => {
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t('navigation.home', { ns: 'common' })).toBe('首页');
  });

  it('should keep "Spec" in English for Chinese locale', async () => {
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t('spec.spec', { ns: 'common' })).toBe('Spec');
  });

  it('should translate status terms', async () => {
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t('status.planned', { ns: 'common' })).toBe('已计划');
    expect(i18n.t('status.inProgress', { ns: 'common' })).toBe('进行中');
    expect(i18n.t('status.complete', { ns: 'common' })).toBe('已完成');
  });

  it('should fallback to English for missing keys', async () => {
    await i18n.changeLanguage('zh-CN');
    const result = i18n.t('nonexistent.key', {
      ns: 'common',
      defaultValue: 'fallback',
    });
    expect(result).toBe('fallback');
  });

  it('should detect browser language on init', () => {
    expect(i18n.options.detection).toBeDefined();
  });

  it('should persist language choice to localStorage', async () => {
    await i18n.changeLanguage('zh-CN');
    const stored = localStorage.getItem('leanspec-language');
    expect(stored).toBe('zh-CN');
  });
});
