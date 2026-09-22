import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        odisseia: {
          bg:          '#0c0804',
          bgMid:       '#120b04',
          bgPanel:     '#160e06',
          surface:     '#1c1408',
          border:      '#4a3820',
          borderGold:  '#9a7832',
          gold:        '#d4a828',
          goldMid:     '#b8861e',
          goldLight:   '#e6c84c',
          parch:       '#f0e6cc',
          parchMid:    '#e6d8b2',
          parchDark:   '#d8c898',
          ink:         '#1a0f08',
          muted:       '#9a7c4a',
          text:        '#d0b070',
          textLight:   '#e8d0a0',
          blood:       '#5c0f0f',
          bloodMid:    '#7a1818',
          bloodLight:  '#a03030',
          purple:      '#6b4c9a',
          purpleLight: '#9b7cc9',
          red:         '#5c0f0f',
        },
      },
      fontFamily: {
        display:  ['"Cinzel Decorative"', 'serif'],
        medieval: ['Cinzel', 'serif'],
        body:     ['"Crimson Pro"', 'serif'],
        italic:   ['"IM Fell English"', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
