/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg:       '#08080f',
          surface:  '#111118',
          elevated: '#18181f',
          border:   '#26263a',
          primary:  '#6366f1',
          glow:     '#818cf8',
          accent:   '#22d3ee',
          danger:   '#ef4444',
          success:  '#10b981',
          muted:    '#94a3b8',
          text:     '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px 0 rgba(99,102,241,0.25)',
        'glow-accent': '0 0 24px 0 rgba(34,211,238,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
