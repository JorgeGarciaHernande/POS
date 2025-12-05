export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa',
          300: '#fdba74', 400: '#fb923c', 500: '#f97316',
          600: '#f17013', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
        dark: { 900: '#1e293b', 800: '#334155', 700: '#475569' }
      },
    },
  },
  plugins: [],
}
