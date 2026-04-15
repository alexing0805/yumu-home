<script setup lang="ts">
import { computed } from 'vue'
import { SCENE_LABELS, type PanelKey, type HaState } from '../config'

const props = defineProps<{
  climates: HaState[]
  fans: HaState[]
  lights: HaState[]
  curtains: HaState[]
  envTemp: string
  envHumidity: string
  envPm25: string
  homeMode: string
  homeSecurity: string
  homeLock: string
  lockBattery: string
  vacuumState: string
  vacuumName: string
  vacuumBattery: string
  activeScene: string
  liftPanel: PanelKey | null
}>()

defineEmits<{
  (e: 'open-panel', panel: PanelKey, ev: MouseEvent): void
  (e: 'set-scene', id: string): void
}>()

function cleanName(name: string) {
  if (!name) return '设备'
  return name.replace(/空调|新风机|新风Pro|窗帘|灯带|吊灯|立式/g, '').trim() || name
}

function vacuumStateLabel(state: string) {
  const labels: Record<string, string> = {
    docked: '回充中',
    cleaning: '清扫中',
    returning: '返回基站',
    paused: '已暂停',
    idle: '待命',
    error: '故障',
    unavailable: '离线',
    unknown: '未知',
  }

  return labels[state] ?? state
}

const lightsOn = computed(() => props.lights.filter((light) => light.state === 'on'))
const curtainsOpen = computed(() => props.curtains.filter((curtain) => curtain.state === 'open'))
const climateOnCount = computed(() => props.climates.filter((climate) => climate.state !== 'off' && climate.state !== 'unavailable').length)
const fanOnCount = computed(() => props.fans.filter((fan) => fan.state === 'on').length)
const climateTitle = computed(() => cleanName(props.climates[0]?.attributes.friendly_name || '空调'))
const vacuumLabel = computed(() => cleanName(props.vacuumName))

const primaryClimate = computed(() => {
  return props.climates.find((climate) => climate.state !== 'off' && climate.state !== 'unavailable')
    ?? props.climates[0]
    ?? null
})

const primaryLight = computed(() => {
  return lightsOn.value[0] ?? props.lights[0] ?? null
})

const primaryCurtain = computed(() => {
  return props.curtains.find((curtain) => curtain.state === 'open')
    ?? props.curtains[0]
    ?? null
})

function climateModeLabel(state: string) {
  const labels: Record<string, string> = {
    off: '全部关闭',
    cool: '制冷中',
    heat: '制热中',
    dry: '除湿中',
    fan_only: '送风中',
    auto: '自动运行',
    unavailable: '设备离线',
    unknown: '状态未知',
  }

  return labels[state] ?? state
}

const climateHero = computed(() => {
  const climate = primaryClimate.value
  if (!climate || climateOnCount.value === 0) return '全部关闭'
  const target = climate.attributes.temperature ?? climate.attributes.current_temperature
  if (target !== undefined && target !== null) return `${climateModeLabel(climate.state).replace('中', '')} ${target}°`
  return climateModeLabel(climate.state)
})

const climateMeta = computed(() => {
  if (!props.climates.length) return '暂无空调设备'
  return `${climateTitle.value} · 已开 ${climateOnCount.value}/${props.climates.length}`
})

const climateCaption = computed(() => {
  const fanText = fanOnCount.value > 0 ? `新风 ${fanOnCount.value}/${props.fans.length}` : '新风已关'
  return `室温 ${props.envTemp}°C · ${fanText}`
})

const lightsHero = computed(() => {
  if (!props.lights.length) return '暂无灯光'
  if (lightsOn.value.length === 0) return '全部关闭'
  if (lightsOn.value.length === props.lights.length) return '全部开启'
  if (lightsOn.value.length === 1 && primaryLight.value) return `${cleanName(primaryLight.value.attributes.friendly_name)}开启`
  return `${lightsOn.value.length} 盏已开`
})

const lightsMeta = computed(() => `共 ${props.lights.length} 盏灯`)

const lightsCaption = computed(() => {
  if (lightsOn.value.length === 0) return '空间已进入安静照明状态'
  return lightsOn.value.slice(0, 2).map((light) => cleanName(light.attributes.friendly_name)).join(' · ')
})

const curtainHero = computed(() => {
  if (!props.curtains.length) return '暂无窗帘'
  if (curtainsOpen.value.length === 0) return '全部关闭'
  if (curtainsOpen.value.length === props.curtains.length) return '全部开启'
  return '部分开启'
})

const curtainMeta = computed(() => `共 ${props.curtains.length} 组窗帘`)

const curtainCaption = computed(() => {
  const curtain = primaryCurtain.value
  if (!curtain) return '未检测到窗帘状态'
  const pos = curtain.attributes.current_position
  const name = cleanName(curtain.attributes.friendly_name)
  if (typeof pos === 'number') return `${name} ${pos}%`
  return curtainsOpen.value.length ? `${name} 已开启` : `${name} 已关闭`
})
</script>

<template>
  <section class="content-grid">
    <button
      :class="['card', 'ac-card', 'compact-card', { 'card-lifted': liftPanel === 'climate' }]"
      aria-label="打开空调与新风面板"
      @click="$emit('open-panel', 'climate', $event)"
    >
      <div class="card-label">空调 / 新风</div>
      <div class="compact-kicker">当前状态</div>
      <div class="compact-main">{{ climateHero }}</div>
      <div class="compact-meta">{{ climateMeta }}</div>
      <div class="compact-caption">{{ climateCaption }}</div>
    </button>

    <section class="card scene-card">
      <div class="card-label">模式</div>
      <div class="scene-grid">
        <button
          v-for="scene in SCENE_LABELS"
          :key="scene.id"
          :class="['scene-item', { active: activeScene === scene.id }]"
          :aria-label="scene.label"
          @click="$emit('set-scene', scene.id)"
        >
          <span class="scene-mark">{{ scene.icon }}</span>
        </button>
      </div>
    </section>

    <button
      :class="['card', 'summary-card', 'family-card', { 'card-lifted': liftPanel === 'summary' }]"
      aria-label="打开家庭状态面板"
      @click="$emit('open-panel', 'summary', $event)"
    >
      <div class="card-label">家庭状态</div>
      <div class="family-shell">
        <div class="family-primary">
          <div class="compact-kicker family-kicker">当前状态</div>
          <div class="family-headline">{{ homeMode }}</div>
          <div class="family-caption">{{ homeSecurity }}</div>
        </div>
        <div class="family-metrics">
          <div class="family-metric">
            <span class="sec-tag">门锁</span>
            <strong>{{ homeLock }}</strong>
          </div>
          <div class="family-metric">
            <span class="sec-tag">电量</span>
            <strong>{{ lockBattery }}%</strong>
          </div>
          <div class="family-metric family-metric-wide">
            <span class="sec-tag">{{ vacuumLabel }}</span>
            <strong>{{ vacuumStateLabel(vacuumState) }} <small>{{ vacuumBattery }}%</small></strong>
          </div>
        </div>
      </div>
    </button>

    <button
      :class="['card', 'summary-card', 'light-card', 'compact-card', { 'card-lifted': liftPanel === 'lights' }]"
      aria-label="打开灯光面板"
      @click="$emit('open-panel', 'lights', $event)"
    >
      <div class="card-label">灯光</div>
      <div class="compact-kicker">照明氛围</div>
      <div class="compact-main">{{ lightsHero }}</div>
      <div class="compact-meta">{{ lightsMeta }}</div>
      <div class="compact-caption">{{ lightsCaption }}</div>
    </button>

    <button
      :class="['card', 'summary-card', 'curtain-card', 'compact-card', { 'card-lifted': liftPanel === 'curtains' }]"
      aria-label="打开窗帘面板"
      @click="$emit('open-panel', 'curtains', $event)"
    >
      <div class="card-label">窗帘</div>
      <div class="compact-kicker">开合状态</div>
      <div class="compact-main">{{ curtainHero }}</div>
      <div class="compact-meta">{{ curtainMeta }}</div>
      <div class="compact-caption">{{ curtainCaption }}</div>
    </button>

    <button
      :class="['card', 'summary-card', 'env-card', { 'card-lifted': liftPanel === 'air' }]"
      aria-label="打开室内环境面板"
      @click="$emit('open-panel', 'air', $event)"
    >
      <div class="card-label">室内环境</div>
      <div class="env-blocks">
        <div class="env-block">
          <span class="eb-val">{{ envTemp }}°</span>
          <span class="eb-lbl">温度</span>
        </div>
        <div class="env-block">
          <span class="eb-val">{{ envHumidity }}%</span>
          <span class="eb-lbl">湿度</span>
        </div>
        <div class="env-block">
          <span class="eb-val">{{ envPm25 }}</span>
          <span class="eb-lbl">PM2.5</span>
        </div>
      </div>
    </button>
  </section>
</template>
