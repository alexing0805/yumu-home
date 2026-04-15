import { computed, ref } from 'vue'
import { HA_ENTITIES, type ForecastDay, type HaState } from '../config'
import { useHaWebSocket } from './useHaWebSocket'

/**
 * Core HA data composable.
 * - Fetches initial state via REST
 * - Subscribes to real-time updates via WebSocket
 * - Concurrency control with AbortController
 */
export function useHa(haBase: () => string, haToken: () => string) {
  const loading = ref(true)
  const errorText = ref('')

  /* ---- raw state refs ---- */
  const allLights = ref<HaState[]>([])
  const allCurtains = ref<HaState[]>([])
  const climateList = ref<HaState[]>([])
  const fanList = ref<HaState[]>([])
  const airPurifier = ref<HaState | null>(null)
  const weather = ref<HaState | null>(null)
  const forecast = ref<ForecastDay[]>([])
  const envSensors = ref<Record<string, HaState | null>>({})
  const person = ref<HaState | null>(null)
  const lockDoorState = ref<HaState | null>(null)
  const lockArmedState = ref<HaState | null>(null)
  const lockBattery = ref<HaState | null>(null)
  const mediaPlayers = ref<HaState[]>([])
  const vacuum = ref<HaState | null>(null)

  /* ---- internal state map for WS patching ---- */
  let stateMap = new Map<string, HaState>()

  /* ---- concurrency control ---- */
  let currentAbort: AbortController | null = null

  /* ---- helpers ---- */
  async function haFetch(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
    const res = await fetch(`${haBase()}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${haToken()}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) throw new Error(`HA ${res.status}`)
    return res.json()
  }

  /** Project stateMap into reactive refs */
  function projectStates() {
    const pick = (ids: string[]) => ids.map((id) => stateMap.get(id)).filter(Boolean) as HaState[]
    const get = (id: string) => stateMap.get(id) ?? null

    allLights.value = pick(HA_ENTITIES.lights)
    allCurtains.value = pick(HA_ENTITIES.curtains)
    climateList.value = pick(HA_ENTITIES.climate)
    fanList.value = pick(HA_ENTITIES.fans)
    airPurifier.value = get(HA_ENTITIES.airPurifier)
    weather.value = get(HA_ENTITIES.weather)
    person.value = get(HA_ENTITIES.person)
    lockDoorState.value = get(HA_ENTITIES.lock.doorState)
    lockArmedState.value = get(HA_ENTITIES.lock.armedState)
    lockBattery.value = get(HA_ENTITIES.lock.battery)
    mediaPlayers.value = pick(HA_ENTITIES.mediaPlayers)
    vacuum.value = get(HA_ENTITIES.vacuum)

    const env: Record<string, HaState | null> = {}
    for (const [key, id] of Object.entries(HA_ENTITIES.env)) {
      env[key] = get(id)
    }
    envSensors.value = env
  }

  async function loadForecast(signal?: AbortSignal) {
    try {
      const res = await fetch(`${haBase()}/api/services/weather/get_forecasts?return_response`, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${haToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: HA_ENTITIES.weather, type: 'daily' }),
      })
      if (!res.ok) {
        console.warn('[yumu] forecast fetch failed:', res.status)
        return
      }
      const data = await res.json()
      const resp = data.service_response ?? {}
      const entry = resp[HA_ENTITIES.weather]
      if (entry?.forecast) {
        forecast.value = entry.forecast.slice(0, 7)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.warn('[yumu] forecast error:', e)
    }
  }

  async function loadHaStates() {
    // Cancel any previous in-flight request
    if (currentAbort) currentAbort.abort()
    const abort = new AbortController()
    currentAbort = abort

    try {
      loading.value = true
      errorText.value = ''
      const all: HaState[] = await haFetch('/api/states', 'GET', undefined, abort.signal)
      stateMap = new Map(all.map((s) => [s.entity_id, s]))
      projectStates()
      await loadForecast(abort.signal)
    } catch (e: any) {
      if (e?.name === 'AbortError') return // superseded by newer request
      errorText.value = e?.message ?? 'HA 连接失败'
    } finally {
      if (currentAbort === abort) {
        loading.value = false
        currentAbort = null
      }
    }
  }

  /* ---- WebSocket real-time updates ---- */
  function onWsStateChanged(entityId: string, newState: HaState) {
    stateMap.set(entityId, newState)
    projectStates()
  }

  const websocket = useHaWebSocket(haBase, haToken, onWsStateChanged)

  function startWebSocket() {
    websocket.connect()
  }

  function stopWebSocket() {
    websocket.disconnect()
  }

  /* ---- service calls ---- */
  async function callService(domain: string, service: string, entityId: string, data?: Record<string, any>) {
    await haFetch(`/api/services/${domain}/${service}`, 'POST', { entity_id: entityId, ...data })
    // Don't reload all states — WS will push the update.
    // But if WS is not connected, do a refresh.
    if (websocket.wsState.value !== 'authenticated') {
      await loadHaStates()
    }
  }

  async function toggleEntity(entityId: string) {
    const domain = entityId.split('.')[0]
    let service: string

    if (domain === 'light') {
      const cur = allLights.value.find((x) => x.entity_id === entityId)
      service = cur?.state === 'on' ? 'turn_off' : 'turn_on'
    } else if (domain === 'cover') {
      const cur = allCurtains.value.find((x) => x.entity_id === entityId)
      service = cur?.state === 'open' ? 'close_cover' : 'open_cover'
    } else if (domain === 'switch') {
      service = 'toggle'
    } else if (domain === 'fan') {
      service = 'toggle'
    } else if (domain === 'climate') {
      const cur = climateList.value.find((x) => x.entity_id === entityId)
      service = cur?.state === 'off' ? 'turn_on' : 'turn_off'
    } else if (domain === 'vacuum') {
      const cur = vacuum.value
      service = cur?.state === 'docked' ? 'start' : 'return_to_base'
    } else {
      return
    }

    await callService(domain, service, entityId)
  }

  async function setLightBrightness(entityId: string, brightness_pct: number) {
    if (brightness_pct <= 0) return callService('light', 'turn_off', entityId)
    await callService('light', 'turn_on', entityId, { brightness_pct })
  }

  async function setCoverPosition(entityId: string, position: number) {
    await callService('cover', 'set_cover_position', entityId, { position })
  }

  async function stopCover(entityId: string) {
    await callService('cover', 'stop_cover', entityId)
  }

  async function setClimateTemp(entityId: string, temperature: number) {
    await callService('climate', 'set_temperature', entityId, { temperature })
  }

  async function setClimateMode(entityId: string, hvac_mode: string) {
    await callService('climate', 'set_hvac_mode', entityId, { hvac_mode })
  }

  async function setClimateSwingMode(entityId: string, swing_mode: string) {
    await callService('climate', 'set_swing_mode', entityId, { swing_mode })
  }

  async function setFanPct(entityId: string, percentage: number) {
    await callService('fan', 'set_percentage', entityId, { percentage })
  }

  async function setFanMode(entityId: string, preset_mode: string) {
    // Some fans use a domain of 'climate' to set fan modes, or actual fans use 'preset_mode'.
    const domain = entityId.split('.')[0]
    if (domain === 'climate') {
      await callService('climate', 'set_fan_mode', entityId, { fan_mode: preset_mode })
    } else {
      await callService('fan', 'set_preset_mode', entityId, { preset_mode })
    }
  }

  /* ---- scene actions (composite service calls) ---- */
  async function activateScene(sceneId: string) {
    const batch: Promise<any>[] = []
    const call = (domain: string, service: string, ids: string[]) => {
      ids.forEach((id) => batch.push(
        haFetch(`/api/services/${domain}/${service}`, 'POST', { entity_id: id })
      ))
    }

    switch (sceneId) {
      case 'home':
        // 回家：开吊灯、开灯带
        call('light', 'turn_on', ['light.diao_deng', 'light.ke_ting_san_jian_deng_guang'])
        break
      case 'away':
        // 离家：关所有灯、关窗帘
        call('light', 'turn_off', HA_ENTITIES.lights as unknown as string[])
        call('cover', 'close_cover', HA_ENTITIES.curtains as unknown as string[])
        break
      case 'cinema':
        // 电影模式：关所有灯、关窗帘
        call('light', 'turn_off', HA_ENTITIES.lights as unknown as string[])
        call('cover', 'close_cover', HA_ENTITIES.curtains as unknown as string[])
        break
      case 'sleep':
        // 睡眠：关所有灯、关窗帘
        call('light', 'turn_off', HA_ENTITIES.lights as unknown as string[])
        call('cover', 'close_cover', HA_ENTITIES.curtains as unknown as string[])
        break
      case 'dining':
        // 用餐：开吊灯
        call('light', 'turn_on', ['light.diao_deng'])
        call('light', 'turn_off', ['light.ke_ting_san_jian_deng_guang', 'light.ke_ting_san_jian_deng_guang_2'])
        break
      case 'all_off':
        // 全关
        call('light', 'turn_off', HA_ENTITIES.lights as unknown as string[])
        call('switch', 'turn_off', [HA_ENTITIES.airPurifier])
        call('cover', 'close_cover', HA_ENTITIES.curtains as unknown as string[])
        ;(HA_ENTITIES.climate as unknown as string[]).forEach((id) =>
          batch.push(haFetch('/api/services/climate/turn_off', 'POST', { entity_id: id }))
        )
        break
    }

    await Promise.allSettled(batch)
    if (websocket.wsState.value !== 'authenticated') {
      await loadHaStates()
    }
  }

  /* ---- media player controls ---- */
  async function mediaPlayPause(entityId?: string) {
    const id = entityId ?? primaryMediaPlayer.value?.entity_id
    if (!id) return
    await callService('media_player', 'media_play_pause', id)
  }

  async function mediaNext(entityId?: string) {
    const id = entityId ?? primaryMediaPlayer.value?.entity_id
    if (!id) return
    await callService('media_player', 'media_next_track', id)
  }

  async function mediaPrev(entityId?: string) {
    const id = entityId ?? primaryMediaPlayer.value?.entity_id
    if (!id) return
    await callService('media_player', 'media_previous_track', id)
  }

  async function mediaSetVolume(volume: number, entityId?: string) {
    const id = entityId ?? primaryMediaPlayer.value?.entity_id
    if (!id) return
    await haFetch('/api/services/media_player/volume_set', 'POST', {
      entity_id: id,
      volume_level: Math.max(0, Math.min(1, volume)),
    })
  }

  /* ---- computed ---- */
  const lightsOnCount = computed(() => allLights.value.filter((i) => i.state === 'on').length)
  const curtainOpenCount = computed(() => allCurtains.value.filter((i) => i.state === 'open').length)
  const primaryClimate = computed(() => climateList.value[0] ?? null)
  const primaryFan = computed(() => fanList.value[0] ?? null)
  const climateText = computed(() => primaryClimate.value?.attributes.friendly_name ?? '空调')
  const climateMode = computed(() => primaryClimate.value?.state ?? 'unknown')
  const climateTemp = computed(() => primaryClimate.value?.attributes.temperature ?? primaryClimate.value?.attributes.current_temperature ?? '--')
  const weatherText = computed(() => weather.value?.attributes?.friendly_name ?? '天气')

  const todayForecast = computed(() => forecast.value[0] ?? null)
  const envTemp = computed(() => envSensors.value.indoorTemp?.state ?? '--')
  const envHumidity = computed(() => envSensors.value.indoorHumidity?.state ?? '--')
  const envPm25 = computed(() => envSensors.value.indoorPm25?.state ?? '--')

  /** AQI level based on PM2.5 */
  const aqiLevel = computed(() => {
    const v = parseFloat(envPm25.value)
    if (isNaN(v)) return 'unknown'
    if (v <= 35) return 'good'
    if (v <= 75) return 'moderate'
    if (v <= 115) return 'warn'
    return 'bad'
  })
  const aqiText = computed(() => {
    const labels: Record<string, string> = {
      unknown: '未知',
      good: '优',
      moderate: '良',
      warn: '敏感人群注意',
      bad: '较差',
    }
    return labels[aqiLevel.value] ?? aqiLevel.value
  })

  const homeMode = computed(() => person.value?.state === 'home' ? '在家' : '离家')
  const homeSecurity = computed(() => {
    const state = lockArmedState.value?.state ?? 'unknown'
    const labels: Record<string, string> = {
      off: '已撤防',
      on: '已布防',
      unavailable: '离线',
      unknown: '未知',
    }
    return labels[state] ?? state
  })
  const homeLock = computed(() => {
    const state = lockDoorState.value?.state ?? 'unknown'
    const labels: Record<string, string> = {
      stuck: '已上锁',
      locked: '已上锁',
      unlocked: '未上锁',
      open: '门已开',
      close: '门已关',
      unavailable: '离线',
      unknown: '未知',
    }
    return labels[state] ?? state
  })
  const lockBatteryLevel = computed(() => lockBattery.value?.state ?? '--')

  const primaryMediaPlayer = computed(() => {
    return mediaPlayers.value.find((player) => ['playing', 'paused'].includes(player.state))
      ?? mediaPlayers.value[0]
      ?? null
  })
  const currentPlayer = computed(() => primaryMediaPlayer.value?.attributes.friendly_name ?? '逆子')
  const mediaTitle = computed(() => primaryMediaPlayer.value?.attributes.media_title ?? '')
  const mediaArtist = computed(() => primaryMediaPlayer.value?.attributes.media_artist ?? '')
  const mediaVolume = computed(() => primaryMediaPlayer.value?.attributes.volume_level ?? 0)
  const mediaState = computed(() => primaryMediaPlayer.value?.state ?? 'unknown')

  const vacuumState = computed(() => vacuum.value?.state ?? 'unknown')
  const vacuumBattery = computed(() => vacuum.value?.attributes.battery_level ?? '--')
  const vacuumName = computed(() => vacuum.value?.attributes.friendly_name ?? '扫地机')

  /* weather dialog */
  const wxState = computed(() => weather.value?.state ?? '')
  const wxStateLabel = computed(() => {
    const labels: Record<string, string> = {
      'clear-night': '晴夜',
      cloudy: '多云',
      fog: '有雾',
      hail: '冰雹',
      lightning: '雷暴',
      'lightning-rainy': '雷雨',
      partlycloudy: '晴间多云',
      pouring: '暴雨',
      rainy: '下雨',
      snowy: '下雪',
      'snowy-rainy': '雨夹雪',
      sunny: '晴朗',
      windy: '有风',
      'windy-variant': '大风',
      exceptional: '异常天气',
      unknown: '未知',
    }
    return labels[wxState.value] ?? wxState.value
  })
  const wxTemp = computed(() => weather.value?.attributes?.temperature ?? '--')
  const wxHigh = computed(() => todayForecast.value?.temperature ?? '--')
  const wxLow = computed(() => todayForecast.value?.templow ?? '--')
  const wxFeels = computed(() => weather.value?.attributes?.apparent_temperature ?? '--')
  const wxHum = computed(() => weather.value?.attributes?.humidity ?? '--')
  const wxWind = computed(() => weather.value?.attributes?.wind_bearing ?? '')
  const wxWindSpeed = computed(() => weather.value?.attributes?.wind_speed ?? '--')
  const wxPressure = computed(() => weather.value?.attributes?.pressure ?? '--')
  const wxVis = computed(() => weather.value?.attributes?.visibility ?? '--')
  const wxDew = computed(() => weather.value?.attributes?.dew_point ?? '--')
  const wxCloud = computed(() => weather.value?.attributes?.cloud_coverage ?? '--')
  const wxUnit = computed(() => weather.value?.attributes?.temperature_unit ?? '°C')

  return {
    loading, errorText,
    allLights, allCurtains, climateList, fanList, airPurifier,
    weather, forecast, envSensors, person, vacuum,
    lockDoorState, lockArmedState, lockBattery, mediaPlayers,
    loadHaStates, toggleEntity, callService, activateScene,
    setLightBrightness, setCoverPosition, stopCover, setClimateTemp, setClimateMode, setClimateSwingMode, setFanPct, setFanMode,
    startWebSocket, stopWebSocket, wsState: websocket.wsState,
    lightsOnCount, curtainOpenCount,
    primaryClimate, primaryFan, climateText, climateMode, climateTemp,
    weatherText, envTemp, envHumidity, envPm25, aqiLevel, aqiText,
    homeMode, homeSecurity, homeLock, lockBatteryLevel,
    primaryMediaPlayer, currentPlayer, mediaTitle, mediaArtist, mediaVolume, mediaState,
    mediaPlayPause, mediaNext, mediaPrev, mediaSetVolume,
    vacuumState, vacuumBattery, vacuumName,
    wxState, wxStateLabel, wxTemp, wxHigh, wxLow, wxFeels, wxHum, wxWind, wxWindSpeed,
    wxPressure, wxVis, wxDew, wxCloud, wxUnit,
  }
}
