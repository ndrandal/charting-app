// src/ThemeProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react'
import { Theme, defaultTheme } from './theme'

interface ThemeProviderProps {
  themeOverrides?: Partial<Theme>;
  children: ReactNode;      // ← explicitly declared
}

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ themeOverrides = {}, children }: ThemeProviderProps) {
  const merged: Theme = { ...defaultTheme, ...themeOverrides };
  return (
    <ThemeContext.Provider value={merged}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
