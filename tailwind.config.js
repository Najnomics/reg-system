/** @type {import('tailwindcss').Config} */

// "Register" palette. Default Tailwind colour names are redefined so the
// existing pages (which use gray/indigo/blue/red/... directly) inherit the
// new look without touching every className.
const forest = {
  50: '#F1F6F3',
  100: '#DDEAE2',
  200: '#BCD5C5',
  300: '#8FB8A0',
  400: '#5E9677',
  500: '#2F7050',
  600: '#1E5A3C',
  700: '#184A31',
  800: '#133B28',
  900: '#0E2E1F',
  950: '#081B12',
}

const warm = {
  50: '#FAFAF7',
  100: '#F3F2EE',
  200: '#E7E5DF',
  300: '#D4D1C9',
  400: '#A8A49A',
  500: '#78746B',
  600: '#5A574F',
  700: '#3F3D37',
  800: '#2A2925',
  900: '#1A1917',
  950: '#0F0E0D',
}

const leaf = {
  50: '#EEF7F1',
  100: '#D7EEDF',
  200: '#B0DCC0',
  300: '#7FC39B',
  400: '#4FA673',
  500: '#2F8A57',
  600: '#237347',
  700: '#1C5C3A',
  800: '#174A30',
  900: '#123B27',
  950: '#0A2416',
}

const brick = {
  50: '#FBF2F0',
  100: '#F5E0DB',
  200: '#EBC0B6',
  300: '#DC978A',
  400: '#C86A5A',
  500: '#B04A3A',
  600: '#973A2D',
  700: '#7B2F25',
  800: '#63271F',
  900: '#4F201A',
  950: '#2E120E',
}

const ochre = {
  50: '#FBF6EA',
  100: '#F5EACB',
  200: '#EBD497',
  300: '#DDB963',
  400: '#CC9E3C',
  500: '#B08328',
  600: '#8E681F',
  700: '#6E501B',
  800: '#573F18',
  900: '#463314',
  950: '#271C0A',
}

const plum = {
  50: '#F7F3F6',
  100: '#EDE3EA',
  200: '#DAC6D4',
  300: '#BF9FB5',
  400: '#9F7592',
  500: '#835774',
  600: '#6B455F',
  700: '#57384D',
  800: '#452D3D',
  900: '#362331',
  950: '#1F141C',
}

const brass = {
  300: '#E3C88F',
  400: '#D6B574',
  500: '#C9A35E',
  600: '#A88546',
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: warm,
        slate: warm,
        indigo: forest,
        blue: forest,
        purple: plum,
        violet: plum,
        green: leaf,
        emerald: leaf,
        red: brick,
        rose: brick,
        yellow: ochre,
        amber: ochre,
        orange: ochre,
        primary: forest,
        secondary: warm,
        success: leaf,
        warning: ochre,
        error: brick,
        ink: '#151513',
        paper: '#FAFAF7',
        line: '#E7E5DF',
        brass,
        sanctuary: {
          bg: '#0E0D0B',
          s1: '#16140F',
          s2: '#1E1B15',
          line: '#2A261E',
          text: '#EDE6D6',
          muted: '#8D8676',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      boxShadow: {
        sm: '0 1px 0 rgba(21, 21, 19, 0.04)',
        DEFAULT: '0 1px 2px rgba(21, 21, 19, 0.05)',
        md: '0 2px 8px -2px rgba(21, 21, 19, 0.08)',
        lg: '0 8px 24px -8px rgba(21, 21, 19, 0.12)',
        xl: '0 16px 40px -12px rgba(21, 21, 19, 0.16)',
        '2xl': '0 24px 60px -16px rgba(21, 21, 19, 0.22)',
        soft: '0 1px 2px rgba(21, 21, 19, 0.05)',
        medium: '0 2px 8px -2px rgba(21, 21, 19, 0.08)',
        large: '0 16px 40px -12px rgba(21, 21, 19, 0.16)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.2,.7,.1,1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.5s cubic-bezier(.2,.7,.1,1) both',
        'slide-down': 'slideDown 0.4s cubic-bezier(.2,.7,.1,1) both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(.2,.7,.1,1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
