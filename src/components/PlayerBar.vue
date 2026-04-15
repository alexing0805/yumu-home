<script setup lang="ts">
import type { PanelKey } from '../config'

defineProps<{
  currentPlayer: string
  playerState: string
  mediaTitle: string
  mediaArtist: string
  mediaVolume: number
  liftPanel: PanelKey | null
}>()

defineEmits<{
  (e: 'open-panel', panel: PanelKey, ev: MouseEvent): void
  (e: 'play-pause'): void
  (e: 'next'): void
  (e: 'prev'): void
  (e: 'set-volume', v: number): void
}>()
</script>

<template>
  <footer
    :class="['player-bar', { 'card-lifted': liftPanel === 'music' }]"
    @click="$emit('open-panel', 'music', $event)"
  >
    <div class="player-texts">
      <div class="player-heading">{{ currentPlayer }}</div>
      <strong>{{ mediaTitle || 'Not Playing' }}</strong>
      <span v-if="mediaArtist">{{ mediaArtist }}</span>
      <span v-else-if="!mediaTitle">{{ playerState }}</span>
    </div>

    <div class="player-controls">
      <button class="player-icon" aria-label="Previous" @click.stop="$emit('prev')">⏮</button>
      <button class="player-icon play" aria-label="Play/Pause" @click.stop="$emit('play-pause')">
        {{ playerState === 'playing' ? '⏸' : '▶' }}
      </button>
      <button class="player-icon" aria-label="Next" @click.stop="$emit('next')">⏭</button>
    </div>

    <div class="player-volume" @click.stop>
      <span>{{ Math.round(mediaVolume * 100) }}%</span>
      <input
        type="range"
        class="volume-slider"
        min="0"
        max="1"
        step="0.05"
        :value="mediaVolume"
        @input="$emit('set-volume', Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </footer>
</template>
