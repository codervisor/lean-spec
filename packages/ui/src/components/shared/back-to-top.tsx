import { BackToTop as UIBackToTop } from '@leanspec/ui-components';

export function BackToTop() {
  return (
    <UIBackToTop
      threshold={300}
      bottom={24}
      right={24}
      className="shadow-lg"
    />
  );
}
