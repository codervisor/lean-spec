import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { emit } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import styles from './desktop-menu.module.css';

interface DesktopMenuProps {
  onAddProject: () => void;
  onRefresh: () => void;
}

interface MenuItemConfig {
  label: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
}

const DesktopMenu = ({ onAddProject, onRefresh }: DesktopMenuProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);



  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const emitMenuAction = (action: string) => {
    emit(action).catch(console.error);
    closeMenu();
  };

  const menus: Record<string, MenuItemConfig[]> = {
    File: [
      { label: 'New Spec...', shortcut: '⌘N', action: () => emitMenuAction('desktop://menu-new-spec') },
      { label: 'Open Project...', shortcut: '⌘O', action: () => { onAddProject(); closeMenu(); } },
      { label: 'Switch Project...', shortcut: '⌘⇧K', action: () => emitMenuAction('desktop://menu-switch-project') },
      { separator: true, label: '', action: () => {} },
      { label: 'Close Window', shortcut: '⌘W', action: () => { closeMenu(); } },
      { label: 'Quit', shortcut: '⌘Q', action: () => { closeMenu(); } },
    ],
    Edit: [
      { label: 'Cut', shortcut: '⌘X', action: () => { closeMenu(); } },
      { label: 'Copy', shortcut: '⌘C', action: () => { closeMenu(); } },
      { label: 'Paste', shortcut: '⌘V', action: () => { closeMenu(); } },
      { separator: true, label: '', action: () => {} },
      { label: 'Find in Specs...', shortcut: '⌘F', action: () => emitMenuAction('desktop://menu-find') },
    ],
    View: [
      { label: 'Refresh Projects', shortcut: '⌘R', action: () => { onRefresh(); closeMenu(); } },
      { separator: true, label: '', action: () => {} },
      { label: 'Toggle Sidebar', shortcut: '⌘B', action: () => emitMenuAction('desktop://menu-toggle-sidebar') },
      { separator: true, label: '', action: () => {} },
      { label: 'Toggle Fullscreen', action: () => { closeMenu(); } },
    ],
    Help: [
      { label: 'Documentation', action: () => { openUrl('https://lean-spec.dev/docs').catch(console.error); closeMenu(); } },
      { label: 'Keyboard Shortcuts', action: () => emitMenuAction('desktop://menu-shortcuts') },
      { separator: true, label: '', action: () => {} },
      { label: 'Check for Updates', action: () => emitMenuAction('desktop://menu-updates') },
      { label: 'View Logs', action: () => emitMenuAction('desktop://menu-logs') },
      { label: 'About LeanSpec', action: () => emitMenuAction('desktop://menu-about') },
    ],
  };

  return (
    <>
      {activeMenu && createPortal(
        <div 
          className={styles.backdrop} 
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveMenu(null);
          }}
          data-tauri-drag-region="false"
        />,
        document.body
      )}
      <div ref={menuRef} className={styles.desktopMenu} data-tauri-drag-region="false">
      {Object.entries(menus).map(([menuName, items]) => (
        <div key={menuName} className={styles.menuContainer}>
          <button
            className={`${styles.menuButton} ${activeMenu === menuName ? styles.active : ''}`}
            onClick={() => toggleMenu(menuName)}
          >
            {menuName}
          </button>
          {activeMenu === menuName && (
            <div className={styles.menuDropdown}>
              {items.map((item, index) =>
                item.separator ? (
                  <div key={`separator-${index}`} className={styles.separator} />
                ) : (
                  <button
                    key={item.label}
                    className={styles.menuItem}
                    onClick={item.action}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
      </div>
    </>
  );
};

export default DesktopMenu;
