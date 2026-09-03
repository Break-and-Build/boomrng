import React, { useCallback, useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Dashboard } from './screens/Dashboard';
import { Sites } from './screens/Sites';
import { Settings } from './screens/Settings';
import { ConstraintFormScreen } from './screens/ConstraintFormScreen';
import { BottomNavigation } from './components/layout/BottomNavigation/BottomNavigation';
import { Header } from './components/layout/Header';
import { FocusedHeader } from './components/layout/FocusedHeader';
import { useConstraints } from './hooks/useConstraints';
import type { Constraint } from '../shared/types/constraint';
import styles from './App.module.css';

type Screen = 'dashboard' | 'sites' | 'settings';

// A focused sub-flow (Add/Edit Constraint, and later Presets) temporarily
// replaces the persistent header + bottom nav with a single-purpose screen
// — BOOMRNG-V2-DESIGN-SPEC.md §8, §11, §29.
type FocusedFlow = { type: 'add' } | { type: 'edit'; constraint: Constraint };

// Sites fully unmounts while a focused flow is active, so focus can't be
// restored via a surviving DOM ref on return — it's carried back as data.
// Also carries one-shot navigation intents into Sites from elsewhere in the
// shell (Dashboard's row tap) that must run through Sites' own authorization
// gate rather than opening Edit directly — see `edit-request` below.
export type SitesNavigationIntent =
  | { type: 'add' }
  | { type: 'edit'; id: string }
  | { type: 'edit-request'; id: string };

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [constraints] = useConstraints();
  const [focusedFlow, setFocusedFlow] = useState<FocusedFlow | null>(null);
  const [sitesFocusHint, setSitesFocusHint] = useState<SitesNavigationIntent | null>(null);
  // Session-scoped only (BOOMRNG-V2-DESIGN-SPEC.md §26) — lives here, not in
  // Sites, because Sites unmounts across the Add/Edit focused flow and would
  // otherwise lose it. Never persisted to chrome.storage; a fresh popup open
  // always starts locked.
  const [privateUnlocked, setPrivateUnlocked] = useState(false);

  const handleAddConstraint = useCallback(() => {
    setFocusedFlow({ type: 'add' });
  }, []);

  const handleEditConstraint = useCallback((constraint: Constraint) => {
    setFocusedFlow({ type: 'edit', constraint });
  }, []);

  const handleBackFromFocusedFlow = useCallback(() => {
    setFocusedFlow((current) => {
      if (!current) return null;
      setSitesFocusHint(
        current.type === 'add' ? { type: 'add' } : { type: 'edit', id: current.constraint.id }
      );
      return null;
    });
  }, []);

  const handleNavigateToSettingsFromFlow = useCallback(() => {
    setFocusedFlow(null);
    setActiveScreen('settings');
  }, []);

  // Dashboard shows public constraints only, but a public constraint can
  // still be `pin-required` — so this must not open Edit directly (that
  // would bypass Sites' own PIN gate for that behavior, §14). Handing off
  // to Sites as a navigation intent lets Sites' existing `handleEditClick`
  // run its full authorization check exactly as it does for its own rows.
  const handleOpenEditFromDashboard = useCallback((id: string) => {
    setActiveScreen('sites');
    setSitesFocusHint({ type: 'edit-request', id });
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveScreen} onOpenEdit={handleOpenEditFromDashboard} />;
      case 'sites':
        return (
          <Sites
            onAddConstraint={handleAddConstraint}
            onEditConstraint={handleEditConstraint}
            onNavigateToSettings={() => setActiveScreen('settings')}
            focusHint={sitesFocusHint}
            onFocusHintConsumed={() => setSitesFocusHint(null)}
            privateUnlocked={privateUnlocked}
            onUnlockPrivate={() => setPrivateUnlocked(true)}
            onLockPrivate={() => setPrivateUnlocked(false)}
          />
        );
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <ToastProvider>
      <div className={styles.app}>
        {focusedFlow ? (
          <FocusedHeader
            title={focusedFlow.type === 'add' ? 'Add constraint' : 'Edit constraint'}
            onBack={handleBackFromFocusedFlow}
          />
        ) : (
          <Header active={constraints.length > 0} count={constraints.length} />
        )}
        <main className={styles.main}>
          <div
            key={focusedFlow ? `focused-${focusedFlow.type}` : activeScreen}
            className={styles.screenTransition}
          >
            {focusedFlow ? (
              <ConstraintFormScreen
                mode={focusedFlow.type}
                constraint={focusedFlow.type === 'edit' ? focusedFlow.constraint : null}
                onBack={handleBackFromFocusedFlow}
                onNavigateToSettings={handleNavigateToSettingsFromFlow}
              />
            ) : (
              renderScreen()
            )}
          </div>
        </main>
        {!focusedFlow && <BottomNavigation active={activeScreen} onChange={setActiveScreen} />}
      </div>
    </ToastProvider>
  );
};
