<template>
  <div class="statusbar" style="display: flex">
    <div
      class="http-status"
      :class="{ blink: status === 'connecting' }"
      style="font-size: 12px; padding: 4px"
      :style="{ color: indicatorColor(status) }"
    >
      {{ messageText(status) }}
    </div>

    <div
      class="ws-status"
      style="font-size: 12px; padding: 4px"
      :style="{ color: ws ? 'green' : 'red' }"
    >
      WS
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'connecting' | 'connected' | 'error'
  ws: boolean
}>()

const messageText = (status: string) =>
  status === 'connecting'
    ? 'Подключение'
    : status === 'connected'
      ? 'Подключено'
      : status === 'error'
        ? 'Ошибка подключения'
        : 'Статус'

const indicatorColor = (status: string) =>
  status === 'connecting'
    ? 'grey'
    : status === 'connected'
      ? 'green'
      : status === 'error'
        ? 'red'
        : 'grey'
</script>

<style lang="scss" module>
:global(.connection-status .blink) {
  animation: blink 1s infinite;
}

@keyframes blink {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
