import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SpecsNavSidebar } from './SpecsNavSidebar';

export function SpecDetailLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full relative">
      <SpecsNavSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <Outlet context={{ mobileOpen, setMobileOpen }} />
    </div>
  );
}
