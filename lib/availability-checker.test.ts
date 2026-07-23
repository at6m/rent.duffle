import { describe, expect, it } from 'vitest'
import { parseMarketAppStatus } from './availability-checker'
describe('marketapp parser',()=>{it('recognises for rent',()=>expect(parseMarketAppStatus('<h1>For Rent</h1>').status).toBe('FOR_RENT'));it('recognises cooldown',()=>expect(parseMarketAppStatus('<p>This gift was listed for rent less than 24 hours ago.</p>').status).toBe('COOLDOWN'));it('fails closed',()=>expect(parseMarketAppStatus('<h1>Something else</h1>').status).toBe('ERROR'))})
