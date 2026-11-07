import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    bar: 'bg-emerald-500',
    border: 'border-emerald-200/90'
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200/80',
    bar: 'bg-rose-500',
    border: 'border-rose-200/90'
  },
  info: {
    icon: Info,
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
    bar: 'bg-indigo-500',
    border: 'border-indigo-200/90'
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
            className={`pointer-events-auto animate-slide-up relative overflow-hidden bg-white/95 backdrop-blur-md border ${cfg.border} rounded-xl p-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] flex items-start gap-3`}
          >
            <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${cfg.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-slate-600 leading-relaxed mt-0.5 break-words">
                {toast.text}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Auto-dismiss visual timer bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
              <div className={`h-full ${cfg.bar} animate-toast-progress`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

