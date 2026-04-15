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
  return name.replace(/空调|新风机|新风Pro|窗帘|灯带|吊灯/g, '').trim() || name
}

const lightsOn = computed(() => props.lights.filter(l => l.state === 'on'))
const curtainsOpen = computed(() => props.curtains.filter(c => c.state === 'open'))

const vacuumIcon: Record<string, string> = {
  docked: '🏠', cleaning: '🧹', returning: '↩️', paused: '⏸️', idle: '💤', error: '⚠️',
}
</script>

<template>
  <section class="content-grid">
    <!-- 空调 -->
    <button
      :class="['card', 'ac-card', { 'card-lifted': liftPanel === 'climate' }]"
      aria-label="查看空调详情"
      @click="$emit('open-panel', 'climate', $event)"
    >
      <div class="card-label">HVAC / 空调风机</div>
      <div class="device-grid">
        <div v-for="c in climates" :key="c.entity_id" class="device-pill">
          <div class="dp-header">
            <span class="dp-name">{{ cleanName(c.attributes.friendly_name) }}</span>
            <span class="dp-icon">❄️</span>
          </div>
          <div class="dp-body">
            <span class="dp-value">{{ c.attributes.temperature || c.attributes.current_temperature || '--' }}°</span>
            <span class="dp-status">{{ c.state }}</span>
          </div>
        </div>
        <div v-for="f in fans" :key="f.entity_id" class="device-pill">
          <div class="dp-header">
            <span class="dp-name">{{ cleanName(f.attributes.friendly_name) }}</span>
            <span class="dp-icon">💨</span>
          </div>
          <div class="dp-body">
            <span class="dp-value">风机</span>
            <span class="dp-status">{{ f.state }}</span>
          </div>
        </div>
        <div v-if="!climates.length && !fans.length" class="card-copy">
          暂无设备数据
        </div>
      </div>
      <div class="ac-temps">
        <div class="temp-block env">室内当前 <strong>{{ envTemp }}°C</strong></div>
      </div>
    </button>

    <!-- 场景 -->
    <section class="card scene-card">
      <div class="card-label">SCENES / 场景</div>
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

    <!-- 灯光 -->
    <button
      :class="['card', 'summary-card', 'light-card', { 'card-lifted': liftPanel === 'lights' }]"
      aria-label="查看灯光详情"
      @click="$emit('open-panel', 'lights', $event)"
    >
      <div class="card-label">LIGHTING / 灯光</div>
      <div class="summary-hero">
        <div class="hero-num">{{ lightsOn.length }}<span class="hero-total">/ {{ lights.length }}</span></div>
        <div class="hero-icon" :class="{ active: lightsOn.length > 0 }">💡</div>
      </div>
      <div class="card-copy">{{ lightsOn.length ? '部分灯光已开启' : '已全部关闭' }}</div>
    </button>

    <!-- 窗帘 -->
    <button
      :class="['card', 'summary-card', 'curtain-card', { 'card-lifted': liftPanel === 'curtains' }]"
      aria-label="查看窗帘详情"
      @click="$emit('open-panel', 'curtains', $event)"
    >
      <div class="card-label">COVERS / 窗帘</div>
      <div class="summary-hero">
        <div class="hero-num">{{ curtainsOpen.length }}<span class="hero-total">/ {{ curtains.length }}</span></div>
        <div class="hero-icon" :class="{ active: curtainsOpen.length > 0 }">🪟</div>
      </div>
      <div class="card-copy">{{ curtainsOpen.length ? '部分窗帘已开启' : '已全部关闭' }}</div>
    </button>

    <!-- 室内环境 -->
    <button
      :class="['card', 'summary-card', 'env-card', { 'card-lifted': liftPanel === 'air' }]"
      aria-label="查看室内环境"
      @click="$emit('open-panel', 'air', $event)"
    >
      <div class="card-label">ENVIRONMENT / 室内环境</div>
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
          <span class="eb-val">🍃 {{ envPm25 }}</span>
          <span class="eb-lbl">PM 2.5</span>
        </div>
      </div>
    </button>

    <!-- 家庭状态 -->
    <button
      :class="['card', 'summary-card', 'family-card', { 'card-lifted': liftPanel === 'summary' }]"
      aria-label="查看家庭状态"
      @click="$emit('open-panel', 'summary', $event)"
    >
      <div class="card-label">SECURITY / 家庭状态</div>
      <div class="sec-list">
        <div class="sec-item">
          <span class="sec-icon">👤</span><span class="sec-lbl">人员</span><strong>{{ homeMode }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">🛡️</span><span class="sec-lbl">安防</span><strong>{{ homeSecurity }}</strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">🚪</span><span class="sec-lbl">门锁</span><strong>{{ homeLock }} <small>({{ lockBattery }}%)</small></strong>
        </div>
        <div class="sec-item">
          <span class="sec-icon">{{ vacuumIcon[vacuumState] ?? '🤖' }}</span><span class="sec-lbl">扫地机</span><strong>{{ vacuumState }} <small>({{ vacuumBattery }}%)</small></strong>
        </div>
      </div>
    </button>
  </section>
</template>
