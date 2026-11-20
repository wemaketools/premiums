/**
 * AppShell: sidebar + main column (top bar, page content). Rendered for every signed-in route (RouteGuard).
 * Pages portal their title into the top bar through the page slots. Below 768px the sidebar is a drawer: closed, it
 * is hidden from focus and assistive technology (CSS visibility); opening it moves focus to the first nav link;
 * Escape or the scrim closes it and returns focus to the menu button. Between 768 and 1279px the sidebar is an icon
 * rail with a toggle for the full sidebar, remembered per browser; the full sidebar pushes the content.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet } from 'react-router';

import { destinationsOf, features } from '../../app/featureRegistry';
import type { FeatureModule } from '../../app/featureRegistry';
import { t } from '../../lib/i18n';
import { readStoredSidebarExpanded, storeSidebarExpanded } from '../../lib/storage';
import { DRAWER_QUERY, RAIL_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { MAIN_REGION_ID } from '../ui/focusReturn';
import { PageSlotsContext } from '../ui/pageSlots';
import type { PageSlots } from '../ui/pageSlots';
import { PrototypeBanner } from './PrototypeBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const SIDEBAR_ID = 'prm-sidebar';

export function AppShell({ modules = features }: { readonly modules?: readonly FeatureModule[] }) {
  const drawerMode = useMediaQuery(DRAWER_QUERY);
  const railMode = useMediaQuery(RAIL_QUERY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(readStoredSidebarExpanded);
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const open = drawerMode && drawerOpen;
  const expanded = railMode && sidebarExpanded;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    document.getElementById(SIDEBAR_ID)?.querySelector<HTMLElement>('a[href]')?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setDrawerOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const destinations = useMemo(() => destinationsOf(modules), [modules]);
  const slots = useMemo<PageSlots>(() => ({ title: titleSlot }), [titleSlot]);

  const classes = ['prm-app'];
  if (drawerMode) classes.push('prm-app--drawer');
  if (open) classes.push('prm-app--drawer-open');
  if (expanded) classes.push('prm-app--sidebar-expanded');

  const toggleSidebarWidth = (): void => {
    storeSidebarExpanded(!sidebarExpanded);
    setSidebarExpanded(!sidebarExpanded);
  };
  const closeToMenuButton = (): void => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };
  const closeAfterNavigation = (): void => {
    setDrawerOpen(false);
    document.getElementById(MAIN_REGION_ID)?.focus();
  };

  return (
    <PageSlotsContext.Provider value={slots}>
      <div className={classes.join(' ')}>
        <a className="prm-skip-link" href={`#${MAIN_REGION_ID}`}>
          {t('shell.skipToContent')}
        </a>
        <Sidebar
          id={SIDEBAR_ID}
          modules={modules}
          onNavigate={drawerMode ? closeAfterNavigation : undefined}
          widthToggle={railMode ? { expanded, onToggle: toggleSidebarWidth } : undefined}
        />
        {open && (
          <div className="prm-drawer-scrim" aria-hidden="true" onClick={closeToMenuButton} />
        )}
        <div className="prm-main">
          <PrototypeBanner />
          <Topbar
            titleRef={setTitleSlot}
            onOpenMenu={() => setDrawerOpen((current) => !current)}
            menuOpen={open}
            menuButtonRef={menuButtonRef}
            sidebarId={SIDEBAR_ID}
            destinations={destinations}
          />
          <main className="prm-content" id={MAIN_REGION_ID} tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </PageSlotsContext.Provider>
  );
}
