import type { Config } from 'tailwindcss'
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#0b0b0f', ton: '#0098EA' }, fontFamily: { display: ['var(--font-display)'], sans: ['var(--font-sans)'] } } }, plugins: [] } satisfies Config
