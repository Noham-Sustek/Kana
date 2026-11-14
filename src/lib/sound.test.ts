import { describe, expect, it } from 'vitest'
import { HAPTIC } from '@/lib/haptic'
import { SOUNDS } from '@/lib/sound'

describe('SOUNDS', () => {
  it('a un son pour chaque moment haptique, et le toucher', () => {
    for (const kind of [...Object.keys(HAPTIC), 'tap']) expect(SOUNDS[kind as keyof typeof SOUNDS]?.length).toBeGreaterThan(0)
  })

  it('reste court, audible et sans saturation', () => {
    for (const notes of Object.values(SOUNDS)) {
      const end = Math.max(...notes.map((n) => n.at + n.dur))
      expect(end).toBeLessThanOrEqual(0.6)
      for (const n of notes) {
        expect(n.freq).toBeGreaterThanOrEqual(200)
        expect(n.freq).toBeLessThanOrEqual(5000)
        expect(n.gain ?? 1).toBeLessThanOrEqual(1)
        expect(n.dur).toBeGreaterThan(0)
      }
    }
  })
})
