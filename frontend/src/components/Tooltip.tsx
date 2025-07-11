import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => (
  <div className="relative group inline-block">
    {children}
    <div
      className={`
        absolute bottom-full mb-2 px-2 py-1 rounded
        backdrop-filter blur(var(--blur-sm));
        background: rgba(255,255,255,var(--opacity-glassLight));
        border: 0.5px solid rgba(255,255,255,var(--border-alpha,0.3));
        transform scale-75 opacity-0
        group-hover:scale-100 group-hover:opacity-100
        transition-all duration-150
      `}
      style={{ transformOrigin: 'bottom center' }}
    >
      {text}
    </div>
  </div>
);

export default Tooltip;
