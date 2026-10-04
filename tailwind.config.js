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

// "Sanctuary" dark palette. Same shade names as above; neutral and accent
// scales run the other way so a class like bg-gray-50 stays "the subtle
// surface" and text-gray-900 stays "the strongest text" in both themes.
const dark = {
  warm: {
    50: '#1B1914', 100: '#221F19', 200: '#2E2A22', 300: '#3D382E', 400: '#5F594C',
    500: '#8D8676', 600: '#A8A090', 700: '#C5BDAB', 800: '#DCD4C2', 900: '#EDE6D6', 950: '#F6F1E6',
  },
  // Brass stands in for the green accent: it is the only colour in Sanctuary.
  forest: {
    50: '#1F1A10', 100: '#2A2314', 200: '#3D321C', 300: '#5C4A27', 400: '#8C7038',
    500: '#B08E4F', 600: '#C9A35E', 700: '#D6B574', 800: '#E3C88F', 900: '#EFDDB3', 950: '#F6EBD0',
  },
  leaf: {
    50: '#141A14', 100: '#1A231B', 200: '#243225', 300: '#35493A', 400: '#557560',
    500: '#7A9A82', 600: '#8FAE96', 700: '#A9C2AE', 800: '#C3D6C6', 900: '#DAE6DB', 950: '#EBF2EC',
  },
  brick: {
    50: '#1E1311', 100: '#2A1814', 200: '#3D221C', 300: '#5C3328', 400: '#8A4E3E',
    500: '#B06A57', 600: '#C27D69', 700: '#D19A89', 800: '#E0B8AA', 900: '#EDD3CA', 950: '#F6E7E2',
  },
  ochre: {
    50: '#1D180E', 100: '#272012', 200: '#3A2F19', 300: '#574624', 400: '#846A35',
    500: '#A9874A', 600: '#C29E5C', 700: '#D3B479', 800: '#E2CA98', 900: '#EEDDB8', 950: '#F6ECD5',
  },
  plum: {
    50: '#1A1517', 100: '#231C1F', 200: '#33292D', 300: '#4C3D43', 400: '#73606A',
    500: '#95818B', 600: '#A8949E', 700: '#BEADB5', 800: '#D4C7CD', 900: '#E6DCE1', 950: '#F2ECEF',
  },
}

const singles = {
  light: { white: '#FFFFFF', ink: '#151513', paper: '#FAFAF7', line: '#E7E5DF' },
  dark: { white: '#16140F', ink: '#EDE6D6', paper: '#0E0D0B', line: '#2A261E' },
}

const light = { warm, forest, leaf, brick, ochre, plum }

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

const cssVars = (palettes, single) => {
  const out = {}
  for (const [name, scale] of Object.entries(palettes)) {
    for (const [shade, hex] of Object.entries(scale)) out[`--c-${name}-${shade}`] = rgb(hex)
  }
  for (const [name, hex] of Object.entries(single)) out[`--c-${name}`] = rgb(hex)
  return out
}

const varScale = (name) =>
  Object.fromEntries(Object.keys(warm).map((shade) => [shade, `rgb(var(--c-${name}-${shade}) / <alpha-value>)`]))

const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

const scales = {
  warm: varScale('warm'),
  forest: varScale('forest'),
  leaf: varScale('leaf'),
  brick: varScale('brick'),
  ochre: varScale('ochre'),
  plum: varScale('plum'),
}

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: v('white'),
        gray: scales.warm,
        slate: scales.warm,
        indigo: scales.forest,
        blue: scales.forest,
        purple: scales.plum,
        violet: scales.plum,
        green: scales.leaf,
        emerald: scales.leaf,
        red: scales.brick,
        rose: scales.brick,
        yellow: scales.ochre,
        amber: scales.ochre,
        orange: scales.ochre,
        primary: scales.forest,
        secondary: scales.warm,
        success: scales.leaf,
        warning: scales.ochre,
        error: scales.brick,
        ink: v('ink'),
        paper: v('paper'),
        line: v('line'),
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
  plugins: [
    ({ addBase }) =>
      addBase({
        ':root': cssVars(light, singles.light),
        '.dark': cssVars(dark, singles.dark),
      }),
  ],
}
