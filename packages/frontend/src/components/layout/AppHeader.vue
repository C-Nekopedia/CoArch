<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { useRouter } from 'vue-router'
import UserMenu from '@components/auth/UserMenu.vue'
import Avatar from '@components/ui/Avatar.vue'

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const searchQuery = ref('')
const showUserMenu = ref(false)

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const userAvatar = computed(() => authStore.userAvatar || '')
const userName = computed(() => authStore.userName || '')

// 搜索功能
const handleSearch = (e: Event) => {
  e.preventDefault()
  if (searchQuery.value.trim()) {
    // 这里可以实现搜索功能
    uiStore.showInfo(`搜索: ${searchQuery.value}`)
    // 实际开发中可以跳转到搜索页面或调用搜索API
    searchQuery.value = ''
  }
}

// 头像点击事件
const handleAvatarClick = () => {
  if (isAuthenticated.value) {
    showUserMenu.value = !showUserMenu.value
  } else {
    router.push({ name: 'Login' })
  }
}

// 导航链接
const navLinks = [
  { name: '首页', path: '/', active: true },
  { name: '投稿', path: '/submit', requiresAuth: true }
]

// 点击外部关闭用户菜单
const closeUserMenu = () => {
  showUserMenu.value = false
}
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <!-- 左侧：Logo + 导航链接 -->
      <div class="header-left">
        <div class="header-logo">
          <router-link to="/" class="logo-link">Co-Arch</router-link>
        </div>

        <nav class="header-nav">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path === link.path }"
          >
            {{ link.name }}
          </router-link>
        </nav>
      </div>

      <!-- 中间：搜索框 -->
      <div class="header-search">
        <form @submit="handleSearch">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索全站内容..."
            class="search-input"
          />
        </form>
      </div>

      <!-- 右侧：用户头像 -->
      <div class="header-user" @click.stop="handleAvatarClick">
        <Avatar
          v-if="isAuthenticated"
          :src="userAvatar"
          :name="userName"
          size-preset="sm"
          class="user-avatar"
        />
        <div v-else class="user-avatar avatar-placeholder-default">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        <!-- 用户菜单 -->
        <UserMenu
          v-if="isAuthenticated && showUserMenu"
          :user="authStore.user"
          @close="closeUserMenu"
          @logout="showUserMenu = false"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #1a1c24 0%, #2a2e3a 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 60px;
  width: 100%;
  left: 0;
  right: 0;
}

.header-container {
  width: 100%;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-shrink: 0;
}

.header-logo .logo-link {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #fb7299, #fc5c7d);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-decoration: none;
  cursor: pointer;
}

.header-nav {
  display: flex;
  gap: 32px;
}

.nav-link {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #ffffff;
}

.nav-link-active {
  color: #fb7299;
}

.header-search {
  flex: 1;
  display: flex;
  justify-content: center;
  margin-right: 155px;
}

.header-search form {
  max-width: 400px;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 8px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background-color: rgba(255, 255, 255, 0.12);
  font-size: 14px;
  outline: none;
  transition: 0.2s;
  color: white;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input:focus {
  border-color: #fb7299;
  background-color: rgba(255, 255, 255, 0.2);
}

.header-user {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-placeholder-default {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.avatar-placeholder svg {
  width: 55%;
  height: 55%;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-image .avatar-placeholder {
  background-color: #fb7299;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.avatar-image-real {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 响应式设计 */
@media (max-width: 860px) {
  .header-container {
    padding: 0 16px;
  }

  .header-search form {
    max-width: 200px;
  }

  .header-nav {
    gap: 20px;
  }
}

@media (max-width: 680px) {
  .app-header {
    height: auto;
    padding: 12px 0;
  }

  .header-container {
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-search {
    order: 3;
    max-width: 100%;
    margin: 0;
    flex: auto;
  }

  .header-search form {
    max-width: 100%;
  }

  .header-nav {
    order: 1;
    gap: 16px;
  }

  .header-user {
    order: 2;
  }
}
</style>