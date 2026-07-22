import { useState, useEffect, useCallback } from 'react';
import type { Constraint } from '../../shared/types/constraint';
import { loadConstraints, saveConstraints, STORAGE_KEYS } from '../../shared/storage/storage-service';
import { subscribeToStorage } from '../../shared/storage/storage-service';

export function useConstraints(): [Constraint[], (value: Constraint[]) => void, boolean] {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadConstraints().then((loaded) => {
      if (!cancelled) {
        setConstraints(loaded);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStorage<Constraint[]>(STORAGE_KEYS.CONSTRAINTS, (newValue) => {
      setConstraints(newValue);
    });

    return unsubscribe;
  }, []);

  const updateConstraints = useCallback(async (newConstraints: Constraint[]) => {
    setConstraints(newConstraints);
    await saveConstraints(newConstraints);
  }, []);

  return [constraints, updateConstraints, isLoading];
}
