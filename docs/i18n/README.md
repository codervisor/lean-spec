# Internationalization (i18n) Documentation

## Overview

LeanSpec supports internationalization for both the Web App and CLI. Currently supported languages:
- English (en)
- Chinese (zh-CN)

## Web App i18n

### Technology Stack
- `react-i18next` for React components
- `i18next` core library
- `i18next-browser-languagedetector` for automatic language detection

### Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common'); // 'common' is the namespace
  
  return (
    <div>
      <h1>{t('navigation.home')}</h1>
      <p>{t('navigation.dashboard')}</p>
    </div>
  );
}
```

### Translation Files

Located in `packages/ui/src/locales/`:

```
locales/
├── en/
│   ├── common.json    # UI strings, navigation, actions
│   ├── errors.json    # Error messages
│   └── help.json      # Help text and tooltips
└── zh-CN/
    ├── common.json
    ├── errors.json
    └── help.json
```

### Language Switcher

The language switcher is available in the top navigation bar. It:
- Persists language preference to localStorage
- Detects browser language on first visit
- Provides instant language switching

### Adding New Translations

1. Add the key-value pair to the appropriate JSON file in `en/`
2. Add the corresponding Chinese translation to `zh-CN/`
3. Use the translation in your component with `t('your.key')`

Example:
```json
// en/common.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a new feature"
  }
}

// zh-CN/common.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是一个新功能"
  }
}
```

## CLI i18n

### Technology Stack
- `i18next` core library
- System locale detection

### Usage in CLI Commands

```typescript
import { t } from '@/lib/i18n/config';

// Use translations
console.log(t('commands.create.description'));
console.log(t('errors.specNotFound', { spec: '001' }));
```

### Translation Files

Located in `packages/cli/src/locales/`:

```
locales/
├── en/
│   ├── commands.json   # Command descriptions and help text
│   ├── errors.json     # Error messages
│   └── templates.json  # Template section names
└── zh-CN/
    ├── commands.json
    ├── errors.json
    └── templates.json
```

### Locale Detection

The CLI automatically detects the system locale from environment variables:
- `LANG`
- `LC_ALL`
- `LC_MESSAGES`

Falls back to English if no Chinese locale is detected.

### Adding New Translations

1. Add the key-value pair to the appropriate JSON file in `en/`
2. Add the corresponding Chinese translation to `zh-CN/`
3. Use the translation in your code with `t('your.key')`

## Translation Guidelines

### Terms to Keep in English

Following the terminology glossary in `docs-site/i18n/zh-Hans/TERMINOLOGY_GLOSSARY.md`:

- **Always keep in English:**
  - Spec
  - LeanSpec
  - CLI
  - Token
  - README
  - frontmatter
  - MCP
  - Status values: `planned`, `in-progress`, `complete`, `archived`
  - File extensions: `.md`, `.json`, `.yaml`

### Translation Quality

- Use professional, natural Chinese expressions
- Avoid literal word-by-word translation
- Keep technical terminology consistent
- Follow the established glossary

### Testing Translations

Run the i18n tests:

```bash
# Test Web App translations
cd packages/ui
pnpm test src/lib/i18n/config.test.ts

# Test CLI translations
cd packages/cli
pnpm test src/lib/i18n/config.test.ts
```

## Adding a New Language

1. Update i18n config files:
   - `packages/ui/src/lib/i18n/config.ts`
   - `packages/cli/src/lib/i18n/config.ts`

2. Create new locale directories:
   - `packages/ui/src/locales/[locale-code]/`
   - `packages/cli/src/locales/[locale-code]/`

3. Copy and translate all JSON files from `en/` to the new locale directory

4. Add the language to the language switcher in `packages/ui/src/components/language-switcher.tsx`

5. Add tests for the new language

## Implementation Status

### Completed
- ✅ i18n infrastructure for Web App
- ✅ i18n infrastructure for CLI
- ✅ Language switcher in Web App
- ✅ Locale detection for CLI
- ✅ Main sidebar navigation translated
- ✅ Basic translation files for common UI elements
- ✅ Tests for i18n functionality

### Future Work
- Extract more UI component strings
- Integrate CLI translations into command output
- Create Chinese template variants
- Add more comprehensive translations
- Native speaker review and quality improvements

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [LeanSpec Terminology Glossary](../../docs-site/i18n/zh-Hans/TERMINOLOGY_GLOSSARY.md)
- [Translation Style Guide](../../docs-site/i18n/zh-Hans/TRANSLATION_STYLE_GUIDE.md)
