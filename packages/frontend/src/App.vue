<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@components/layout/AppHeader.vue'
import AppFooter from '@components/layout/AppFooter.vue'
import MessageContainer from '@components/ui/MessageContainer.vue'
import { useUIStore } from '@stores/ui'
import { onMounted, computed } from 'vue'

const uiStore = useUIStore()
const route = useRoute()

// 是否显示Footer
const showFooter = computed(() => {
  return !!route.meta.showFooter
})

const showHeader = computed(() => {
  return !route.meta.hideHeader
})

// 初始化UI
onMounted(() => {
  uiStore.initTheme()
})
</script>

<template>
  <div id="app">
    <AppHeader v-if="showHeader" />
    <main class="app-main">
      <RouterView />
    </main>
    <AppFooter v-if="showFooter" />
    <MessageContainer />

    <!-- 回到顶部按钮 -->
    <div class="back-to-top" id="backToTop" title="回到顶部">↑</div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.app-main {
  flex: 1;
}
</style>