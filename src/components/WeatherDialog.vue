<script setup lang="ts">
import { WEATHER_ICON, WEEKDAY_NAMES, type ForecastDay } from '../config'

defineProps<{
  eyebrow: string
  title: string
  weatherText: string
  wxState: string
  wxStateLabel: string
  wxTemp: string | number
  wxFeels: string | number
  wxHum: string | number
  wxWind: string | number
  wxWindSpeed: string | number
  wxPressure: string | number
  wxVis: string | number
  wxDew: string | number
  wxCloud: string | number
  wxUnit: string
  forecast: ForecastDay[]
}>()

defineEmits<{
  (e: 'close'): void
}>()

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return '今天'
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`
}
</script>

<template>
  <section class="dialog-card bg-dark">
    <header class="dialog-header">
      <div>
        <div class="dialog-eyebrow">{{ eyebrow }}</div>
        <h3>{{ title }}</h3>
      </div>
      <button class="close-button" @click="$emit('close')">关闭</button>
    </header>
    <p class="dialog-summary">{{ weatherText }} · {{ wxStateLabel || wxState }}</p>

    <!-- 当前天气 -->
    <div class="wx-current">
      <div class="wx-big-temp">
        <span class="wx-icon">{{ WEATHER_ICON[wxState] || '🌤️' }}</span>
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
          <span class="wx-fc-icon">{{ WEATHER_ICON[day.condition] || '🌤️' }}</span>
          <span class="wx-fc-text">{{ day.text }}</span>
          <span class="wx-fc-temps">
            <strong>{{ day.temperature }}°</strong>
            <span class="wx-fc-low">{{ day.templow }}°</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
