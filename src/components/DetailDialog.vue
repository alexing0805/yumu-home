<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HaState, PanelKey } from '../config'

const props = defineProps<{
  activePanel: PanelKey
  eyebrow: string
  title: string
  summary: string
  items: HaState[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toggle', entityId: string): void
  (e: 'set-light-brightness', id: string, val: number): void
  (e: 'set-cover-position', id: string, val: number): void
  (e: 'stop-cover', id: string): void
  (e: 'set-climate-temp', id: string, val: number): void
  (e: 'set-climate-mode', id: string, mode: string): void
  (e: 'set-fan-pct', id: string, val: number): void
  (e: 'set-fan-mode', id: string, mode: string): void
}>()

// --- Utilities ---
function isOn(item: HaState) {
  return item.state === 'on' || item.state === 'open' || ['cool', 'heat', 'fan_only', 'dry', 'auto'].includes(item.state)
}

function cleanName(name: string) {
  return name.replace(/空调|新风机|灯带|吊灯|窗帘|卧室|客厅/g, '').trim() || name
}

// --- Lights Grouping ---
const groupedLights = computed(() => {
  if (props.activePanel !== 'lights') return []
  const groups: Record<string, HaState[]> = {
    '客厅': [],
    '卧室': [],
    '其他': []
  }
  
  props.items.forEach(item => {
    const id = item.entity_id
    if (id.includes('ke_ting') || id.includes('diao_deng')) groups['客厅'].push(item)
    else if (id.includes('wo_shi')) groups['卧室'].push(item)
    else groups['其他'].push(item)
  })
  
  return Object.entries(groups).filter(([_, items]) => items.length > 0)
})

const groupedClimates = computed(() => {
  if (props.activePanel !== 'climate') return { pairs: [], standaloneFans: [] }
  const climates = props.items.filter(i => i.entity_id.startsWith('climate.'))
  const fans = props.items.filter(i => i.entity_id.startsWith('fan.'))
  
  const pairs = climates.map(ac => {
    const acName = cleanName(ac.attributes.friendly_name || '')
    const boundFan = fans.find(f => {
      const fName = cleanName(f.attributes.friendly_name || '')
      return fName.includes(acName) || acName.includes(fName)
    })
    return { ac, fan: boundFan }
  })

  const standaloneFans = fans.filter(f => !pairs.some(p => p.fan?.entity_id === f.entity_id))
  return { pairs, standaloneFans }
})

// --- AC Helpers ---
const HVAC_MODES = [
  { id: 'off', label: '关闭', icon: '⭕' },
  { id: 'cool', label: '制冷', icon: '❄️' },
  { id: 'heat', label: '制热', icon: '☀️' },
  { id: 'dry', label: '除湿', icon: '💧' },
  { id: 'fan_only', label: '送风', icon: '🌀' },
  { id: 'auto', label: '自动', icon: '🅰️' },
]

const FAN_MODES = ['low', 'medium', 'high', 'auto']

function getSupportedModes(item: HaState) {
  return item.attributes.hvac_modes || []
}

function getSupportedFanModes(item: HaState) {
  return item.attributes.fan_modes || []
}

function getSwingModes(item: HaState) {
  return item.attributes.swing_modes || []
}

// --- Circular Dial Logic ---
const dialRefs = ref<Record<string, HTMLElement | null>>({})
const dragState = ref<Record<string, { active: boolean, temp: number }>>({})

function getNormTemp(item: HaState) {
  const ds = dragState.value[item.entity_id]
  if (ds && ds.active) return ds.temp
  const t = item.attributes.temperature
  return typeof t === 'number' ? t : parseFloat(t) || 24
}

function startDialDrag(e: PointerEvent, item: HaState) {
  const el = dialRefs.value[item.entity_id]
  if (!el) return
  el.setPointerCapture(e.pointerId)
  dragState.value[item.entity_id] = { active: true, temp: getNormTemp(item) }
  updateDialDrag(e, item)
}

function moveDialDrag(e: PointerEvent, item: HaState) {
  if (!dragState.value[item.entity_id]?.active) return
  updateDialDrag(e, item)
}

function stopDialDrag(e: PointerEvent, item: HaState) {
  const ds = dragState.value[item.entity_id]
  if (!ds || !ds.active) return
  ds.active = false
  emit('set-climate-temp', item.entity_id, ds.temp)
}

function updateDialDrag(e: PointerEvent, item: HaState) {
  const el = dialRefs.value[item.entity_id]
  if (!el) return
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  
  let angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
  let normAngle = angle - 135
  if (normAngle < 0) normAngle += 360
  if (normAngle > 270) {
    if (normAngle < 315) normAngle = 270
    else normAngle = 0
  }
  
  const minT = item.attributes.min_temp ?? 16
  const maxT = item.attributes.max_temp ?? 30
  let temp = minT + (normAngle / 270) * (maxT - minT)
  dragState.value[item.entity_id].temp = Math.round(temp * 2) / 2
}

function getDialOffset(item: HaState) {
  const t = getNormTemp(item)
  const min = item.attributes.min_temp ?? 16
  const max = item.attributes.max_temp ?? 30
  const pct = Math.max(0, Math.min(1, (t - min) / (max - min)))
  return 518.36 * (1 - pct)
}

function getDialColor(item: HaState) {
  if (item.state === 'cool') return '#7fb6f5'
  if (item.state === 'heat') return '#f5936c'
  return '#ffffff'
}
</script>

<template>
  <div class="dialog-card bg-dark wide-dialog" @click.stop>
    <div class="dialog-header">
      <div>
        <div class="dialog-eyebrow">{{ eyebrow }}</div>
        <h3>{{ title }}</h3>
        <p class="dialog-summary" style="margin: 6px 0 0;">{{ summary }}</p>
      </div>
      <button class="close-button" @click="$emit('close')">✕</button>
    </div>

    <div class="detail-grid-view">
      <!-- 1. 灯光面板: 区域划分 + 极简拨杆 -->
      <template v-if="activePanel === 'lights'">
        <div v-for="[area, lights] in groupedLights" :key="area" class="light-area-group">
          <div class="area-title">{{ area }}</div>
          <div class="light-grid-compact">
            <div v-for="light in lights" :key="light.entity_id" class="toggle-item-compact">
              <span class="detail-name">{{ cleanName(light.attributes.friendly_name) }}</span>
              <label class="lever-switch">
                <input 
                  type="checkbox" 
                  :checked="light.state === 'on'" 
                  @change="$emit('toggle', light.entity_id)"
                >
                <span class="lever-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </template>

      <!-- 2. 空调面板: 三级全功能控制 -->
      <template v-else-if="activePanel === 'climate'">
        <div v-for="group in groupedClimates.pairs" :key="group.ac.entity_id" class="ac-panel-card">
          <!-- Climate Entity -->
          <div class="ac-main-ctrl">
            <div class="ctrl-section-label">{{ group.ac.attributes.friendly_name }}</div>
            
            <div class="ac-thermostat-dial"
                 :ref="el => { if(el) dialRefs[group.ac.entity_id] = el as HTMLElement; }"
                 @pointerdown.prevent="startDialDrag($event, group.ac)"
                 @pointermove.prevent="moveDialDrag($event, group.ac)"
                 @pointerup.prevent="stopDialDrag($event, group.ac)"
                 @pointerleave.prevent="stopDialDrag($event, group.ac)"
            >
              <svg viewBox="0 0 240 240" class="dial-svg">
                <path d="M 42.2 197.8 A 110 110 0 1 1 197.8 197.8" class="dial-track" />
                <path d="M 42.2 197.8 A 110 110 0 1 1 197.8 197.8" class="dial-fill" 
                      :style="{ strokeDashoffset: getDialOffset(group.ac), stroke: getDialColor(group.ac) }" />
              </svg>
              <div class="dial-content">
                <span class="ac-target-val" :style="{ color: getDialColor(group.ac) }">{{ getNormTemp(group.ac).toFixed(1) }}</span>
                <span class="ac-info">{{ group.ac.state === 'off' ? '已关闭' : `室内 ${group.ac.attributes.current_temperature ?? '--'}°` }}</span>
              </div>
            </div>

            <!-- AC Fan Sliding Control (Moved to Left Column) -->
            <div class="ctrl-group ac-fan-main" v-if="getSupportedFanModes(group.ac).length > 0">
              <div class="slider-label-row">
                <span class="ctrl-section-label">空调风速</span>
                <span class="slider-val-tag">{{ group.ac.attributes.fan_mode || 'Auto' }}</span>
              </div>
              <input 
                type="range"
                class="ha-slider filled-slider"
                min="0" :max="Math.max(1, getSupportedFanModes(group.ac).length - 1)" step="1"
                :value="getSupportedFanModes(group.ac).indexOf(group.ac.attributes.fan_mode)"
                @change="(e: any) => { const idx = parseInt(e.target.value); if(getSupportedFanModes(group.ac)[idx]) $emit('set-fan-mode', group.ac.entity_id, getSupportedFanModes(group.ac)[idx]) }"
              />
            </div>
          </div>

          <div class="ac-sub-ctrl">
            <div class="ctrl-group">
              <div class="ctrl-section-label">状态与模式</div>
              <div class="mode-btn-group">
                <button 
                  v-for="m in HVAC_MODES.filter(m => getSupportedModes(group.ac).includes(m.id))" 
                  :key="m.id"
                  class="ctrl-btn"
                  :class="{ active: group.ac.state === m.id }"
                  @click="$emit('set-climate-mode', group.ac.entity_id, m.id)"
                >
                  {{ m.label }}
                </button>
                <!-- Integrated Fan Power Toggle -->
                <button 
                  v-if="group.fan"
                  class="ctrl-btn fan-toggle-btn"
                  :class="{ active: group.fan.state === 'on' }"
                  @click="$emit('toggle', group.fan.entity_id)"
                >
                  {{ group.fan.state === 'on' ? '关闭新风' : '开启新风' }}
                </button>
              </div>
            </div>

            <!-- Swing Control (Moved up or kept) -->
            <div class="ctrl-group" v-if="getSwingModes(group.ac).length > 0">
              <div class="ctrl-section-label">摆风模式</div>
              <div class="muji-select-wrapper">
                <select class="muji-select" :value="group.ac.attributes.swing_mode" @change="(e: any) => $emit('set-climate-swing-mode', group.ac.entity_id, e.target.value)">
                  <option v-for="s in getSwingModes(group.ac)" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>

            <!-- Integrated Fresh Air Fan Speed (Moved to Right Column, aligned with AC Speed) -->
            <div class="ctrl-group integrated-fan-group" v-if="group.fan">
              <div class="slider-label-row">
                <span class="ctrl-section-label">{{ cleanName(group.fan.attributes.friendly_name) }} 风力</span>
                <span class="slider-val-tag">{{ group.fan.attributes.percentage || 0 }}%</span>
              </div>
              <input
                type="range"
                class="ha-slider filled-slider"
                min="0" max="100" step="1"
                :value="group.fan.attributes.percentage || 0"
                @change="(e: any) => $emit('set-fan-pct', group.fan!.entity_id, parseInt(e.target.value))"
              />
            </div>
          </div>
        </div>

        <!-- Standalone Fan Entities -->
        <div v-for="fan in groupedClimates.standaloneFans" :key="fan.entity_id" class="ac-panel-card standalone-fan">
          <div class="ac-main-ctrl">
            <div class="ctrl-section-label">{{ fan.attributes.friendly_name }}</div>
            <div class="slider-label-row center-val">
              <span class="ac-target-val" style="font-size: 3rem;">{{ fan.attributes.percentage || 0 }}<span style="font-size:1.2rem">%</span></span>
            </div>
            <input 
              type="range" 
              class="ha-slider filled-slider"
              min="0" max="100" step="1"
              :value="fan.attributes.percentage || 0"
              @change="(e: any) => $emit('set-fan-pct', fan.entity_id, parseInt(e.target.value))"
            />
          </div>
          <div class="ac-sub-ctrl">
            <div class="ctrl-group">
               <div class="ctrl-section-label">电源</div>
               <button class="ctrl-btn" :class="{ active: fan.state === 'on' }" @click="$emit('toggle', fan.entity_id)">
                  {{ fan.state === 'on' ? '关闭' : '开启' }}
               </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 3. 窗帘面板: 物理按键 + 开度 -->
      <template v-else-if="activePanel === 'curtains'">
        <div v-for="curtain in items" :key="curtain.entity_id" class="curtain-item-ctrl">
          <div class="curtain-header">
            <span class="detail-name">{{ curtain.attributes.friendly_name }}</span>
            <span class="detail-state">{{ curtain.attributes.current_position ?? '--' }}%</span>
          </div>
          <div class="curtain-btns">
            <button class="ctrl-btn" @click="$emit('toggle', curtain.entity_id)">
              {{ curtain.state === 'open' ? '关闭' : '开启' }}
            </button>
            <button class="ctrl-btn" @click="$emit('stop-cover', curtain.entity_id)">停止</button>
            <button class="ctrl-btn" :class="{ active: curtain.state === 'open' }" @click="$emit('set-cover-position', curtain.entity_id, 100)">全开</button>
          </div>
          <input 
            type="range" 
            class="ha-slider curtain-pos-slider"
            min="0" max="100" step="1"
            :value="curtain.attributes.current_position"
            @change="(e: any) => $emit('set-cover-position', curtain.entity_id, parseInt(e.target.value))"
          />
        </div>
      </template>

      <!-- 4. 其他 (环境/家庭等) -->
      <template v-else>
        <div v-for="item in items" :key="item.entity_id" class="toggle-item-compact">
          <span class="detail-name">{{ item.attributes.friendly_name || item.entity_id }}</span>
          <strong class="detail-state">{{ item.state }}</strong>
        </div>
      </template>
    </div>
  </div>
</template>
