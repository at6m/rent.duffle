import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Duffle — Rent Telegram Gifts', description: 'Discover rare Telegram gifts, rented by the day.' }
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
