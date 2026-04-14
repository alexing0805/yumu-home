<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type ThemeMode = 'warm' | 'charcoal' | 'auto'
type PanelKey = 'weather' | 'climate' | 'lights' | 'curtains' | 'air' | 'summary' | 'music'
type SceneId = 'home' | 'away' | 'cinema' | 'sleep' | 'dining' | 'all_off'

type HaState = {
  entity_id: string
  state: string
  attributes: Record<string, any>
}

type ForecastDay = {
  datetime: string
  condition: string
  text: string
  temperature: number
  templow: number
}

const HA_BASE = '/ha-api'
const HA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI3NzBlNzM5ZTRmOWM0YmQwOTg4ODI3NDExOTY4ZWZmNiIsImlhdCI6MTc3NDcxMDMyNiwiZXhwIjoyMDkwMDcwMzI2fQ.QV9Wy0LnlDXTO88B6e0TD1gCg48Fwkb3ryHbOH7Jcpo'

const now = ref(new Date())
const theme = ref<ThemeMode>('charcoal')
const use24Hour = ref(true)
const motionEnabled = ref(true)
const activeScene = ref<SceneId>('cinema')
const activePanel = ref<PanelKey | null>(null)
const settingsOpen = ref(false)
const cardRect = ref({ x: 0, y: 0, w: 0, h: 0 })
const liftPanel = ref<PanelKey | null>(null)
const selectedPlayer = ref('逆子')
const loading = ref(true)
const errorText = ref('')

const lights = ref<HaState[]>([])
const curtains = ref<HaState[]>([])
const climate = ref<HaState | null>(null)
const fan = ref<HaState | null>(null)
const weather = ref<HaState | null>(null)
const forecast = ref<ForecastDay[]>([])
const envSensors = ref<HaState[]>([])
const person = ref<HaState | null>(null)
const lock = ref<HaState | null>(null)
const mediaPlayer = ref<HaState | null>(null)

const HA = {
  lights: ['light.diao_deng', 'light.ke_ting_san_jian_deng_guang', 'light.ke_ting_san_jian_deng_guang_2', 'light.wo_shi_ye_deng'],
  curtains: ['cover.dooya_cn_249100562_m1_s_2_curtain', 'cover.dooya_cn_249099499_m1_s_2_curtain', 'cover.wo_shi_chuang_lian'],
  climate: ['climate.xiaomi_cn_696935666_m28', 'climate.xiaomi_cn_584691492_c20'],
  fan: ['switch.zhimi_cn_685334223_rma3_on_p_2_1'],
  weather: ['weather.he_feng_tian_qi'],
  env: [
    'sensor.miaomiaoc_cn_blt_3_18f9a6nrs5c00_t1_temperature_p_2_1',
    'sensor.miaomiaoc_cn_blt_3_18f9a6nrs5c00_t1_relative_humidity_p_2_2',
    'sensor.zhimi_cn_685334223_rma3_pm2_5_density_p_3_4',
    'sensor.zhimi_cn_685334223_rma3_temperature_p_3_7',
    'sensor.zhimi_cn_685334223_rma3_relative_humidity_p_3_1',
    'sensor.heweather_heweather_temperature_123_3258_41_7500',
    'sensor.heweather_heweather_humidity_123_3258_41_7500',
    'sensor.heweather_heweather_pm25_123_3258_41_7500',
  ],
  person: ['person.alex'],
  lock: ['sensor.lumi_wbmcn1_3826_door_state', 'binary_sensor.lumi_wbmcn1_3826_armed_state'],
  mediaPlayer: ['media_player.xiaomi_cn_425911845_lx06', 'media_player.home_assistant_voice_091502_media_player'],
}

const sceneLabels = [
  { id: 'home', label: 'Back Home' },
  { id: 'away', label: 'Leave Home' },
  { id: 'cinema', label: 'Movie Night' },
  { id: 'sleep', label: 'Bedtime' },
  { id: 'dining', label: 'Dining' },
  { id: 'all_off', label: 'All Off' },
] as const

const weatherIcon: Record<string, string> = {
  'clear-night': '🌙', 'cloudy': '☁️', 'fog': '🌫️', 'hail': '🌨️',
  'lightning': '⛈️', 'lightning-rainy': '⛈️', 'partlycloudy': '⛅',
  'pouring': '🌧️', 'rainy': '🌧️', 'snowy': '❄️', 'snowy-rainy': '🌨️',
  'sunny': '☀️', 'windy': '💨', 'windy-variant': '💨', 'exceptional': '⚠️',
}

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function loadPref<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function savePref(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

async function haFetch(path: string, method = 'GET') {
  const res = await fetch(`${HA_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`HA ${res.status}`)
  return res.json()
}

async function loadHaStates() {
  try {
    loading.value = true
    errorText.value = ''
    const all: HaState[] = await haFetch('/api/states')
    const pick = (ids: string[]) => all.filter((x) => ids.includes(x.entity_id))
    lights.value = pick(HA.lights)
    curtains.value = pick(HA.curtains)
    climate.value = all.find((x) => HA.climate.includes(x.entity_id)) ?? null
    fan.value = all.find((x) => HA.fan.includes(x.entity_id)) ?? null
    weather.value = all.find((x) => HA.weather.includes(x.entity_id)) ?? null
    envSensors.value = pick(HA.env)
    person.value = all.find((x) => HA.person.includes(x.entity_id)) ?? null
    lock.value = all.find((x) => HA.lock.includes(x.entity_id)) ?? null
    mediaPlayer.value = all.find((x) => HA.mediaPlayer.includes(x.entity_id)) ?? null
    // 拉取7天预报
    await loadForecast()
  } catch (e: any) {
    errorText.value = e?.message ?? 'HA 连接失败'
  } finally {
    loading.value = false
  }
}

async function loadForecast() {
  try {
    const res = await fetch(`${HA_BASE}/api/services/weather/get_forecasts?return_response`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: 'weather.he_feng_tian_qi', type: 'daily' }),
    })
    if (!res.ok) return
    const data = await res.json()
    const resp = data.service_response ?? {}
    const entry = resp['weather.he_feng_tian_qi']
    if (entry?.forecast) {
      forecast.value = entry.forecast.slice(0, 7)
    }
  } catch { /* ignore */ }
}

// ---- Computed ----
const resolvedTheme = computed(() => {
  if (theme.value !== 'auto') return theme.value
  if (typeof window === 'undefined') return 'charcoal'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'charcoal' : 'warm'
})
const formattedTime = computed(() => {
  const h = now.value.getHours(), m = now.value.getMinutes().toString().padStart(2, '0')
  if (use24Hour.value) return `${h.toString().padStart(2, '0')}:${m}`
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
})
const formattedDate = computed(() => now.value.toLocaleString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }))
const lightsOnCount = computed(() => lights.value.filter((i) => i.state === 'on').length)
const curtainOpenCount = computed(() => curtains.value.filter((i) => i.state === 'open').length)
const climateText = computed(() => climate.value?.attributes.friendly_name ?? '空调')
const climateMode = computed(() => climate.value?.state ?? 'unknown')
const climateTemp = computed(() => climate.value?.attributes.temperature ?? climate.value?.attributes.current_temperature ?? '--')
const weatherText = computed(() => weather.value?.attributes?.friendly_name ?? '天气')
const envTemp = computed(() => { const s = envSensors.value.find((x) => x.entity_id.includes('temperature')); return s?.state ?? '--' })
const envHumidity = computed(() => { const s = envSensors.value.find((x) => x.entity_id.includes('relative_humidity') || x.entity_id.includes('humidity')); return s?.state ?? '--' })
const envPm25 = computed(() => { const s = envSensors.value.find((x) => x.entity_id.includes('pm2_5')); return s?.state ?? '--' })
const homeMode = computed(() => person.value?.state === 'home' ? 'Occupied' : 'Away')
const homeSecurity = computed(() => lock.value?.state === 'off' ? 'Disarmed' : lock.value?.state ?? 'Unknown')
const homeLock = computed(() => lock.value?.state === 'stuck' ? 'Locked' : 'Unknown')
const currentPlayer = computed(() => mediaPlayer.value?.attributes.friendly_name ?? selectedPlayer.value)
const dialogMode = computed(() => (settingsOpen.value ? 'settings' : activePanel.value ? 'panel' : null))
const detailState = computed(() => {
  if (!activePanel.value) return null
  if (activePanel.value === 'lights') return { title: '灯光', eyebrow: 'Lights', summary: `On: ${lightsOnCount.value}/${lights.value.length}`, items: lights.value }
  if (activePanel.value === 'curtains') return { title: '窗帘', eyebrow: 'Curtains', summary: `Open: ${curtainOpenCount.value}/${curtains.value.length}`, items: curtains.value }
  if (activePanel.value === 'climate') return { title: '空调 / 风机', eyebrow: 'Climate', summary: `${climateText.value} · ${climateMode.value}`, items: [climate.value, fan.value].filter(Boolean) }
  if (activePanel.value === 'air') return { title: '室内环境', eyebrow: 'Environment', summary: `${envTemp.value}°C · ${envHumidity.value}% · PM2.5 ${envPm25.value}`, items: envSensors.value }
  if (activePanel.value === 'summary') return { title: '家庭状态', eyebrow: 'Home', summary: `${homeMode.value} · ${homeSecurity.value} · ${homeLock.value}`, items: [person.value, lock.value].filter(Boolean) }
  if (activePanel.value === 'weather') return { title: '天气', eyebrow: 'Weather', summary: `${weatherText.value}`, items: [] }
  return null
})

// 天弹窗里用的属性
const wxState = computed(() => weather.value?.state ?? '')
const wxTemp = computed(() => weather.value?.attributes?.temperature ?? '--')
const wxFeels = computed(() => weather.value?.attributes?.apparent_temperature ?? '--')
const wxHum = computed(() => weather.value?.attributes?.humidity ?? '--')
const wxWind = computed(() => weather.value?.attributes?.wind_bearing ?? '')
const wxWindSpeed = computed(() => weather.value?.attributes?.wind_speed ?? '--')
const wxPressure = computed(() => weather.value?.attributes?.pressure ?? '--')
const wxVis = computed(() => weather.value?.attributes?.visibility ?? '--')
const wxDew = computed(() => weather.value?.attributes?.dew_point ?? '--')
const wxCloud = computed(() => weather.value?.attributes?.cloud_coverage ?? '--')
const wxUnit = computed(() => weather.value?.attributes?.temperature_unit ?? '°C')

function openPanel(panel: PanelKey, e?: MouseEvent) {
  settingsOpen.value = false
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
  window.setTimeout(() => {
    activePanel.value = panel
  }, 120)
}
function openSettings() { activePanel.value = null; settingsOpen.value = true }
function closeOverlays() {
  activePanel.value = null
  settingsOpen.value = false
  const p = liftPanel.value
  if (p) {
    window.setTimeout(() => {
      liftPanel.value = null
    }, 220)
  }
}

async function toggleEntity(entityId: string) {
  const cur = lights.value.find((x) => x.entity_id === entityId) ?? curtains.value.find((x) => x.entity_id === entityId)
  if (!cur) return
  const domain = entityId.split('.')[0]
  const service = domain === 'light' ? (cur.state === 'on' ? 'turn_off' : 'turn_on') : (cur.state === 'open' ? 'close_cover' : 'open_cover')
  await fetch(`${HA_BASE}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId }),
  })
  await loadHaStates()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return '今天'
  return `${d.getMonth() + 1}/${d.getDate()} ${weekdayNames[d.getDay()]}`
}

onMounted(() => {
  theme.value = loadPref<ThemeMode>('yumu.theme', theme.value)
  use24Hour.value = loadPref<boolean>('yumu.clock24', use24Hour.value)
  motionEnabled.value = loadPref<boolean>('yumu.motion', motionEnabled.value)
  loadHaStates()
  const clock = window.setInterval(() => { now.value = new Date() }, 1000)
  const refresh = window.setInterval(loadHaStates, 15000)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays() })
  onBeforeUnmount(() => { window.clearInterval(clock); window.clearInterval(refresh) })
})
</script>

<template>
  <div class="app-shell" :class="[`theme-${resolvedTheme}`, { 'has-overlay': !!dialogMode || !!liftPanel, 'reduced-motion': !motionEnabled }]">
    <div class="panel-shell">
      <header class="status-bar">
        <div class="time-cluster">
          <div class="time-main">{{ formattedTime }}</div>
          <div class="date-stack">
            <span>{{ formattedDate }}</span>
            <span v-if="loading">正在连接 HA...</span>
            <span v-else-if="errorText">{{ errorText }}</span>
          </div>
        </div>
        <button :class="['status-chip', 'weather-chip', { 'card-lifted': liftPanel === 'weather' }]" @click="openPanel('weather', $event)">
          <span class="status-copy">
            <strong>{{ weatherText }}</strong>
            <small>{{ wxState }} {{ wxTemp }}{{ wxUnit }}</small>
          </span>
        </button>
        <div class="status-chip aqi-chip good">
          <span class="status-copy align-right">
            <strong>空气</strong>
            <small>{{ envPm25 }} PM2.5</small>
          </span>
        </div>
        <button class="settings-trigger" @click="openSettings">⚙</button>
      </header>

      <section class="content-grid">
        <button :class="['card', 'ac-card', { 'card-lifted': liftPanel === 'climate' }]" @click="openPanel('climate', $event)">
          <div class="card-label">空调 / 风机</div>
          <div class="ac-header">
            <div>
              <div class="ac-title">{{ climateText }}</div>
              <div class="card-copy">{{ climateMode }}</div>
              <div class="card-copy">风机: {{ fan?.state ?? 'unknown' }}</div>
            </div>
          </div>
          <div class="ac-temps">
            <div class="temp-block"><strong>{{ climateTemp }}°C</strong></div>
            <div class="temp-block current"><strong>{{ envTemp }}°C</strong></div>
          </div>
        </button>

        <section class="card scene-card">
          <div class="card-label">场景</div>
          <div class="scene-grid">
            <button v-for="scene in sceneLabels" :key="scene.id" class="scene-item" @click="activeScene = scene.id">{{ scene.label }}</button>
          </div>
        </section>

        <button :class="['card', 'summary-card', 'light-card', { 'card-lifted': liftPanel === 'lights' }]" @click="openPanel('lights', $event)">
          <div class="card-label">灯光</div>
          <div class="summary-value">On: {{ lightsOnCount }}/{{ lights.length }}</div>
          <div class="card-copy">{{ lights.map((x) => x.attributes.friendly_name).join('，') }}</div>
        </button>

        <button :class="['card', 'summary-card', 'curtain-card', { 'card-lifted': liftPanel === 'curtains' }]" @click="openPanel('curtains', $event)">
          <div class="card-label">窗帘</div>
          <div class="summary-value">Open: {{ curtainOpenCount }}/{{ curtains.length }}</div>
          <div class="card-copy">{{ curtains.map((x) => x.attributes.friendly_name).join('，') }}</div>
        </button>

        <button :class="['card', 'summary-card', 'env-card', { 'card-lifted': liftPanel === 'air' }]" @click="openPanel('air', $event)">
          <div class="card-label">室内环境</div>
          <div class="env-line">
            <span>Temp</span><strong>{{ envTemp }}°C</strong>
            <span>Hum</span><strong>{{ envHumidity }}%</strong>
            <span>PM2.5</span><strong>{{ envPm25 }}</strong>
          </div>
        </button>

        <button :class="['card', 'summary-card', 'family-card', { 'card-lifted': liftPanel === 'summary' }]" @click="openPanel('summary', $event)">
          <div class="card-label">家庭状态</div>
          <div class="family-grid">
            <div><span>Presence:</span><strong>{{ homeMode }}</strong></div>
            <div><span>Security:</span><strong>{{ homeSecurity }}</strong></div>
            <div><span>Locks:</span><strong>{{ homeLock }}</strong></div>
          </div>
        </button>
      </section>

      <footer :class="['player-bar', { 'card-lifted': liftPanel === 'music' }]" @click="openPanel('music', $event)">
        <div class="player-meta">
          <div class="player-heading">音箱</div>
          <div class="player-texts">
            <strong>{{ currentPlayer }}</strong>
            <span>{{ mediaPlayer?.state ?? 'unknown' }}</span>
          </div>
        </div>
      </footer>
    </div>

    <!-- ===== Dialogs ===== -->
    <Transition name="overlay-fade">
      <div v-if="dialogMode" class="dialog-overlay" @click.self="closeOverlays">
        <Transition name="panel-pop" appear>

          <!-- ===== Weather Dialog ===== -->
          <section v-if="dialogMode === 'panel' && activePanel === 'weather' && detailState" class="dialog-card bg-dark">
            <header class="dialog-header">
              <div>
                <div class="dialog-eyebrow">{{ detailState.eyebrow }}</div>
                <h3>{{ detailState.title }}</h3>
              </div>
              <button class="close-button" @click="closeOverlays">关闭</button>
            </header>
            <p class="dialog-summary">{{ weatherText }} · {{ wxState }}</p>

            <!-- 当前天气 -->
            <div class="wx-current">
              <div class="wx-big-temp">
                <span class="wx-icon">{{ weatherIcon[wxState] || '🌤️' }}</span>
                <strong>{{ wxTemp }}{{ wxUnit }}</strong>
              </div>
              <div class="wx-meta-grid">
                <div class="wx-meta-item"><span>体感</span><strong>{{ wxFeels }}{{ wxUnit }}</strong></div>
                <div class="wx-meta-item"><span>湿度</span><strong>{{ wxHum }}%</strong></div>
                <div class="wx-meta-item"><span>风</span><strong>{{ wxWind }} {{ wxWindSpeed }} km/h</strong></div>
                <div class="wx-meta-item"><span>气压</span><strong>{{ wxPressure }} hPa</strong></div>
                <div class="wx-meta-item"><span>能见度</span><strong>{{ wxVis }} km</strong></div>
                <div class="wx-meta-item"><span>云量</span><strong>{{ wxCloud }}%</strong></div>
                <div class="wx-meta-item"><span>露点</span><strong>{{ wxDew }}{{ wxUnit }}</strong></div>
              </div>
            </div>

            <!-- 7天预报 -->
            <div class="wx-forecast" v-if="forecast.length">
              <div class="wx-forecast-title">未来7天</div>
              <div class="wx-forecast-list">
                <div v-for="day in forecast" :key="day.datetime" class="wx-forecast-row">
                  <span class="wx-fc-day">{{ fmtDate(day.datetime) }}</span>
                  <span class="wx-fc-icon">{{ weatherIcon[day.condition] || '🌤️' }}</span>
                  <span class="wx-fc-text">{{ day.text }}</span>
                  <span class="wx-fc-temps">
                    <strong>{{ day.temperature }}°</strong>
                    <span class="wx-fc-low">{{ day.templow }}°</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== Generic Dialog ===== -->
          <section v-else-if="dialogMode === 'panel' && detailState" :class="['dialog-card', 'dialog-' + activePanel, activePanel === 'lights' ? 'bg-light' : activePanel === 'curtains' ? 'bg-dark' : activePanel === 'climate' ? 'bg-main' : activePanel === 'air' ? 'bg-main' : activePanel === 'summary' ? 'bg-green' : 'bg-main']">
            <header class="dialog-header">
              <div>
                <div class="dialog-eyebrow">{{ detailState.eyebrow }}</div>
                <h3>{{ detailState.title }}</h3>
              </div>
              <button class="close-button" @click="closeOverlays">关闭</button>
            </header>
            <p class="dialog-summary">{{ detailState.summary }}</p>
            <div class="detail-list">
              <button
                v-for="item in detailState.items"
                :key="item?.entity_id || item?.attributes?.friendly_name"
                class="detail-row"
                :class="{ 'is-on': item?.state === 'on' || item?.state === 'open' }"
                @click="item?.entity_id ? toggleEntity(item.entity_id) : null"
              >
                <span>{{ item?.attributes?.friendly_name ?? item?.entity_id }}</span>
                <strong :class="{ 'state-on': item?.state === 'on' || item?.state === 'open', 'state-off': item?.state === 'off' || item?.state === 'closed' }">{{ item?.state ?? '--' }}</strong>
              </button>
            </div>
          </section>

          <!-- ===== Settings ===== -->
          <section v-else-if="dialogMode === 'settings'" class="dialog-card dialog-settings bg-main">
            <header class="dialog-header">
              <div>
                <div class="dialog-eyebrow">Display</div>
                <h3>设置</h3>
              </div>
              <button class="close-button" @click="closeOverlays">关闭</button>
            </header>

            <div class="settings-list">
              <button class="setting-item" @click="theme = theme === 'charcoal' ? 'warm' : theme === 'warm' ? 'auto' : 'charcoal'; savePref('yumu.theme', theme)">
                <span>主题</span>
                <strong>{{ theme === 'auto' ? '跟随系统' : theme === 'warm' ? '暖色' : '深色' }}</strong>
              </button>

              <button class="setting-item" @click="use24Hour = !use24Hour; savePref('yumu.clock24', use24Hour)">
                <span>时间格式</span>
                <strong>{{ use24Hour ? '24 小时' : '12 小时' }}</strong>
              </button>

              <button class="setting-item" @click="motionEnabled = !motionEnabled; savePref('yumu.motion', motionEnabled)">
                <span>动画</span>
                <strong>{{ motionEnabled ? '开启' : '关闭' }}</strong>
              </button>
            </div>

            <div class="settings-hint">简单模式，只保留最常用的 3 个开关。</div>
          </section>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
