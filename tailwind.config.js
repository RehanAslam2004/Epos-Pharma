/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./renderer/**/*.{js,jsx}', './index.html'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                sea: {
                    50: '#effef7',
                    100: '#d9fdec',
                    200: '#b5f9da',
                    300: '#7cf2c0',
                    400: '#3ce29f',
                    500: '#15c983',
                    600: '#0aa86b',
                    700: '#0c8457',
                    800: '#0f6847',
                    900: '#0e553c',
                    950: '#023020',
                },
            },
            borderRadius: {
                '2xl': '16px',
                '3xl': '20px',
            },
            boxShadow: {
                card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                md: '0 4px 12px rgba(0,0,0,0.06)',
                lg: '0 10px 25px rgba(0,0,0,0.07)',
                xl: '0 20px 40px rgba(0,0,0,0.08)',
                glow: '0 0 20px rgba(10, 168, 107, 0.15)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease',
                'fade-up': 'fadeUp 0.35s ease',
                'scale-up': 'scaleUp 0.25s ease',
                'slide-in': 'slideIn 0.3s ease',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
                fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
                scaleUp: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
                slideIn: { '0%': { opacity: 0, transform: 'translateX(-12px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
            },
        },
    },
    plugins: [],
};
