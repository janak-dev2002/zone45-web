/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#101010',
        'canvas-soft': '#1a1a1a',
        hairline: '#3d3a39',
        primary: '#00d992',
        'primary-soft': '#2fd6a1',
        'primary-deep': '#10b981',
        ink: '#f2f2f2',
        'ink-strong': '#ffffff',
        body: '#bdbdbd',
        mute: '#8b949e',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
