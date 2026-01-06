import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { SpecsNavSidebar } from './SpecsNavSidebar';

export function SpecsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation('common');

  return (
    <div className="flex h-full relative">
      <SpecsNavSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div id="spec-detail-main" className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-3.5rem)]">
        <div className="lg:hidden sticky top-14 z-20 flex items-center justify-between bg-background/95 backdrop-blur border-b px-3 py-2 mb-4">
          <span className="text-sm font-semibold">{t('specsNavSidebar.title')}</span>
          <Button size="sm" variant="outline" onClick={() => setMobileOpen(true)}>
            {t('actions.openSidebar')}
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
