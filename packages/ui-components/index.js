import * as ui from '@leanspec/ui';

const warningKey = '__leanspecUiComponentsDeprecated';
if (typeof globalThis !== 'undefined' && !globalThis[warningKey]) {
  globalThis[warningKey] = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[DEPRECATED] @leanspec/ui-components has been consolidated into @leanspec/ui. ' +
      'Please update imports to @leanspec/ui.'
  );
}

export * from '@leanspec/ui';
export default ui;
