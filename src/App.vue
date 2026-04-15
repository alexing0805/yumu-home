<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { WEEKDAY_NAMES, type PanelKey, type ThemeMode } from './config'
import { useHa } from './composables/useHa'
import StatusBar from './components/StatusBar.vue'
import ContentGrid from './components/ContentGrid.vue'
import PlayerBar from './components/PlayerBar.vue'
import DetailDialog from './components/DetailDialog.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import WeatherDialog from './components/WeatherDialog.vue'

function loadStoredString(key: string, fallback: string) {
  const val = localStorage.getItem(key)
  if (val === null) return fallback

  try {
    const parsed = JSON.parse(val)
    return typeof parsed === 'string' ? parsed : fallback
  } catch {
    return val
  }
}

const HA_BASE = loadStoredString('yumu.haBase', import.meta.env.VITE_HA_BASE || '/ha-api')
const HA_TOKEN = loadStoredString('yumu.haToken', import.meta.env.VITE_HA_TOKEN || '')

const now = ref(new Date())
const theme = ref<ThemeMode>('charcoal')
const use24Hour = ref(true)
const motionEnabled = ref(true)
const activeScene = ref<string>('cinema')
const activePanel = ref<PanelKey | null>(null)
const dialogMode = ref<'panel' | 'settings' | null>(null)

const cardRect = ref({ x: 0, y: 0, w: 0, h: 0 })
const liftPanel = ref<PanelKey | null>(null)
const screenDimmed = ref(false)

const haBaseKey = ref(HA_BASE)
const haTokenKey = ref(HA_TOKEN)

const ha = useHa(() => haBaseKey.value, () => haTokenKey.value)

function loadPref<T>(key: string, def: T): T {
  const val = localStorage.getItem(key)
  if (val === null) return def

  try {
    return JSON.parse(val) as T
  } catch {
    return typeof def === 'string' ? (val as T) : def
  }
}

function savePref(key: string, val: any) {
  localStorage.setItem(key, JSON.stringify(val))
}

const formattedTime = computed(() => {
  return now.value.toLocaleTimeString('en-US', {
    hour12: !use24Hour.value,
    hour: 'numeric',
    minute: '2-digit',
  }).replace(' AM', '').replace(' PM', '')
})

const formattedDate = computed(() => {
  const d = now.value
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`
})

const resolvedTheme = computed(() => {
  if (theme.value === 'auto') {
    const hr = now.value.getHours()
    return hr >= 6 && hr < 18 ? 'warm' : 'charcoal'
  }
  return theme.value
})

const detailState = computed(() => {
  switch (activePanel.value) {
    case 'lights': return { eyebrow: '灯光控制', title: '灯光', summary: '点击下方开关控制各区域灯光。', items: ha.allLights.value }
    case 'curtains': return { eyebrow: '窗帘控制', title: '窗帘', summary: '可快速开关、停止或拖动到指定开合度。', items: ha.allCurtains.value }
    case 'climate': return { eyebrow: '空调与新风', title: '空调与新风', summary: '每个区域的空调与新风已合并在同一张控制卡内。', items: [...ha.climateList.value, ...ha.fanList.value] }
    case 'air': return { eyebrow: '室内环境', title: '室内环境详情', summary: '查看室内外温湿度、空气质量等实时数据。', items: Object.values(ha.envSensors.value).filter(Boolean) as any[] }
    case 'music': return { eyebrow: '媒体播放', title: '媒体播放器', summary: '这里展示当前活跃播放器，并支持直接控制。', items: ha.mediaPlayers.value }
    case 'summary': return { eyebrow: '家庭状态', title: '安防设备', summary: '集中查看人员、门锁、安防和扫地机状态。', items: [ha.person.value, ha.lockDoorState.value, ha.lockArmedState.value, ha.lockBattery.value, ha.vacuum.value].filter(Boolean) as any[] }
    default: return null
  }
})

let clockTimer: number | null = null
let clockAlignTimer: number | null = null
let refreshTimer: number
let idleTimer: ReturnType<typeof setTimeout>
let retryTimer: number | null = null

function syncClock() {
  now.value = new Date()
}

function startClock() {
  syncClock()

  const delay = 60000 - (Date.now() % 60000)
  clockAlignTimer = window.setTimeout(() => {
    syncClock()
    clockTimer = window.setInterval(syncClock, 60000)
    clockAlignTimer = null
  }, delay)
}

function resetIdle() {
  screenDimmed.value = false
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { screenDimmed.value = true }, 5 * 60 * 1000)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeOverlays()
  resetIdle()
}

function onActivity() {
  resetIdle()
}

onMounted(() => {
  theme.value = loadPref<ThemeMode>('yumu.theme', theme.value)
  use24Hour.value = loadPref<boolean>('yumu.clock24', use24Hour.value)
  motionEnabled.value = loadPref<boolean>('yumu.motion', motionEnabled.value)

  void handleRetry()
  startClock()
  refreshTimer = window.setInterval(ha.loadHaStates, 60000)

  window.addEventListener('keydown', onKeydown)
  window.addEventListener('pointerdown', onActivity)
  window.addEventListener('pointermove', onActivity)
  resetIdle()
})

onBeforeUnmount(() => {
  if (clockTimer !== null) window.clearInterval(clockTimer)
  if (clockAlignTimer !== null) window.clearTimeout(clockAlignTimer)
  window.clearInterval(refreshTimer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pointerdown', onActivity)
  window.removeEventListener('pointermove', onActivity)
  if (retryTimer !== null) window.clearTimeout(retryTimer)
  clearTimeout(idleTimer)
  ha.stopWebSocket()
})

function openPanel(panel: PanelKey, e?: MouseEvent) {
  dialogMode.value = 'panel'
  if (e) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    cardRect.value = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      w: rect.width,
      h: rect.height,
    }
  }
  liftPanel.value = panel
  window.setTimeout(() => { activePanel.value = panel }, 120)
}
function openSettings() { dialogMode.value = 'settings'; activePanel.value = null; liftPanel.value = null }
function closeOverlays() {
  activePanel.value = null
  dialogMode.value = null
  const p = liftPanel.value
  if (p) { window.setTimeout(() => { liftPanel.value = null }, 220) }
}

async function handleSetScene(id: string) {
  activeScene.value = id
  await ha.activateScene(id)
}

async function handleRetry() {
  ha.stopWebSocket()
  await ha.loadHaStates()
  if (!ha.errorText.value) {
    ha.startWebSocket()
  }
}

function queueRetry() {
  if (retryTimer !== null) window.clearTimeout(retryTimer)
  retryTimer = window.setTimeout(() => {
    retryTimer = null
    void handleRetry()
  }, 0)
}

function setHaBase(v: string) { haBaseKey.value = v; savePref('yumu.haBase', v); queueRetry() }
function setHaToken(v: string) { haTokenKey.value = v; savePref('yumu.haToken', v); queueRetry() }

function cycleTheme() {
  const modes: ThemeMode[] = ['charcoal', 'warm', 'auto']
  theme.value = modes[(modes.indexOf(theme.value) + 1) % modes.length]
  savePref('yumu.theme', theme.value)
}

function toggleClock() { use24Hour.value = !use24Hour.value; savePref('yumu.clock24', use24Hour.value) }
function toggleMotion() { motionEnabled.value = !motionEnabled.value; savePref('yumu.motion', motionEnabled.value) }

</script>

<template>
  <div
    class="app-shell"
    :class="[
      `theme-${resolvedTheme}`,
      { 'has-overlay': !!dialogMode || !!liftPanel, 'reduced-motion': !motionEnabled },
    ]"
  >
    <Transition name="overlay-fade">
      <div v-if="screenDimmed" class="screen-saver" @click="resetIdle" @pointermove="resetIdle">
        <div class="saver-time">{{ formattedTime }}</div>
        <div class="saver-date">{{ formattedDate }}</div>
      </div>
    </Transition>

    <div class="panel-shell">
      <StatusBar
        :formatted-time="formattedTime"
        :formatted-date="formattedDate"
        :loading="ha.loading.value"
        :error-text="ha.errorText.value"
        :weather-text="ha.weatherText.value"
        :wx-state="ha.wxState.value"
        :wx-state-label="ha.wxStateLabel.value"
        :wx-temp="ha.wxTemp.value"
        :wx-high="ha.wxHigh.value"
        :wx-low="ha.wxLow.value"
        :wx-unit="ha.wxUnit.value"
        :env-pm25="ha.envPm25.value"
        :aqi-level="ha.aqiLevel.value"
        :aqi-text="ha.aqiText.value"
        :ws-connected="ha.wsState.value === 'authenticated'"
        :lift-panel="liftPanel"
        @open-panel="openPanel"
        @open-settings="openSettings"
        @retry="handleRetry"
      />

      <ContentGrid
        :climates="ha.climateList.value"
        :fans="ha.fanList.value"
        :lights="ha.allLights.value"
        :curtains="ha.allCurtains.value"
        :env-temp="ha.envTemp.value"
        :env-humidity="ha.envHumidity.value"
        :env-pm25="ha.envPm25.value"
        :home-mode="ha.homeMode.value"
        :home-security="ha.homeSecurity.value"
        :home-lock="ha.homeLock.value"
        :lock-battery="ha.lockBatteryLevel.value"
        :vacuum-state="ha.vacuumState.value"
        :vacuum-name="ha.vacuumName.value"
        :vacuum-battery="ha.vacuumBattery.value"
        :active-scene="activeScene"
        :lift-panel="liftPanel"
        @open-panel="openPanel"
        @set-scene="handleSetScene"
      />

      <PlayerBar
        :current-player="ha.currentPlayer.value"
        :player-state="ha.mediaState.value"
        :media-title="ha.mediaTitle.value"
        :media-artist="ha.mediaArtist.value"
        :media-volume="ha.mediaVolume.value"
        :lift-panel="liftPanel"
        @open-panel="openPanel"
        @play-pause="ha.mediaPlayPause()"
        @next="ha.mediaNext()"
        @prev="ha.mediaPrev()"
        @set-volume="ha.mediaSetVolume($event)"
      />
    </div>

    <!-- ===== Dialogs ===== -->
    <Transition name="overlay-fade">
      <div v-if="dialogMode" class="dialog-overlay" @click.self="closeOverlays">
        <Transition name="panel-pop" appear>
          <WeatherDialog
            v-if="dialogMode === 'panel' && activePanel === 'weather'"
            eyebrow="天气详情"
            title="天气"
            :weather-text="ha.weatherText.value"
            :wx-state="ha.wxState.value"
            :wx-state-label="ha.wxStateLabel.value"
            :wx-temp="ha.wxTemp.value"
            :wx-feels="ha.wxFeels.value"
            :wx-hum="ha.wxHum.value"
            :wx-wind="ha.wxWind.value"
            :wx-wind-speed="ha.wxWindSpeed.value"
            :wx-pressure="ha.wxPressure.value"
            :wx-vis="ha.wxVis.value"
            :wx-dew="ha.wxDew.value"
            :wx-cloud="ha.wxCloud.value"
            :wx-unit="ha.wxUnit.value"
            :forecast="ha.forecast.value"
            @close="closeOverlays"
          />

          <DetailDialog
            v-else-if="dialogMode === 'panel' && detailState && activePanel !== 'weather'"
            :active-panel="activePanel!"
            :eyebrow="detailState.eyebrow"
            :title="detailState.title"
            :summary="detailState.summary"
            :items="detailState.items"
            @close="closeOverlays"
            @toggle="ha.toggleEntity($event)"
            @set-light-brightness="ha.setLightBrightness"
            @set-cover-position="ha.setCoverPosition"
            @stop-cover="ha.stopCover"
            @set-climate-temp="ha.setClimateTemp"
            @set-climate-mode="ha.setClimateMode"
            @set-climate-swing-mode="ha.setClimateSwingMode"
            @set-fan-pct="ha.setFanPct"
            @set-fan-mode="ha.setFanMode"
          />

          <SettingsDialog
            v-else-if="dialogMode === 'settings'"
            :theme="theme"
            :use24-hour="use24Hour"
            :motion-enabled="motionEnabled"
            :ha-base="haBaseKey"
            :ha-token="haTokenKey"
            @close="closeOverlays"
            @cycle-theme="cycleTheme"
            @toggle-clock="toggleClock"
            @toggle-motion="toggleMotion"
            @set-ha-base="setHaBase"
            @set-ha-token="setHaToken"
          />
        </Transition>
      </div>
    </Transition>
  </div>
</template>
