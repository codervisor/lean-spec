import { appWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import styles from './window-controls.module.css';

const WindowControls = () => (
  <div className={styles.controls}>
    <button className={styles.controlButton} onClick={() => appWindow.minimize()} title="Minimize">
      <Minus size={12} />
    </button>
    <button className={styles.controlButton} onClick={() => appWindow.toggleMaximize()} title="Toggle maximize">
      <Square size={12} />
    </button>
    <button className={styles.closeButton} onClick={() => appWindow.close()} title="Close">
      <X size={12} />
    </button>
  </div>
);

export default WindowControls;
