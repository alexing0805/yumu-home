<script setup lang="ts">
import { computed } from 'vue'
import type { PanelKey } from '../config'

defineEmits<{
  (e: 'open-panel', panel: PanelKey, ev: MouseEvent): void
  (e: 'play-pause'): void
  (e: 'next'): void
  (e: 'prev'): void
  (e: 'set-volume', v: number): void
}>()

const props = defineProps<{
  currentPlayer: string
  playerState: string
  mediaTitle: string
  mediaArtist: string
  mediaVolume: number
  liftPanel: PanelKey | null
}>()

const playerStateText = computed(() => {
  const labels: Record<string, string> = {
    playing: '播放中',
    paused: '已暂停',
    idle: '待机',
    off: '已关闭',
    unavailable: '离线',
    unknown: '未知',
  }

  return labels[props.playerState] ?? props.playerState
})

const playButtonText = computed(() => props.playerState === 'playing' ? '停' : '播')
</script>

<template>
  <footer
    :class="['player-bar', { 'card-lifted': props.liftPanel === 'music' }]"
    @click="$emit('open-panel', 'music', $event)"
  >
    <div class="player-texts">
      <div class="player-kicker">媒体播放</div>
      <div class="player-heading">{{ props.currentPlayer }}</div>
      <strong>{{ props.mediaTitle || '暂无播放' }}</strong>
      <div class="player-meta-row">
        <span class="player-state-badge">{{ playerStateText }}</span>
        <span v-if="props.mediaArtist" class="player-artist">{{ props.mediaArtist }}</span>
      </div>
    </div>

    <div class="player-controls">
      <button class="player-icon" aria-label="上一首" @click.stop="$emit('prev')">前</button>
      <button class="player-icon play" aria-label="播放或暂停" @click.stop="$emit('play-pause')">
        {{ playButtonText }}
      </button>
      <button class="player-icon" aria-label="下一首" @click.stop="$emit('next')">后</button>
    </div>

    <div class="player-volume" @click.stop>
      <span class="player-volume-label">音量 {{ Math.round(props.mediaVolume * 100) }}%</span>
      <input
        type="range"
        class="volume-slider"
        min="0"
        max="1"
        step="0.05"
        :value="props.mediaVolume"
        @input="$emit('set-volume', Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </footer>
</template>
