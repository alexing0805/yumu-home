<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  theme: string
  use24Hour: boolean
  motionEnabled: boolean
  haBase: string
  haToken: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'cycle-theme'): void
  (e: 'toggle-clock'): void
  (e: 'toggle-motion'): void
  (e: 'set-ha-base', v: string): void
  (e: 'set-ha-token', v: string): void
}>()

const editBase = ref(props.haBase)
const editToken = ref(props.haToken)
const showConnection = ref(false)

function saveConnection() {
  emit('set-ha-base', editBase.value)
  emit('set-ha-token', editToken.value)
  showConnection.value = false
}
</script>

<template>
  <div class="dialog-card bg-main" @click.stop>
    <div class="dialog-header">
      <div>
        <div class="dialog-eyebrow">Display</div>
        <h3>Settings</h3>
      </div>
      <button class="close-button" @click="$emit('close')">✕</button>
    </div>

    <div class="settings-list">
      <button class="setting-item" @click="$emit('cycle-theme')">
        <span>Theme</span>
        <strong>{{ theme === 'auto' ? 'System' : theme === 'warm' ? 'Warm' : 'Charcoal' }}</strong>
      </button>

      <button class="setting-item" @click="$emit('toggle-clock')">
        <span>Time Format</span>
        <strong>{{ use24Hour ? '24 Hour' : '12 Hour' }}</strong>
      </button>

      <button class="setting-item" @click="$emit('toggle-motion')">
        <span>Animations</span>
        <strong :style="{ color: motionEnabled ? '#67b84f' : 'inherit' }">
          {{ motionEnabled ? 'On' : 'Off' }}
        </strong>
      </button>

      <button class="setting-item" @click="showConnection = !showConnection">
        <span>HA Connection</span>
        <strong>{{ showConnection ? 'Hide ▲' : 'Edit ▼' }}</strong>
      </button>
    </div>

    <!-- HA Connection editor -->
    <div v-if="showConnection" class="settings-connection">
      <label class="setting-field">
        <span>API Base URL</span>
        <input v-model="editBase" type="text" placeholder="/ha-api" />
      </label>
      <label class="setting-field">
        <span>Long-Lived Access Token</span>
        <input v-model="editToken" type="password" placeholder="eyJh..." />
      </label>
      <button class="setting-save" @click="saveConnection">Save & Reconnect</button>
    </div>

    <div class="settings-hint" style="text-align: center;">
      HA connection strings are stored locally on this device.
    </div>
  </div>
</template>
