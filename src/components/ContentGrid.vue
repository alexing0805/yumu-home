<script setup lang="ts">
import { computed } from 'vue'
import { SCENE_LABELS, type PanelKey, type HaState } from '../config'
import { pairHvacDevices, type HvacGroup } from '../utils/hvac'

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

function climateStateLabel(state: string) {
  const labels: Record<string, string> = {
    off: '已关闭',
    cool: '制冷',
    heat: '制热',
    dry: '除湿',
    fan_only: '送风',
    auto: '自动',
    unavailable: '离线',
    unknown: '未知',
  }

  return labels[state] ?? state
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
const hvacGroups = computed(() => pairHvacDevices(props.climates, props.fans))

const vacuumIcon: Record<string, string> = {
  docked: '🔋',
  cleaning: '🧹',
  returning: '↩️',
  paused: '⏸️',
  idle: '🤖',
  error: '⚠️',
}

function getHvacName(group: HvacGroup) {
  return cleanName(
    group.climate?.attributes.friendly_name
      || group.fan?.attributes.friendly_name
      || '空调系统',
  )
}

function getHvacPrimaryValue(group: HvacGroup) {
  if (group.climate) {
    return `${group.climate.attributes.temperature || group.climate.attributes.current_temperature || '--'}°`
  }

  return `${group.fan?.attributes.percentage || 0}%`
}

function getHvacState(group: HvacGroup) {
  if (group.climate && group.climate.state !== 'off') return climateStateLabel(group.climate.state)
  if (group.fan) return group.fan.state === 'on' ? '新风开启' : '新风关闭'
  return '未连接'
}

function getClimateMeta(group: HvacGroup) {
  if (!group.climate) return '空调未接入'
  const current = group.climate.attributes.current_temperature
  return current !== undefined ? `室温 ${current}°C` : climateStateLabel(group.climate.state)
}

function getFanMeta(group: HvacGroup) {
  if (!group.fan) return '新风未接入'
  if (group.fan.state !== 'on') return '新风已关闭'
  return `风量 ${group.fan.attributes.percentage || 0}%`
}
</script>

<template>
  <section class="content-grid">
    <button
      :class="['card', 'ac-card', { 'card-lifted': liftPanel === 'climate' }]"
      aria-label="打开空调与新风面板"
      @click="$emit('open-panel', 'climate', $event)"
    >
      <div class="card-label">空调 / 新风</div>
      <div class="device-grid">
        <div v-for="group in hvacGroups" :key="group.key" class="device-pill hvac-pill">
          <div class="dp-header">
            <span class="dp-name">{{ getHvacName(group) }}</span>
            <span class="dp-icon">{{ group.fan ? '🌬️' : '❄️' }}</span>
          </div>
          <div class="dp-body hvac-body">
            <span class="dp-value">{{ getHvacPrimaryValue(group) }}</span>
            <span class="dp-status">{{ getHvacState(group) }}</span>
          </div>
          <div class="dp-meta">
            <span>{{ getClimateMeta(group) }}</span>
            <span>{{ getFanMeta(group) }}</span>
          </div>
        </div>
        <div v-if="!hvacGroups.length" class="card-copy">
          暂无设备数据
        </div>
      </div>
      <div class="ac-temps">
        <div class="temp-block env">室内温度 <strong>{{ envTemp }}°C</strong></div>
      </div>
    </button>

    <section class="card scene-card">
      <div class="card-label">场景</div>
      <div class="scene-grid">
        <button
          v-for="scene in SCENE_LABELS"
          :key="scene.id"
          :class="['scene-item', { active: activeScene === scene.id }]"
          :aria-label="scene.label"
          @click="$emit('set-scene', scene.id)"
        >{{ scene.icon }} {{ scene.label }}</button>
      </div>
    </section>

    <button
      :class="['card', 'summary-card', 'light-card', { 'card-lifted': liftPanel === 'lights' }]"
      aria-label="打开灯光面板"
      @click="$emit('open-panel', 'lights', $event)"
    >
      <div class="card-label">灯光</div>
      <div class="summary-hero">
        <div class="hero-num">{{ lightsOn.length }}<span class="hero-total">/ {{ lights.length }}</span></div>
        <div class="hero-icon" :class="{ active: lightsOn.length > 0 }">💡</div>
      </div>
      <div class="card-copy">{{ lightsOn.length ? '有灯已开启' : '已全部关闭' }}</div>
    </button>

    <button
      :class="['card', 'summary-card', 'curtain-card', { 'card-lifted': liftPanel === 'curtains' }]"
      aria-label="打开窗帘面板"
      @click="$emit('open-panel', 'curtains', $event)"
    >
      <div class="card-label">窗帘</div>
      <div class="summary-hero">
        <div class="hero-num">{{ curtainsOpen.length }}<span class="hero-total">/ {{ curtains.length }}</span></div>
        <div class="hero-icon" :class="{ active: curtainsOpen.length > 0 }">🪟</div>
      </div>
      <div class="card-copy">{{ curtainsOpen.length ? '部分窗帘已开启' : '已全部关闭' }}</div>
    </button>

    <button
      :class="['card', 'summary-card', 'env-card', { 'card-lifted': liftPanel === 'air' }]"
      aria-label="打开室内环境面板"
      @click="$emit('open-panel', 'air', $event)"
    >
      <div class="card-label">室内环境</div>
      <div class="env-blocks">
        <div class="env-block">
          <span class="eb-val">🌡️ {{ envTemp }}°</span>
          <span class="eb-lbl">温度</span>
        </div>
        <div class="env-block">
          <span class="eb-val">💧 {{ envHumidity }}%</span>
          <span class="eb-lbl">湿度</span>
        </div>
        <div class="env-block">
          <span class="eb-val">🌫️ {{ envPm25 }}</span>
          <span class="eb-lbl">PM2.5</span>
        </div>
      </div>
    </button>

    <button
      :class="['card', 'summary-card', 'family-card', { 'card-lifted': liftPanel === 'summary' }]"
      aria-label="打开家庭状态面板"
      @click="$emit('open-panel', 'summary', $event)"
    >
      <div class="card-label">家庭状态</div>
      <div class="sec-list">
        <div class="sec-item">
          <span class="sec-icon">👤</span><span class="sec-lbl">人员状态</span><strong>{{ homeMode }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">🛡️</span><span class="sec-lbl">安防状态</span><strong>{{ homeSecurity }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">🔒</span><span class="sec-lbl">门锁</span><strong>{{ homeLock }} <small>({{ lockBattery }}%)</small></strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">{{ vacuumIcon[vacuumState] ?? '🤖' }}</span><span class="sec-lbl">{{ vacuumName }}</span><strong>{{ vacuumStateLabel(vacuumState) }} <small>({{ vacuumBattery }}%)</small></strong>
        </div>
      </div>
    </button>
  </section>
</template>
