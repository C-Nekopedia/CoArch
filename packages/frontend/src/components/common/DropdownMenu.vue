<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface MenuItem {
  label: string
  icon?: string
  action: string
  danger?: boolean
}

interface Props {
  items: MenuItem[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
  width: '180px'
})

const emit = defineEmits<{
  action: [action: string]
  close: []
}>()

const handleAction = (item: MenuItem) => {
  emit('action', item.action)
  emit('close')
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-wrapper')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="dropdown-wrapper" @click.stop>
    <div class="dropdown-menu" :class="[position]" :style="{ width }">
      <div
        v-for="item in items"
        :key="item.action"
        class="menu-item"
        :class="{ 'menu-item-danger': item.danger }"
        @click="handleAction(item)"
      >
        <span v-if="item.icon" class="menu-icon">{{ item.icon }}</span>
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-wrapper {
  position: absolute;
  z-index: 1001;
}

.dropdown-menu {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #eef0f2;
}

.dropdown-menu.top-right {
  top: 100%;
  right: 0;
  margin-top: 8px;
}

.dropdown-menu.top-left {
  top: 100%;
  left: 0;
  margin-top: 8px;
}

.dropdown-menu.bottom-right {
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
}

.dropdown-menu.bottom-left {
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
}

.menu-items {
  padding: 8px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  min-height: 44px;
  box-sizing: border-box;
}

.menu-item:hover {
  background-color: #f8f9fa;
}

.menu-item-danger {
  color: #e74c3c;
}

.menu-item-danger:hover {
  background-color: #fef2f2;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.menu-label {
  font-size: 14px;
  color: #18191c;
  flex: 1;
}

.menu-item-danger .menu-label {
  color: #e74c3c;
}
</style>