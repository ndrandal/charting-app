import React from 'react';
import classNames from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glass' | 'solid';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'glass',
  className,
  ...props
}) => {
  const base = 'rounded-full px-4 py-2 font-sanFrancisco focus:outline-none';
  const glassStyles = `
    backdrop-filter blur(var(--blur-sm));
    background: rgba(255,255,255,var(--opacity-glassLight));
    box-shadow: var(--shadow-elevation1);
  `;
  const solidStyles = `
    background-color: var(--color-iceBlue);
    color: black;
    box-shadow: var(--shadow-elevation2);
  `;

  return (
    <button
      className={classNames(base, className)}
      style={{ ...(variant === 'glass'
        ? { ...parseStyles(glassStyles) }
        : { ...parseStyles(solidStyles) }
      )}}
      {...props}
    >
      {children}
    </button>
  );
};

function parseStyles(css: string): React.CSSProperties {
  return css.split(';').reduce((acc, rule) => {
    const [key, val] = rule.split(':').map(s => s?.trim());
    if (key && val) (acc as any)[camelCase(key)] = val;
    return acc;
  }, {} as React.CSSProperties);
}

function camelCase(str: string) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export default Button;
