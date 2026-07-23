import { type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'
export function Button({className, variant='primary', ...props}:{variant?:'primary'|'ghost'} & ButtonHTMLAttributes<HTMLButtonElement>){return <button className={cn('inline-flex items-center justify-center rounded px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ton',variant==='primary'?'bg-ton text-[#04111a] hover:bg-[#35b1f0]':'border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white',className)} {...props}/>}
