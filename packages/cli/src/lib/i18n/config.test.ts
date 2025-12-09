import { describe, it, expect } from 'vitest';
import i18n from './config.js';

describe('CLI i18n configuration', () => {
  it('should have English and Chinese languages available', () => {
    const languages = Object.keys(i18n.options.resources || {});
    expect(languages).toContain('en');
    expect(languages).toContain('zh-CN');
  });

  it('should have commands namespace in English', () => {
    const commandsEn = i18n.getResourceBundle('en', 'commands');
    expect(commandsEn).toBeDefined();
    expect(commandsEn?.description).toBe('Manage LeanSpec documents');
  });

  it('should have commands namespace in Chinese', () => {
    const commandsZh = i18n.getResourceBundle('zh-CN', 'commands');
    expect(commandsZh).toBeDefined();
    expect(commandsZh?.description).toBe('管理 LeanSpec 文档');
  });

  it('should translate command descriptions to Chinese', () => {
    i18n.changeLanguage('zh-CN');
    const translated = i18n.t('commands.create.description', { ns: 'commands' });
    expect(translated).toBe('创建新的 Spec');
  });

  it('should translate command descriptions to English', () => {
    i18n.changeLanguage('en');
    const translated = i18n.t('commands.create.description', { ns: 'commands' });
    expect(translated).toBe('Create new spec');
  });

  it('should translate error messages to Chinese', () => {
    i18n.changeLanguage('zh-CN');
    const translated = i18n.t('noSpecsFound', { ns: 'errors' });
    expect(translated).toBe('未找到 Spec');
  });

  it('should keep "Spec" term in English in Chinese translations', () => {
    i18n.changeLanguage('zh-CN');
    // Verify that "Spec" is not translated in error messages
    const translated = i18n.t('specNotFound', { ns: 'errors', spec: '001' });
    expect(translated).toContain('Spec');
    expect(translated).toContain('001');
  });

  it('should translate template section names to Chinese', () => {
    i18n.changeLanguage('zh-CN');
    expect(i18n.t('overview', { ns: 'templates' })).toBe('概述');
    expect(i18n.t('design', { ns: 'templates' })).toBe('设计');
    expect(i18n.t('plan', { ns: 'templates' })).toBe('计划');
  });
});
