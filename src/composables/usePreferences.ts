import { ref } from 'vue'
import type { ThemeMode } from '../config'

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

const KEY_THEME = 'yumu.theme'
const KEY_CLOCK24 = 'yumu.clock24'
const KEY_MOTION = 'yumu.motion'
const KEY_HA_BASE = 'yumu.ha_base'
const KEY_HA_TOKEN = 'yumu.ha_token'

export function usePreferences() {
  const theme = ref<ThemeMode>(load<ThemeMode>(KEY_THEME, 'charcoal'))
  const use24Hour = ref(load<boolean>(KEY_CLOCK24, true))
  const motionEnabled = ref(load<boolean>(KEY_MOTION, true))

  /** HA base URL — falls back to env var, then default */
  const haBase = ref(load<string>(KEY_HA_BASE, '') || (import.meta.env.VITE_HA_BASE ?? '/ha-api'))
  /** HA token — falls back to env var */
  const haToken = ref(load<string>(KEY_HA_TOKEN, '') || (import.meta.env.VITE_HA_TOKEN ?? ''))

  function cycleTheme() {
    theme.value = theme.value === 'charcoal' ? 'warm' : theme.value === 'warm' ? 'auto' : 'charcoal'
    save(KEY_THEME, theme.value)
  }

  function toggleClock() {
    use24Hour.value = !use24Hour.value
    save(KEY_CLOCK24, use24Hour.value)
  }

  function toggleMotion() {
    motionEnabled.value = !motionEnabled.value
    save(KEY_MOTION, motionEnabled.value)
  }

  function setHaBase(v: string) {
    haBase.value = v
    save(KEY_HA_BASE, v)
  }

  function setHaToken(v: string) {
    haToken.value = v
    save(KEY_HA_TOKEN, v)
  }

  return {
    theme, use24Hour, motionEnabled,
    haBase, haToken,
    cycleTheme, toggleClock, toggleMotion,
    setHaBase, setHaToken,
  }
}
