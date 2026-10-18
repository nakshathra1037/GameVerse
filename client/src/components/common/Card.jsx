import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  glow = false,
  header,
  footer,
  ...props
}) => {
  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${
        hoverable ? 'glass-panel-hover transform hover:-translate-y-1' : ''
      } ${glow ? 'neon-border-cyan' : ''} ${className}`}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
