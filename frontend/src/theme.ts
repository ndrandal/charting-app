// theme.ts
export const tokens = {
  color: {
    ghostWhite: '#ECEBF3',
    iceBlue:   '#E0F7FA',
    amber:     '#FFC107',
  },
  opacity: {
    glassLight: 0.18,
    glassDark:  0.24,
  },
  blur: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '30px',
  },
  shadow: {
    elevation1: '0 1px 3px rgba(0,0,0,0.12)',
    elevation2: '0 4px 6px rgba(0,0,0,0.16)',
    focusRing:  '0 0 0 3px rgba(0,150,255,0.3)', // accent fallback
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", sans-serif',
    fontSize: {
      h1: '28px',
      h2: '22px',
      body: '16px',
      caption: '12px',
    },
    lineHeight: {
      h1: '34px',
      h2: '28px',
      body: '24px',
      caption: '16px',
    },
  },
};
