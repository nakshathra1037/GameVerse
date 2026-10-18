import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      rightElement,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || props.name || autoId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-300 tracking-wide uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-slate-900/80 border ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20'
            } rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 outline-none focus:ring-2 ${
              Icon ? 'pl-10' : ''
            } ${rightElement ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
