import React from 'react';
import { useConstraints } from '../hooks/useConstraints';
import { useSettings } from '../hooks/useSettings';
import { useTabCount } from '../hooks/useTabCount';
import { toV2BehaviorLabel, toV2BehaviorBadgeVariant } from '../../shared/utils';
import type { Constraint } from '../../shared/types/constraint';
import { Badge } from '../components/foundation/Badge';
import { Button } from '../components/foundation/Button';
import { Card } from '../components/foundation/Card';
import { Spinner } from '../components/foundation/Spinner';
import { ProgressArc } from '../components/foundation/ProgressArc';
import { EmptyState } from '../components/feedback/EmptyState';
import styles from './Dashboard.module.css';

const MAX_ROWS = 3;

export interface DashboardProps {
  onNavigate: (screen: 'sites' | 'settings') => void;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function behaviorConfigText(constraint: Constraint): string | null {
  if ((constraint.behavior === 'delay' || constraint.behavior === 'progressive-delay') && constraint.delayMinutes) {
    return `${constraint.delayMinutes} min`;
  }
  return null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [constraints, , constraintsLoading] = useConstraints();
  const [settings, , settingsLoading] = useSettings();
  const tabCount = useTabCount();

  if (constraintsLoading || settingsLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Dashboard is a preview, not a management list (BOOMRNG-V2-DESIGN-SPEC.md
  // §9): at most MAX_ROWS public rows, ever. Private constraints contribute
  // to the headline count above and nothing else — no row, no placeholder,
  // no count of how many are private. "View all" is keyed off the total vs.
  // what's actually rendered, not off public overflow alone, so its
  // presence never reveals whether anything hidden is private.
  const publicConstraints = constraints.filter((c) => !c.isPrivate);
  const visiblePublic = publicConstraints.slice(0, MAX_ROWS);
  const hasMore = constraints.length > visiblePublic.length;

  const budget = settings.tabBudget;
  const hasBudget = budget > 0;
  const tabPercent = hasBudget ? (tabCount / budget) * 100 : 0;

  let tabHint = 'No tab budget set';
  let tabColor = 'var(--accent)';
  if (hasBudget) {
    if (tabCount < budget) {
      tabHint = `${pluralize(budget - tabCount, 'tab')} to spare`;
      tabColor = 'var(--accent)';
    } else if (tabCount === budget) {
      tabHint = 'At your limit';
      tabColor = 'var(--warning)';
    } else {
      tabHint = `${pluralize(tabCount - budget, 'tab')} over`;
      tabColor = 'var(--destructive)';
    }
  }

  const tabBudgetLabel = hasBudget
    ? `Tab budget: ${tabCount} of ${budget} tabs used, ${tabHint}`
    : 'No tab budget set';

  return (
    <div className={styles.container}>
      {/* Visually hidden — the persistent header already carries the page's
          identity; this exists only so screen readers get a landmark
          heading consistent with Sites/Settings. */}
      <h2 className={styles.visuallyHidden}>Dashboard</h2>

      {constraints.length === 0 ? (
        <EmptyState
          title="Nothing constrained yet."
          description="Add a site you want a pause before opening."
          action={
            <Button onClick={() => onNavigate('sites')}>Add your first constraint</Button>
          }
        />
      ) : (
        <>
          <p className={styles.statusLine}>{pluralize(constraints.length, 'constraint')} active</p>

          {visiblePublic.length > 0 && (
            <div className={styles.listGroup}>
              {visiblePublic.map((constraint) => {
                const label = toV2BehaviorLabel(constraint.behavior);
                const config = behaviorConfigText(constraint);
                return (
                  <div className={styles.row} key={constraint.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.domain}>{constraint.domain}</span>
                    </div>
                    <Badge variant={toV2BehaviorBadgeVariant(label)}>
                      {config ? `${label} · ${config}` : label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('sites')}>
              View all
            </Button>
          )}
        </>
      )}

      <Card padding="md" className={styles.tabBudgetCard}>
        <h3 className={styles.cardTitle}>Tab Budget</h3>
        {hasBudget ? (
          <div className={styles.tabBudgetRow}>
            <ProgressArc percent={tabPercent} color={tabColor} label={tabBudgetLabel} />
            <div className={styles.figures}>
              <div className={styles.n}>
                {tabCount} of {budget}
              </div>
              <div className={styles.hint}>{tabHint}</div>
            </div>
          </div>
        ) : (
          <div className={styles.noBudget}>
            <span className={styles.hint}>No tab budget set</span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
              Set one in Settings
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
