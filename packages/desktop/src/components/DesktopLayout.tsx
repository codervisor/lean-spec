import type { ReactNode } from 'react';
import styles from './desktop-layout.module.css';

interface DesktopLayoutProps {
  children: ReactNode;
}

const DesktopLayout = ({ children }: DesktopLayoutProps) => (
  <div className={styles.desktop}>
    <div className={styles.content}>{children}</div>
  </div>
);

export default DesktopLayout;
