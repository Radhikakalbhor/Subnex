/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F7F9',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8F9FA',
          muted: '#F1F3F5',
        },
        border: {
          subtle: 'rgba(0, 0, 0, 0.05)',
          DEFAULT: 'rgba(0, 0, 0, 0.08)',
          hover: 'rgba(0, 0, 0, 0.15)',
        },
      },
      borderRadius: {
        'card': '22px',
        'card-lg': '26px',
        'card-xl': '30px',
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 12px 28px -6px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'floating': '0 18px 40px -10px rgba(0, 0, 0, 0.08), 0 6px 16px -4px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'Inter',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
