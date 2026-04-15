<script setup lang="ts">
import type { PanelKey } from '../config'

defineProps<{
  formattedTime: string
  formattedDate: string
  loading: boolean
  errorText: string
  weatherText: string
  wxState: string
  wxStateLabel: string
  wxTemp: string | number
  wxHigh: string | number
  wxLow: string | number
  wxUnit: string
  envPm25: string
  aqiLevel: string
  aqiText: string
  wsConnected: boolean
  liftPanel: PanelKey | null
}>()

defineEmits<{
  (e: 'open-panel', panel: PanelKey, ev: MouseEvent): void
  (e: 'open-settings'): void
  (e: 'retry'): void
}>()
</script>

<template>
  <header class="status-bar">
    <div class="time-cluster">
      <div class="time-main">{{ formattedTime }}</div>
      <div class="date-stack">
        <span>{{ formattedDate }}</span>
        <template v-if="loading">
          <span class="ws-indicator">连接中</span>
        </template>
        <template v-else-if="errorText">
          <span class="error-text">{{ errorText }}</span>
          <button class="retry-btn" @click="$emit('retry')">重试连接</button>
        </template>
        <template v-else>
          <span :class="['ws-indicator', wsConnected ? 'connected' : 'degraded']">
            {{ wsConnected ? '实时已连接' : '轮询模式' }}
          </span>
        </template>
      </div>
    </div>

    <button
      :class="['status-chip', 'metric-chip', 'weather-chip', { 'card-lifted': liftPanel === 'weather' }]"
      @click="$emit('open-panel', 'weather', $event)"
    >
      <div class="status-copy metric-copy">
        <span class="status-label">天气</span>
        <strong class="status-metric">{{ wxTemp }}{{ wxUnit }}</strong>
        <small class="status-range">今 {{ wxLow }} / {{ wxHigh }}{{ wxUnit }}</small>
        <span class="status-footnote">{{ wxStateLabel || weatherText || wxState }}</span>
      </div>
    </button>

    <div class="status-chip metric-chip aqi-chip" :class="aqiLevel">
      <div class="status-copy metric-copy">
        <span class="status-label">空气质量</span>
        <strong class="status-metric">{{ envPm25 }}</strong>
        <small class="status-range">PM2.5</small>
        <span class="status-footnote">{{ aqiText }}</span>
      </div>
    </div>

    <button class="settings-trigger" @click="$emit('open-settings')">
      设置
    </button>
  </header>
</template>
