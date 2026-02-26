import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SessionsNavSidebar } from './sessions-nav-sidebar';

export function SessionDetailLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full relative">
      <SessionsNavSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <Outlet context={{ mobileOpen, setMobileOpen }} />
    </div>
  );
}
