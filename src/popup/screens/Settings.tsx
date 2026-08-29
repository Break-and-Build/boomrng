import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useConstraints } from '../hooks/useConstraints';
import { useToast } from '../context/ToastContext';
import { exportData, importData, downloadExport, type ExportData } from '../../shared/services/export-service';
import { validatePin } from '../../shared/services/validation-service';
import { isPinProtected, resetPinAndDeleteProtectedConstraints } from '../../shared/services/pin-recovery-service';
import { pluralize } from '../../shared/utils';
import { Button } from '../components/foundation/Button';
import { Input } from '../components/foundation/Input';
import { Spinner } from '../components/foundation/Spinner';
import { Modal } from '../components/foundation/Modal';
import { PinEntryForm } from '../components/constraints/PinEntryForm';
import { ForgotPinDialog } from '../components/constraints/ForgotPinDialog';
import styles from './Settings.module.css';

type PinPanelMode = 'view' | 'change' | 'clear';

export const Settings: React.FC = () => {
  const [settings, updateSettings, settingsLoading] = useSettings();
  const [constraints, , constraintsLoading] = useConstraints();
  const { showToast } = useToast();

  // Set PIN (no PIN currently configured)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setPinError, setSetPinError] = useState<string | null>(null);

  // Change / Clear PIN (a PIN already exists) — mutually exclusive panels
  const [pinPanelMode, setPinPanelMode] = useState<PinPanelMode>('view');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeConfirmPin, setChangeConfirmPin] = useState('');
  const [pinPanelError, setPinPanelError] = useState<string | null>(null);

  // Local draft mirrors settings.tabBudget so the stepper's own functional
  // updater sees the latest value on rapid clicks — updateSettings() isn't
  // a real setState, so computing straight from the `settings` closure
  // would silently drop clicks that land before storage round-trips.
  const [tabBudgetDraft, setTabBudgetDraft] = useState(settings.tabBudget);
  useEffect(() => {
    setTabBudgetDraft(settings.tabBudget);
  }, [settings.tabBudget]);

  // Data section
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [includePrivateExport, setIncludePrivateExport] = useState(false);
  const [exportPinPromptOpen, setExportPinPromptOpen] = useState(false);
  const [exportPinInput, setExportPinInput] = useState('');
  const [exportPinError, setExportPinError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Forgot-PIN recovery — deliberately its own state machine, separate from
  // every PIN-verification flow above. It never checks the PIN and never
  // authorizes Change/Clear/Export; a confirmed reset only clears the PIN
  // and deletes protected constraints (BOOMRNG-V2-DESIGN-SPEC.md §14).
  const [forgotPinOpen, setForgotPinOpen] = useState(false);

  const pinConfigured = Boolean(settings.pin);
  // A constraint that is both private and PIN-Required counts once, not
  // twice — the invariant is "does anything depend on this PIN at all"
  // (BOOMRNG-V2-DESIGN-SPEC.md §14), not a tally of individual reasons.
  const pinDependentCount = constraints.filter(isPinProtected).length;
  const hasPrivateConstraints = constraints.some((c) => c.isPrivate);

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePin(newPin)) {
      setSetPinError('PIN must be 4-6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setSetPinError("PINs don't match");
      return;
    }
    updateSettings({ ...settings, pin: newPin });
    showToast('PIN protection is on', 'success');
    setNewPin('');
    setConfirmPin('');
    setSetPinError(null);
  };

  const handleStartChange = () => {
    setPinPanelMode('change');
    setCurrentPinInput('');
    setChangeNewPin('');
    setChangeConfirmPin('');
    setPinPanelError(null);
  };

  const handleStartClear = () => {
    if (pinDependentCount > 0) return;
    setPinPanelMode('clear');
    setCurrentPinInput('');
    setPinPanelError(null);
  };

  const handleCancelPinPanel = () => {
    setPinPanelMode('view');
    setCurrentPinInput('');
    setChangeNewPin('');
    setChangeConfirmPin('');
    setPinPanelError(null);
  };

  const handleSubmitChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinInput !== settings.pin) {
      setPinPanelError('Incorrect PIN. Try again.');
      setCurrentPinInput('');
      return;
    }
    if (!validatePin(changeNewPin)) {
      setPinPanelError('PIN must be 4-6 digits');
      return;
    }
    if (changeNewPin !== changeConfirmPin) {
      setPinPanelError("PINs don't match");
      return;
    }
    updateSettings({ ...settings, pin: changeNewPin });
    showToast('PIN changed', 'success');
    handleCancelPinPanel();
  };

  const handleSubmitClear = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinDependentCount > 0) return;
    if (currentPinInput !== settings.pin) {
      setPinPanelError('Incorrect PIN. Try again.');
      setCurrentPinInput('');
      return;
    }
    updateSettings({ ...settings, pin: null });
    showToast('PIN cleared', 'success');
    handleCancelPinPanel();
  };

  const handleOpenForgotPin = () => {
    setForgotPinOpen(true);
  };

  const handleCancelForgotPin = () => {
    setForgotPinOpen(false);
  };

  // Recovery, not verification: never checks the PIN, never authorizes
  // Change/Clear/Export, and never leaves protected constraints reachable
  // — it deletes them along with the PIN itself. See pin-recovery-service.ts.
  const handleConfirmForgotPin = async () => {
    const { deletedCount } = await resetPinAndDeleteProtectedConstraints();
    setForgotPinOpen(false);
    handleCancelPinPanel();
    handleCancelExportPin();
    setIncludePrivateExport(false);
    showToast(
      deletedCount > 0 ? `PIN reset. ${pluralize(deletedCount, 'constraint')} removed.` : 'PIN reset.',
      'success'
    );
  };

  const handleTabBudgetStep = (delta: number) => {
    setTabBudgetDraft((prev) => {
      const next = Math.max(0, prev + delta);
      updateSettings({ ...settings, tabBudget: next });
      return next;
    });
  };

  const performExport = async (includePrivate: boolean) => {
    setIsExporting(true);
    try {
      const data = await exportData(includePrivate);
      downloadExport(data);
      showToast(includePrivate ? 'Exported with private constraints' : 'Settings exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export settings', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClick = () => {
    if (includePrivateExport && pinConfigured) {
      setExportPinPromptOpen(true);
      setExportPinInput('');
      setExportPinError(null);
      return;
    }
    performExport(false);
  };

  const handleSubmitExportPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (exportPinInput !== settings.pin) {
      setExportPinError('Incorrect PIN. Try again.');
      setExportPinInput('');
      return;
    }
    setExportPinPromptOpen(false);
    setExportPinInput('');
    setExportPinError(null);
    performExport(true);
  };

  const handleCancelExportPin = () => {
    setExportPinPromptOpen(false);
    setExportPinInput('');
    setExportPinError(null);
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
        if (result.pinDependentCount) {
          showToast(
            `Imported. ${pluralize(result.pinDependentCount, 'constraint')} need a PIN — set one above to manage them.`,
            'success',
            5000
          );
        } else {
          showToast('Settings imported successfully', 'success');
        }
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

  if (settingsLoading || constraintsLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  const setPinDisabled = !(validatePin(newPin) && newPin === confirmPin);
  const changePinDisabled = !(currentPinInput.length > 0 && validatePin(changeNewPin) && changeNewPin === changeConfirmPin);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>PIN</h3>
        <p className={styles.hint}>
          {pinConfigured
            ? 'Your PIN protects PIN-required sites, unlocks private constraints, and stops someone else from clearing your constraints.'
            : 'Protects PIN-required sites, and stops someone else from clearing your constraints.'}
        </p>

        {!pinConfigured ? (
          <form onSubmit={handleSetPin} className={styles.form}>
            <div className={styles.compactPinFields}>
              <Input
                label="New PIN"
                type="password"
                revealable
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <Input
                label="Confirm PIN"
                type="password"
                revealable
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                error={setPinError ?? undefined}
              />
            </div>
            <Button type="submit" disabled={setPinDisabled}>
              Save
            </Button>
          </form>
        ) : pinPanelMode === 'view' ? (
          <>
            <div className={styles.statusRow}>
              <span className={styles.statusOn}>{pinDependentCount > 0 ? 'Protection is on' : 'PIN is set'}</span>
            </div>
            <div className={styles.pinDots} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className={styles.buttonRow}>
              <Button variant="secondary" onClick={handleStartChange}>
                Change PIN
              </Button>
              <Button
                variant="secondary"
                className={styles.destructiveSecondary}
                onClick={handleStartClear}
                disabled={pinDependentCount > 0}
              >
                Clear PIN
              </Button>
            </div>
            {pinDependentCount > 0 && (
              <p className={styles.hint}>
                Your PIN protects {pluralize(pinDependentCount, 'constraint')}. Remove them before clearing your PIN.
              </p>
            )}
          </>
        ) : pinPanelMode === 'change' ? (
          <form onSubmit={handleSubmitChange} className={styles.form}>
            <Input
              label="Current PIN"
              type="password"
              revealable
              inputMode="numeric"
              maxLength={6}
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value)}
            />
            <Input
              label="New PIN"
              type="password"
              revealable
              inputMode="numeric"
              maxLength={6}
              value={changeNewPin}
              onChange={(e) => setChangeNewPin(e.target.value)}
            />
            <Input
              label="Confirm PIN"
              type="password"
              revealable
              inputMode="numeric"
              maxLength={6}
              value={changeConfirmPin}
              onChange={(e) => setChangeConfirmPin(e.target.value)}
              error={pinPanelError ?? undefined}
            />
            <button type="button" className={styles.forgotPinLink} onClick={handleOpenForgotPin}>
              Forgot PIN?
            </button>
            <div className={styles.buttonRow}>
              <Button type="button" variant="ghost" onClick={handleCancelPinPanel}>
                Cancel
              </Button>
              <Button type="submit" disabled={changePinDisabled}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitClear} className={styles.form}>
            <p className={styles.hint}>Enter your current PIN to remove PIN protection.</p>
            <Input
              label="Current PIN"
              type="password"
              revealable
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value)}
              error={pinPanelError ?? undefined}
            />
            <button type="button" className={styles.forgotPinLink} onClick={handleOpenForgotPin}>
              Forgot PIN?
            </button>
            <div className={styles.buttonRowEnd}>
              <Button type="button" variant="ghost" onClick={handleCancelPinPanel}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Clear PIN
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tab Budget</h3>
        <div className={styles.stepperRow}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => handleTabBudgetStep(-1)}
            aria-label="Decrease tab budget"
          >
            −
          </button>
          <span className={styles.stepperValue}>{tabBudgetDraft === 0 ? 'No limit' : `${tabBudgetDraft} tabs`}</span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => handleTabBudgetStep(1)}
            aria-label="Increase tab budget"
          >
            +
          </button>
        </div>
        <p className={styles.hint}>Set to 0 for no limit.</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Data</h3>

        <div className={styles.buttonGroup}>
          <Button onClick={handleExportClick} disabled={isExporting}>
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

        {hasPrivateConstraints && !exportPinPromptOpen && (
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={includePrivateExport}
              disabled={!pinConfigured}
              onChange={(e) => setIncludePrivateExport(e.target.checked)}
            />
            <span>Include private constraints</span>
          </label>
        )}
        {hasPrivateConstraints && !pinConfigured && (
          <p className={styles.hint}>Set a PIN above to include private constraints in exports.</p>
        )}
        {includePrivateExport && !exportPinPromptOpen && pinConfigured && (
          <p className={styles.warning}>
            This export will include your private constraint(s) with their real domain(s), in plain text. This file is not
            encrypted — anyone who opens it can read them.
          </p>
        )}
        {exportPinPromptOpen && (
          <PinEntryForm
            pinInput={exportPinInput}
            pinError={exportPinError}
            onPinInputChange={setExportPinInput}
            onSubmit={handleSubmitExportPin}
            onCancel={handleCancelExportPin}
            onForgotPin={handleOpenForgotPin}
            submitLabel="Export"
            ariaLabel="Enter PIN to export private constraints"
            helperText="Enter your PIN to export private constraints."
          />
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>About</h3>
        <p className={styles.hint}>boomrng v{chrome.runtime.getManifest().version}</p>
        <p className={styles.hint}>Everything stays on this device. No accounts, no analytics, no sync.</p>
        <button type="button" className={styles.linkAction} onClick={() => setHowItWorksOpen(true)}>
          How constraints work →
        </button>
      </section>

      <Modal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} title="How constraints work">
        <p className={styles.modalIntro}>
          Each site you add gets one of four behaviors, in increasing order of friction:
        </p>
        <div className={styles.behaviorList}>
          <div className={styles.behaviorItem}>
            <span className={styles.behaviorName}>Checkpoint</span>
            <p className={styles.behaviorDesc}>A quick pause before opening the site.</p>
          </div>
          <div className={styles.behaviorItem}>
            <span className={styles.behaviorName}>Delay</span>
            <p className={styles.behaviorDesc}>Wait for a time you choose before you can continue.</p>
          </div>
          <div className={styles.behaviorItem}>
            <span className={styles.behaviorName}>PIN Required</span>
            <p className={styles.behaviorDesc}>Enter your Boomrng PIN before continuing.</p>
          </div>
          <div className={styles.behaviorItem}>
            <span className={styles.behaviorName}>Hard Block</span>
            <p className={styles.behaviorDesc}>No access while this constraint is active.</p>
          </div>
        </div>
      </Modal>

      <ForgotPinDialog isOpen={forgotPinOpen} onClose={handleCancelForgotPin} onConfirm={handleConfirmForgotPin} />
    </div>
  );
};
