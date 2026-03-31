import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MessageType = 'info' | 'success' | 'warning' | 'error'

export interface Message {
  id: number
  text: string
  type: MessageType
  duration: number
}

export const useUIStore = defineStore('ui', () => {
  // 状态
  const theme = ref<'light' | 'dark'>('light')
  const sidebarOpen = ref(false)
  const isLoading = ref(false)
  const messages = ref<Message[]>([])
  let messageId = 1

  // 计算属性
  const hasMessages = computed(() => messages.value.length > 0)
  const unreadCount = computed(() => messages.value.length)

  // 消息管理
  const addMessage = (text: string, type: MessageType = 'info', duration: number = 3000) => {
    const id = messageId++
    const message: Message = { id, text, type, duration }
    messages.value.push(message)

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        removeMessage(id)
      }, duration)
    }

    return id
  }

  const removeMessage = (id: number) => {
    const index = messages.value.findIndex(msg => msg.id === id)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  const clearMessages = () => {
    messages.value = []
  }

  // 快捷方法
  const showInfo = (text: string, duration?: number) => addMessage(text, 'info', duration)
  const showSuccess = (text: string, duration?: number) => addMessage(text, 'success', duration)
  const showWarning = (text: string, duration?: number) => addMessage(text, 'warning', duration)
  const showError = (text: string, duration?: number) => addMessage(text, 'error', duration)
  const showDevelopmentNotice = (featureName?: string) => {
    const message = featureName ? `${featureName}功能开发中` : '功能开发中'
    addMessage(message, 'info', 3000)
  }

  // 主题切换
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // 侧边栏
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const openSidebar = () => {
    sidebarOpen.value = true
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  // 加载状态
  const startLoading = () => {
    isLoading.value = true
  }

  const stopLoading = () => {
    isLoading.value = false
  }

  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      theme.value = savedTheme
    } else {
      // 检测系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // 保存主题设置
  const saveTheme = () => {
    localStorage.setItem('theme', theme.value)
  }

  // 初始化
  initTheme()

  return {
    // 状态
    theme,
    sidebarOpen,
    isLoading,
    messages,

    // 计算属性
    hasMessages,
    unreadCount,

    // 消息方法
    addMessage,
    removeMessage,
    clearMessages,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showDevelopmentNotice,

    // 主题方法
    toggleTheme,
    initTheme,
    saveTheme,

    // 侧边栏方法
    toggleSidebar,
    openSidebar,
    closeSidebar,

    // 加载状态方法
    startLoading,
    stopLoading
  }
})