import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Minus, Square, X } from 'lucide-react';
import styles from './window-controls.module.css';

const desktopWindow = WebviewWindow.getCurrent();

const WindowControls = () => (
  <div className={styles.controls}>
    <button className={styles.controlButton} onClick={() => desktopWindow.minimize()} title="Minimize">
      <Minus size={12} />
    </button>
    <button className={styles.controlButton} onClick={() => desktopWindow.toggleMaximize()} title="Toggle maximize">
      <Square size={12} />
    </button>
    <button className={styles.closeButton} onClick={() => desktopWindow.close()} title="Close">
      <X size={12} />
    </button>
  </div>
);

export default WindowControls;
