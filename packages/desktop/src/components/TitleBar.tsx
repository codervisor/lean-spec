import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import WindowControls from './WindowControls';
import styles from './title-bar.module.css';

const desktopWindow = WebviewWindow.getCurrent();

const TitleBar = () => {
  return (
    <header className={styles.titleBar} data-tauri-drag-region="true">
      <div className={styles.dragRegion} data-tauri-drag-region="true" />
      <div className={styles.rightSection}>
        <WindowControls />
      </div>
    </header>
  );
};

export default TitleBar;

