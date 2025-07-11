import React, { useState, useEffect, useRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        {...props}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`
          w-full rounded-lg
          backdrop-filter blur(var(--blur-sm));
          background: rgba(255,255,255,var(--opacity-glassLight));
          box-shadow: var(--shadow-elevation1);
          border: 2px solid rgba(255,255,255,var(--border-alpha,0.3));
          px-3 py-2
        `}
      />
      <label
        htmlFor={props.id}
        className={`
          absolute left-3 pointer-events-none
          transform transition-all duration-200
          ${focused || props.value ? '-translate-y-4 text-xs' : 'translate-y-2 text-sm'}
        `}
        style={{ color: 'rgba(255,255,255,0.7)' }}
      >
        {label}
      </label>
    </div>
  );
};

export default Input;
