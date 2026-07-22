import React, { useState } from 'react';
import { Dashboard } from './screens/Dashboard';
import { Sites } from './screens/Sites';
import { Settings } from './screens/Settings';
import { BottomNavigation } from './components/layout/BottomNavigation/BottomNavigation';
import styles from './App.module.css';

type Screen = 'dashboard' | 'sites' | 'settings';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

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
    <div className={styles.app}>
      <main className={styles.main}>
        {renderScreen()}
      </main>
      <BottomNavigation active={activeScreen} onChange={setActiveScreen} />
    </div>
  );
};
