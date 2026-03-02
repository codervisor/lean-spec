import { SpecsNavSidebar as SpecsNavSidebarLegacy } from './specs-nav-sidebar.legacy';

export function SpecsNavSidebar(props: Parameters<typeof SpecsNavSidebarLegacy>[0]) {
  return <SpecsNavSidebarLegacy {...props} />;
}
