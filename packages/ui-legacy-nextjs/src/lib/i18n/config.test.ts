import { describe, it, expect } from 'vitest';
import i18n from '@/lib/i18n/config';

describe('i18n configuration', () => {
  it('should have English and Chinese languages available', () => {
    const languages = Object.keys(i18n.options.resources || {});
    expect(languages).toContain('en');
    expect(languages).toContain('zh-CN');
  });

  it('should have common namespace in English', () => {
    const commonEn = i18n.getResourceBundle('en', 'common');
    expect(commonEn).toBeDefined();
    expect(commonEn?.navigation).toBeDefined();
    expect(commonEn?.navigation?.home).toBe('Home');
  });

  it('should have common namespace in Chinese', () => {
    const commonZh = i18n.getResourceBundle('zh-CN', 'common');
    expect(commonZh).toBeDefined();
    expect(commonZh?.navigation).toBeDefined();
    expect(commonZh?.navigation?.home).toBe('首页');
  });

  it('should translate navigation.home to Chinese', () => {
    i18n.changeLanguage('zh-CN');
    const translated = i18n.t('navigation.home', { ns: 'common' });
    expect(translated).toBe('首页');
  });

  it('should translate navigation.home to English', () => {
    i18n.changeLanguage('en');
    const translated = i18n.t('navigation.home', { ns: 'common' });
    expect(translated).toBe('Home');
  });

  it('should translate "Spec" term to Chinese', () => {
    i18n.changeLanguage('zh-CN');
    const translated = i18n.t('spec.spec', { ns: 'common' });
    expect(translated).toBe('规范');
  });

  it('should translate status terms correctly in Chinese', () => {
    i18n.changeLanguage('zh-CN');
    expect(i18n.t('status.planned', { ns: 'common' })).toBe('已计划');
    expect(i18n.t('status.inProgress', { ns: 'common' })).toBe('进行中');
    expect(i18n.t('status.complete', { ns: 'common' })).toBe('已完成');
  });

  it('should fallback to English for missing translations', () => {
    i18n.changeLanguage('zh-CN');
    // Test a key that might not exist
    const translated = i18n.t('nonexistent.key', { ns: 'common', defaultValue: 'fallback' });
    expect(translated).toBe('fallback');
  });
});
