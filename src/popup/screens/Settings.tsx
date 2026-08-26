import React, { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../context/ToastContext';
import { exportData, importData, downloadExport, type ExportData } from '../../shared/services/export-service';
import { validatePin } from '../../shared/services/validation-service';
import { Button } from '../components/foundation/Button';
import { Spinner } from '../components/foundation/Spinner';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const [settings, updateSettings, isLoading] = useSettings();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      downloadExport(data);
      showToast('Settings exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export settings', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      const result = await importData(data);
      if (result.success) {
        showToast('Settings imported successfully', 'success');
      } else {
        showToast(`Import failed: ${result.errors[0]}`, 'error');
      }
    } catch (error) {
      showToast('Invalid import file', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStrictMode = (enabled: boolean) => {
    updateSettings({ ...settings, strictMode: enabled });
  };

  const handleTabBudgetChange = (value: number) => {
    updateSettings({ ...settings, tabBudget: value });
  };

  const handlePinChange = (value: string) => {
    setPinInput(value);
    setPinError('');
  };

  const handleSavePin = () => {
    if (!pinInput) {
      updateSettings({ ...settings, pin: null });
      showToast('PIN cleared', 'success');
      setPinInput('');
      return;
    }

    if (!validatePin(pinInput)) {
      setPinError('PIN must be 4-6 digits');
      return;
    }

    updateSettings({ ...settings, pin: pinInput });
    showToast('PIN saved', 'success');
    setPinInput('');
    setPinError('');
  };

  const handleClearPin = () => {
    updateSettings({ ...settings, pin: null });
    showToast('PIN cleared', 'success');
    setPinInput('');
    setPinError('');
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Security</h3>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>PIN Protection</span>
          <span className={styles.fieldHint}>
            {settings.pin ? 'PIN is set' : 'No PIN set'}
          </span>
        </div>

        <div className={styles.pinGroup}>
          <input
            type="password"
            placeholder={settings.pin ? '••••' : 'Enter 4-6 digit PIN'}
            value={pinInput}
            onChange={(e) => handlePinChange(e.target.value)}
            className={styles.pinInput}
            maxLength={6}
          />
          <Button onClick={handleSavePin} disabled={!pinInput && !settings.pin}>
            {pinInput ? 'Save' : 'Clear'}
          </Button>
        </div>

        {pinError && <span className={styles.errorText}>{pinError}</span>}

        {settings.pin && (
          <Button variant="ghost" onClick={handleClearPin} className={styles.clearPinBtn}>
            Remove PIN
          </Button>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Enforcement</h3>

        <label className={styles.toggle}>
          <span className={styles.toggleLabel}>Strict Mode</span>
          <input
            type="checkbox"
            checked={settings.strictMode}
            onChange={(e) => handleStrictMode(e.target.checked)}
          />
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tab Budget</span>
          <input
            type="number"
            min={1}
            max={50}
            value={settings.tabBudget}
            onChange={(e) => handleTabBudgetChange(Number(e.target.value))}
            className={styles.numberInput}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Data</h3>

        <div className={styles.buttonGroup}>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Spinner size="sm" /> : 'Export'}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Spinner size="sm" /> : 'Import'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className={styles.hiddenInput}
          />
        </div>
      </section>
    </div>
  );
};
