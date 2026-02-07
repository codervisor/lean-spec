import { useOutletContext } from 'react-router-dom';

export type SpecDetailLayoutContext = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

export function useSpecDetailLayoutContext() {
  return useOutletContext<SpecDetailLayoutContext>();
}
