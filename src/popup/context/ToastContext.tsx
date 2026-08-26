import React, { createContext, useCallback, useContext, useState } from 'react';
import { Toast } from '../components/foundation/Toast';

export interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: 'success' | 'error' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" role="log" aria-live="polite">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onClose={() => handleRemove(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
