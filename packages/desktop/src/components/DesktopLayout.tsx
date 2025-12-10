import type { ReactNode } from 'react';
import styles from './desktop-layout.module.css';

interface DesktopLayoutProps {
  header: ReactNode;
  children: ReactNode;
}

const DesktopLayout = ({ header, children }: DesktopLayoutProps) => (
  <div className={styles.desktop}>
    {header}
    <main className={styles.content}>{children}</main>
  </div>
);

export default DesktopLayout;
