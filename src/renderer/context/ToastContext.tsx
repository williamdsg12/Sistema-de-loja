import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { Modal } from '../components/Modal';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const toast = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  const confirmDialog = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve: (val: boolean) => {
          setConfirmState(null);
          resolve(val);
        }
      });
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Substituição transparente de window.alert para garantir zero popups nativos
  useEffect(() => {
    (window as any).customToast = toast;
    (window as any).customConfirm = confirmDialog;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirmDialog }}>
      {children}

      {/* Container de Toasts Flutuantes */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-md w-full">
        {toasts.map((t) => {
          let bg = 'bg-slate-900 border-slate-700 text-white';
          let Icon = Info;
          let iconColor = 'text-sky-400';

          if (t.type === 'success') {
            bg = 'bg-emerald-900 border-emerald-700 text-emerald-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (t.type === 'error') {
            bg = 'bg-rose-950 border-rose-800 text-rose-100';
            Icon = XCircle;
            iconColor = 'text-rose-400';
          } else if (t.type === 'warning') {
            bg = 'bg-amber-950 border-amber-800 text-amber-100';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-0 ${bg}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs font-medium leading-relaxed select-text">{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmação Moderno */}
      {confirmState && (
        <Modal
          isOpen={confirmState.isOpen}
          onClose={() => confirmState.resolve(false)}
          title={confirmState.options.title || 'Confirmação do Sistema'}
          maxWidth="sm"
          zIndex="z-[9999]"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <AlertTriangle
                className={`w-6 h-6 shrink-0 ${
                  confirmState.options.variant === 'danger' ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <p className="text-slate-800 text-xs font-medium leading-relaxed">
                {confirmState.options.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {confirmState.options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className={`flex-1 py-2.5 text-white rounded-xl font-bold text-xs shadow transition-colors cursor-pointer ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {confirmState.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
