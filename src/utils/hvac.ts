import type { HaState } from '../config'

export type HvacGroup = {
  key: string
  climate: HaState | null
  fan: HaState | null
}

export const FAN_SPEED_PRESETS = [0, 35, 65, 100] as const

export function getHvacPairKey(entityId: string) {
  const raw = entityId.split('.')[1] ?? entityId
  return raw.replace(/_s_\d+.*$/, '')
}

export function pairHvacDevices(climates: HaState[], fans: HaState[]): HvacGroup[] {
  const groups: HvacGroup[] = climates.map((climate) => ({
    key: getHvacPairKey(climate.entity_id),
    climate,
    fan: null,
  }))

  const groupMap = new Map<string, HvacGroup>(groups.map((group) => [group.key, group]))

  fans.forEach((fan) => {
    const key = getHvacPairKey(fan.entity_id)
    const matched = groupMap.get(key)

    if (matched) {
      matched.fan = fan
      return
    }

    const standalone: HvacGroup = { key, climate: null, fan }
    groups.push(standalone)
    groupMap.set(key, standalone)
  })

  return groups
}
