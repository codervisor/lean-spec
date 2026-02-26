import { useOutletContext } from 'react-router-dom';

export type SessionDetailLayoutContext = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

export function useSessionDetailLayoutContext() {
  return useOutletContext<SessionDetailLayoutContext>();
}
