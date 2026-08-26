import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Dashboard } from './screens/Dashboard';
import { Sites } from './screens/Sites';
import { Settings } from './screens/Settings';
import { BottomNavigation } from './components/layout/BottomNavigation/BottomNavigation';
import { Header } from './components/layout/Header';
import { useConstraints } from './hooks/useConstraints';
import styles from './App.module.css';

type Screen = 'dashboard' | 'sites' | 'settings';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [constraints] = useConstraints();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'sites':
        return <Sites />;
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <ToastProvider>
      <div className={styles.app}>
        <Header active={constraints.length > 0} />
        <main className={styles.main}>
          <div key={activeScreen} className={styles.screenTransition}>
            {renderScreen()}
          </div>
        </main>
        <BottomNavigation active={activeScreen} onChange={setActiveScreen} />
      </div>
    </ToastProvider>
  );
};
