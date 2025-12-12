import { useEffect, useState } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Minus, Square, Copy, X } from 'lucide-react';
import styles from './window-controls.module.css';

const desktopWindow = WebviewWindow.getCurrent();

const WindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    desktopWindow.isMaximized().then(setIsMaximized).catch(console.error);

    // Listen for window resize events to update maximized state
    const unlisten = desktopWindow.onResized(() => {
      desktopWindow.isMaximized().then(setIsMaximized).catch(console.error);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(console.error);
    };
  }, []);

  const handleMaximize = () => {
    desktopWindow.toggleMaximize().catch(console.error);
  };

  return (
    <div className={styles.controls}>
      <button className={styles.controlButton} onClick={() => desktopWindow.minimize()} title="Minimize">
        <Minus size={12} />
      </button>
      <button className={styles.controlButton} onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
        {isMaximized ? <Copy size={10} className={styles.restoreButton} /> : <Square size={12} />}
      </button>
      <button className={styles.closeButton} onClick={() => desktopWindow.close()} title="Close">
        <X size={12} />
      </button>
    </div>
  );
};

export default WindowControls;
