/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                heebo: ['Heebo', 'sans-serif'],
            },
            borderRadius: {
                '3xl': '2rem',
                '4xl': '3rem',
            },
            keyframes: {
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px)' },
                    '75%': { transform: 'translateX(5px)' },
                },
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
                'shake': 'shake 0.2s ease-in-out 0s 2',
                'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
            },
            colors: {
                primary: '#000000',
                info: '#1a73e8',
                warning: '#fbbc04',
                critical: '#d93025',
                success: '#188038',
            }
        },
    },
    plugins: [],
}
