import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading GameVerse...' }) => {
  const sizeMap = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="relative">
        <div
          className={`${sizeMap[size]} rounded-full border-slate-800 border-t-cyan-400 border-r-blue-500 animate-spin`}
        />
        <div className="absolute inset-0 rounded-full blur-sm bg-cyan-400/20 animate-pulse" />
      </div>
      {text && (
        <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
