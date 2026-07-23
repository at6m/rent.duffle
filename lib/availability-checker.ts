export type GiftStatus = 'FOR_RENT' | 'COOLDOWN' | 'RENTED' | 'UNAVAILABLE' | 'CHECKING' | 'ERROR'
const GiftStatus = { FOR_RENT: 'FOR_RENT', COOLDOWN: 'COOLDOWN', RENTED: 'RENTED', UNAVAILABLE: 'UNAVAILABLE', CHECKING: 'CHECKING', ERROR: 'ERROR' } as const
export type ParsedAvailability = { status: GiftStatus; message: string | null }
const BASE_URL = process.env.MARKETAPP_BASE_URL || 'https://marketapp.org'

/** Adapter kept deliberately small so markup changes only require one parser update. */
export function parseMarketAppStatus(html: string): ParsedAvailability {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const cooldown = text.match(/this gift was listed for rent less than 24 hours ago[^.]*\.?/i)
  if (cooldown || /cooldown|cooling down|less than 24 hours/.test(lower)) return { status: GiftStatus.COOLDOWN, message: cooldown?.[0] || 'This gift is in cooldown.' }
  if (/for rent/.test(lower)) return { status: GiftStatus.FOR_RENT, message: 'For Rent' }
  if (/currently rented|rented/.test(lower)) return { status: GiftStatus.RENTED, message: 'Currently rented' }
  if (/unavailable|not available|sold/.test(lower)) return { status: GiftStatus.UNAVAILABLE, message: 'Unavailable' }
  return { status: GiftStatus.ERROR, message: 'Availability status could not be identified.' }
}

export async function checkAvailability(url: string): Promise<ParsedAvailability> {
  const parsed = new URL(url)
  const base = new URL(BASE_URL)
  if (parsed.hostname !== base.hostname || !parsed.pathname.startsWith('/nft/')) throw new Error('Only marketapp.org NFT URLs are allowed.')
  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Duffle availability checker/1.0' } })
    if (!response.ok) return { status: GiftStatus.ERROR, message: `Market app returned ${response.status}.` }
    return parseMarketAppStatus(await response.text())
  } catch { return { status: GiftStatus.ERROR, message: 'Could not reach marketapp.org.' } }
}
