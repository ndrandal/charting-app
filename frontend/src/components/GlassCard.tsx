// GlassCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { computeBorderAlpha } from '../utils/border';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: 'elevation1' | 'elevation2';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  elevation = 'elevation1'
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [borderAlpha, setBorderAlpha] = useState(0.3);
  const shadowVar = `var(--shadow-${elevation})`;

  // Recompute on mount (and on window resize/orientation change)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateAlpha = async () => {
      try {
        const a = await computeBorderAlpha(el);
        setBorderAlpha(a);
      } catch {
        // fallback if sampling not supported
        setBorderAlpha(0.3);
      }
    };

    updateAlpha();
    window.addEventListener('resize', updateAlpha);
    return () => window.removeEventListener('resize', updateAlpha);
  }, []);

  return (
    <div
      ref={ref}
      className={classNames(
        'rounded-2xl border',
        className
      )}
      style={{
        background: `rgba(255,255,255,var(--opacity-glassLight))`,
        backdropFilter: `blur(var(--blur-lg))`,
        border: `1px solid rgba(255,255,255,${borderAlpha})`,
        boxShadow: shadowVar,
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;
