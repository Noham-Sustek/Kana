import { describe, expect, it } from 'vitest'
import { HAPTIC } from '@/lib/haptic'
import { SOUNDS, penta, tapKind } from '@/lib/sound'

describe('SOUNDS', () => {
  it('a au moins une variante pour chaque moment haptique', () => {
    for (const kind of Object.keys(HAPTIC)) expect(SOUNDS[kind as keyof typeof SOUNDS].length).toBeGreaterThan(0)
  })

  it('reste court, audible et sans saturation', () => {
    for (const [kind, variants] of Object.entries(SOUNDS)) {
      // Seuls « juste » et « trait validé » montent avec la série (7 et 9 degrés au plus).
      const lift = kind === 'correct' ? penta(7, 1) : kind === 'strokeOk' ? penta(9, 1) : 1
      for (const notes of variants) {
        expect(notes.length).toBeGreaterThan(0)
        expect(Math.max(...notes.map((n) => n.at + n.dur))).toBeLessThanOrEqual(1)
        for (const n of notes) {
          expect(n.freq).toBeGreaterThanOrEqual(150)
          expect(n.freq * lift).toBeLessThanOrEqual(12_000)
          expect(n.gain ?? 1).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})

describe('penta', () => {
  it('suit la gamme pentatonique de do, octaves comprises', () => {
    expect(penta(0, 100)).toBeCloseTo(100)
    expect(penta(5, 100)).toBeCloseTo(200)
    expect(penta(-5, 100)).toBeCloseTo(50)
    expect(penta(2, 100)).toBeCloseTo(100 * 2 ** (4 / 12))
  })
})

describe('tapKind', () => {
  const t = (classes: string, attrs: Record<string, string> = {}, disabled = false) => ({
    classList: { contains: (c: string) => classes.split(' ').includes(c) },
    getAttribute: (a: string) => attrs[a] ?? null,
    disabled,
  })
  it('choisit un son selon le contrôle touché', () => {
    expect(tapKind(t('k-tab'))).toBe('tapTab')
    expect(tapKind(t('k-chip', { 'aria-pressed': 'false' }))).toBe('chipOn')
    expect(tapKind(t('k-chip', { 'aria-pressed': 'true' }))).toBe('chipOff')
    expect(tapKind(t('k-btn k-btn--primary'))).toBe('tapPrimary')
    expect(tapKind(t('k-iconbtn', { 'aria-label': 'Retour' }))).toBe('tapBack')
    expect(tapKind(t('', { role: 'switch', 'aria-checked': 'true' }))).toBe('chipOff')
    expect(tapKind(t('k-card'))).toBe('tap')
  })
  it('se tait sans contrôle ou sur un contrôle désactivé', () => {
    expect(tapKind(null)).toBeNull()
    expect(tapKind(t('k-btn', {}, true))).toBeNull()
  })
})
