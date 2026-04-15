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
</script>

<template>
  <section class="content-grid">
    <button
      :class="['card', 'ac-card', 'compact-card', { 'card-lifted': liftPanel === 'climate' }]"
      aria-label="打开空调与新风面板"
      @click="$emit('open-panel', 'climate', $event)"
    >
      <div class="card-label">空调 / 新风</div>
      <div class="compact-main">{{ climateOnCount }} / {{ climates.length }}</div>
      <div class="compact-meta-row">
        <span class="compact-meta-chip">{{ climateTitle }}</span>
        <span class="compact-meta-chip">新风 {{ fanOnCount }} / {{ fans.length }}</span>
        <span class="compact-meta-chip">室温 {{ envTemp }}°C</span>
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
        >
          <span class="scene-mark">{{ scene.icon }}</span>
          <span class="scene-name">{{ scene.label }}</span>
        </button>
      </div>
    </section>

    <button
      :class="['card', 'summary-card', 'family-card', { 'card-lifted': liftPanel === 'summary' }]"
      aria-label="打开家庭状态面板"
      @click="$emit('open-panel', 'summary', $event)"
    >
      <div class="card-label">家庭状态</div>
      <div class="sec-list">
        <div class="sec-item">
          <span class="sec-tag">人员</span>
          <strong>{{ homeMode }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-tag">安防</span>
          <strong>{{ homeSecurity }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-tag">门锁</span>
          <strong>{{ homeLock }} <small>{{ lockBattery }}%</small></strong>
        </div>
        <div class="sec-item">
          <span class="sec-tag">{{ vacuumLabel }}</span>
          <strong>{{ vacuumStateLabel(vacuumState) }} <small>{{ vacuumBattery }}%</small></strong>
        </div>
      </div>
    </button>

    <button
      :class="['card', 'summary-card', 'light-card', 'compact-card', { 'card-lifted': liftPanel === 'lights' }]"
      aria-label="打开灯光面板"
      @click="$emit('open-panel', 'lights', $event)"
    >
      <div class="card-label">灯光</div>
      <div class="compact-main">{{ lightsOn.length }} / {{ lights.length }}</div>
      <div class="compact-meta-row">
        <span class="compact-meta-chip">{{ lightsOn.length ? '已开启' : '已关闭' }}</span>
      </div>
    </button>

    <button
      :class="['card', 'summary-card', 'curtain-card', 'compact-card', { 'card-lifted': liftPanel === 'curtains' }]"
      aria-label="打开窗帘面板"
      @click="$emit('open-panel', 'curtains', $event)"
    >
      <div class="card-label">窗帘</div>
      <div class="compact-main">{{ curtainsOpen.length }} / {{ curtains.length }}</div>
      <div class="compact-meta-row">
        <span class="compact-meta-chip">{{ curtainsOpen.length ? '部分开启' : '全部关闭' }}</span>
      </div>
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
