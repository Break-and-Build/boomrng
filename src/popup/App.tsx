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
export type SitesFocusHint = { type: 'add' } | { type: 'edit'; id: string };

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [constraints] = useConstraints();
  const [focusedFlow, setFocusedFlow] = useState<FocusedFlow | null>(null);
  const [sitesFocusHint, setSitesFocusHint] = useState<SitesFocusHint | null>(null);

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

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveScreen} />;
      case 'sites':
        return (
          <Sites
            onAddConstraint={handleAddConstraint}
            onEditConstraint={handleEditConstraint}
            focusHint={sitesFocusHint}
            onFocusHintConsumed={() => setSitesFocusHint(null)}
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
          <Header active={constraints.length > 0} />
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
