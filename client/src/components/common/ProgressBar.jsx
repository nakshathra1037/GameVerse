import React from 'react';

const COLOR_VARIANTS = {
  cyan: 'from-cyan-500 to-blue-500 shadow-cyan-500/30',
  emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
  purple: 'from-purple-500 to-indigo-500 shadow-purple-500/30',
  rose: 'from-rose-500 to-red-500 shadow-rose-500/30',
};

export const ProgressBar = ({
  value = 0,
  max = 100,
  variant = 'cyan',
  label = '',
  valueText = '',
  showPercentage = false,
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  const gradient = COLOR_VARIANTS[variant] || COLOR_VARIANTS.cyan;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || valueText || showPercentage) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-slate-300">
          {label && <span>{label}</span>}
          <span>{valueText || (showPercentage ? `${percentage}%` : `${value} / ${max}`)}</span>
        </div>
      )}
      <div
        className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5 p-0.5 ${heightClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-sm transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
