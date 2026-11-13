import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HAPTIC, haptic } from '@/lib/haptic'
import { useSettingsStore } from '@/stores/settingsStore'

describe('haptic', () => {
  const vibrate = vi.fn()

  beforeEach(() => {
    vibrate.mockReset()
    vi.stubGlobal('navigator', { vibrate })
    useSettingsStore.setState({ vibrations: true })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('joue le motif demandé', () => {
    haptic('wrong')
    expect(vibrate).toHaveBeenCalledWith([...HAPTIC.wrong])
  })

  it('ne vibre pas si le réglage est désactivé', () => {
    useSettingsStore.setState({ vibrations: false })
    haptic('correct')
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('ignore un appareil sans vibreur (iPhone)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic('correct')).not.toThrow()
  })
})
