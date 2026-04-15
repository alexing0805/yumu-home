<script setup lang="ts">
import type { PanelKey } from '../config'

defineProps<{
  formattedTime: string
  formattedDate: string
  loading: boolean
  errorText: string
  weatherText: string
  wxState: string
  wxTemp: string | number
  wxUnit: string
  envPm25: string
  aqiLevel: string
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
          <span class="ws-indicator">Connecting...</span>
        </template>
        <template v-else-if="errorText">
          <span class="error-text">{{ errorText }}</span>
          <button class="retry-btn" @click="$emit('retry')">Retry</button>
        </template>
        <template v-else>
          <span class="ws-indicator connected">Connected</span>
        </template>
      </div>
    </div>

    <button
      :class="['status-chip', { 'card-lifted': liftPanel === 'weather' }]"
      @click="$emit('open-panel', 'weather', $event)"
    >
      <div class="status-copy">
        <strong>{{ weatherText }}</strong>
        <small>{{ wxState }} {{ wxTemp }}{{ wxUnit }}</small>
      </div>
    </button>

    <div class="status-chip aqi-chip" :class="aqiLevel">
      <div class="status-copy align-right">
        <strong>🍃 AQI {{ envPm25 }}</strong>
        <small>{{ aqiLevel.toUpperCase() }}</small>
      </div>
      <div class="aqi-badge">{{ envPm25 }}</div>
    </div>

    <button class="settings-trigger" @click="$emit('open-settings')">
      ⚙️
    </button>
  </header>
</template>
