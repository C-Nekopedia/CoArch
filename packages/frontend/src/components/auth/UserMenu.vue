<script setup lang="ts">
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { useRouter } from 'vue-router'
import Avatar from '@components/ui/Avatar.vue'

interface Props {
  user: any | null
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
  logout: []
}>()

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const menuItems = [
  { icon: '👤', label: '个人主页', action: 'profile' },
  { icon: '⚙️', label: '设置', action: 'settings' },
  { icon: '🔒', label: '退出登录', action: 'logout' }
]

const handleAction = (action: string) => {
  switch (action) {
    case 'profile':
      router.push({ name: 'Profile', params: { username: authStore.user?.username } })
      break
    case 'settings':
      uiStore.showDevelopmentNotice('设置')
      break
    case 'logout':
      authStore.logout()
      uiStore.showSuccess('已退出登录')
      emit('logout')
      router.push({ name: 'Home' })
      break
  }
  emit('close')
}

// 点击外部关闭菜单（预留功能）
// const handleClickOutside = () => {
//   emit('close')
// }
</script>

<template>
  <div class="user-menu-wrapper" @click.stop>
    <div class="user-menu">
      <!-- 用户信息 -->
      <div class="user-info" v-if="user">
        <Avatar
          :src="user.avatar"
          :name="user.username"
          size-preset="md"
          class="user-avatar-large"
        />
        <div class="user-details">
          <div class="user-name">{{ user.username }}</div>
          <div class="user-email">{{ user.email }}</div>
        </div>
      </div>

      <!-- 菜单项 -->
      <div class="menu-items">
        <div
          v-for="item in menuItems"
          :key="item.action"
          class="menu-item"
          @click="handleAction(item.action)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-menu-wrapper {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  z-index: 1001;
}

.user-menu {
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #eef0f2;
}

.user-info {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #eef0f2 100%);
  border-bottom: 1px solid #eef0f2;
}

.user-avatar-large {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: #9499a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-items {
  padding: 8px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.menu-item:hover {
  background-color: #f8f9fa;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  width: 24px;
  text-align: center;
}

.menu-label {
  font-size: 14px;
  color: #18191c;
}

.menu-item:last-child {
  border-top: 1px solid #eef0f2;
  margin-top: 4px;
  padding-top: 16px;
}
</style>