import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-600',
    border: 'border-zinc-200'
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-600',
    border: 'border-rose-200'
  },
  info: {
    icon: Info,
    iconBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    bar: 'bg-zinc-800',
    border: 'border-zinc-200'
  }
};

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[calc(100vw-2.5rem)] max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const cfg = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = cfg.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-slide-up relative overflow-hidden bg-white/95 backdrop-blur-md border ${cfg.border} rounded-xl p-3.5 shadow-[0_8px_28px_rgba(9,9,11,0.1)] flex items-start gap-3`}
          >
            <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${cfg.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-bold text-zinc-900 leading-snug">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-zinc-600 leading-relaxed mt-0.5 break-words">
                {toast.text}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100">
              <div className={`h-full ${cfg.bar} animate-toast-progress`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
