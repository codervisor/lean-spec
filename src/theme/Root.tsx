import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';

interface Props {
  children: ReactNode;
}

export default function Root({ children }: Props): ReactNode {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
