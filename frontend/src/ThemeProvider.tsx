import React, { useEffect } from 'react';
import { tokens } from './theme';

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement.style;

    // Colors
    root.setProperty('--color-ghostWhite', tokens.color.ghostWhite);
    root.setProperty('--color-iceBlue',   tokens.color.iceBlue);
    root.setProperty('--color-amber',     tokens.color.amber);

    // Opacities
    root.setProperty('--opacity-glassLight', tokens.opacity.glassLight.toString());
    root.setProperty('--opacity-glassDark',  tokens.opacity.glassDark.toString());

    // Blurs
    Object.entries(tokens.blur).forEach(([key, val]) =>
      root.setProperty(`--blur-${key}`, val)
    );

    // Shadows
    Object.entries(tokens.shadow).forEach(([key, val]) =>
      root.setProperty(`--shadow-${key}`, val)
    );

    // Typography
    root.setProperty('--font-family', tokens.typography.fontFamily);
    Object.entries(tokens.typography.fontSize).forEach(([key, fs]) =>
      root.setProperty(`--font-size-${key}`, fs)
    );
    Object.entries(tokens.typography.lineHeight).forEach(([key, lh]) =>
      root.setProperty(`--line-height-${key}`, lh)
    );
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
