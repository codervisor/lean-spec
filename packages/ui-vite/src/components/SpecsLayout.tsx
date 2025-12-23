import { Outlet } from 'react-router-dom';
import { SpecsNavSidebar } from './SpecsNavSidebar';

export function SpecsLayout() {
  return (
    <div className="flex h-full">
      <SpecsNavSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-3.5rem)]">
        <Outlet />
      </div>
    </div>
  );
}
