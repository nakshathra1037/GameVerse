import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'border-emerald-500/40 bg-slate-900/95 text-emerald-300 shadow-emerald-500/10',
  error: 'border-rose-500/40 bg-slate-900/95 text-rose-300 shadow-rose-500/10',
  warning: 'border-amber-500/40 bg-slate-900/95 text-amber-300 shadow-amber-500/10',
  info: 'border-cyan-500/40 bg-slate-900/95 text-cyan-300 shadow-cyan-500/10',
};

export const ToastItem = ({ id, type = 'info', message, onClose }) => {
  const Icon = ICONS[type] || ICONS.info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 animate-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${STYLES[type]}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium text-slate-100 leading-snug">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
