<script setup lang="ts">
import { useUIStore } from '@stores/ui'

const uiStore = useUIStore()
</script>

<template>
  <div class="message-container">
    <transition-group name="message-slide">
      <div
        v-for="message in uiStore.messages"
        :key="message.id"
        class="message"
        :class="`message-${message.type}`"
        @click="uiStore.removeMessage(message.id)"
      >
        <div class="message-content">
          {{ message.text }}
        </div>
        <button class="message-close" @click.stop="uiStore.removeMessage(message.id)">
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
}

.message {
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: transform 0.3s, opacity 0.3s;
}

.message-content {
  flex: 1;
  margin-right: 12px;
}

.message-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: opacity 0.2s, background-color 0.2s;
}

.message-close:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.2);
}

.message-info {
  background: #3498db;
}

.message-success {
  background: #2ecc71;
}

.message-warning {
  background: #f39c12;
}

.message-error {
  background: #e74c3c;
}

.message-slide-enter-from,
.message-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.message-slide-leave-active {
  position: absolute;
}
</style>