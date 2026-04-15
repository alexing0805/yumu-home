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
        <div class="dialog-eyebrow">显示与连接</div>
        <h3>设置</h3>
      </div>
      <button class="close-button" @click="$emit('close')">✕</button>
    </div>

    <div class="settings-list">
      <button class="setting-item" @click="$emit('cycle-theme')">
        <span>主题</span>
        <strong>{{ theme === 'auto' ? '跟随时间' : theme === 'warm' ? '暖色' : '木炭' }}</strong>
      </button>

      <button class="setting-item" @click="$emit('toggle-clock')">
        <span>时间格式</span>
        <strong>{{ use24Hour ? '24 小时制' : '12 小时制' }}</strong>
      </button>

      <button class="setting-item" @click="$emit('toggle-motion')">
        <span>动画效果</span>
        <strong :style="{ color: motionEnabled ? '#67b84f' : 'inherit' }">
          {{ motionEnabled ? '开启' : '关闭' }}
        </strong>
      </button>

      <button class="setting-item" @click="showConnection = !showConnection">
        <span>HA 连接</span>
        <strong>{{ showConnection ? '收起 ▲' : '编辑 ▼' }}</strong>
      </button>
    </div>

    <div v-if="showConnection" class="settings-connection">
      <label class="setting-field">
        <span>API 基础地址</span>
        <input v-model="editBase" type="text" placeholder="/ha-api" />
      </label>
      <label class="setting-field">
        <span>长期访问令牌</span>
        <input v-model="editToken" type="password" placeholder="eyJh..." />
      </label>
      <button class="setting-save" @click="saveConnection">保存并重连</button>
    </div>

    <div class="settings-hint" style="text-align: center;">
      连接信息仅保存在当前这台设备本地。
    </div>
  </div>
</template>
