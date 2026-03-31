<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { toProxyUrl } from '@utils/image'
import api from '@config/api'
import ArticleCard from '@components/article/ArticleCard.vue'
import Avatar from '@components/ui/Avatar.vue'

const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

const activeTab = ref<'videos' | 'articles'>('videos')
const searchQuery = ref('')
const username = computed(() => {
  const paramUsername = route.params.username
  if (Array.isArray(paramUsername)) {
    return paramUsername[0] || authStore.userName || '用户'
  }
  return paramUsername || authStore.userName || '用户'
})

// 用户文章数据
const userArticles = ref<any[]>([])
const isLoadingUserArticles = ref(false)
const userArticlesPagination = ref<any>(null)

// 用户资料数据
const userProfile = ref<any>(null)
const isLoadingUserProfile = ref(false)


// 用户数据
const isCurrentUser = computed(() => {
  const currentUsername = authStore.user?.username
  return currentUsername && currentUsername === username.value
})


const userData = computed(() => {
  // 如果有API返回的用户资料数据，使用它
  if (userProfile.value) {
    return {
      name: userProfile.value.username,
      avatar: userProfile.value.avatar || username.value.charAt(0),
      bio: userProfile.value.bio || '这里是个人简介。',
      stats: {
        followers: formatNumber(userProfile.value.followersCount) || '0',
        works: (userProfile.value.articleCount || 0) + (userProfile.value.videoCount || 0),
        likes: '--' // 后端API暂无点赞总数数据
      }
    }
  }

  // 如果是当前登录用户，使用store中的数据
  if (isCurrentUser.value && authStore.user) {
    return {
      name: authStore.user.username,
      avatar: authStore.user.avatar || username.value.charAt(0),
      bio: authStore.user.bio || '这里是个人简介。',
      stats: {
        followers: formatNumber(authStore.user.followers) || '0',
        works: (authStore.user.articleCount || 0) + (authStore.user.videoCount || 0),
        likes: '--'
      }
    }
  }

  // 默认返回
  return {
    name: username.value,
    avatar: username.value.charAt(0),
    bio: '这里是个人简介。',
    stats: {
      followers: '0',
      works: 0,
      likes: '0'
    }
  }
})

// 计算属性
const filteredArticles = computed(() => {
  // 首先按类型筛选用户文章
  let filtered = userArticles.value.filter((article: any) =>
    activeTab.value === 'videos' ? article.type === 'video' : article.type === 'article'
  )

  // 然后按搜索关键词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((article: any) =>
      article.title.toLowerCase().includes(query)
    )
  }

  return filtered
})

const handleFollow = () => {
  // 关注功能
  uiStore.showDevelopmentNotice('关注')
}

const handleMessage = () => {
  // 私信功能
  uiStore.showDevelopmentNotice('私信')
}

// 格式化数字显示（超过10000显示为"x万"）
const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return ''
  if (num === 0) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  }
  return num.toString()
}

// 加载用户资料
const loadUserProfile = async () => {
  // 对于非当前用户，从API获取用户资料
  isLoadingUserProfile.value = true
  try {
    const response = await api.requestWithRetry(`/users/${username.value}`, {
      method: 'GET',
      skipAuth: true
    })
    if (response.success && response.data) {
      userProfile.value = response.data
    }
  } catch (error) {
    console.error('加载用户资料失败:', error)
  } finally {
    isLoadingUserProfile.value = false
  }
}

// 加载用户文章
const loadUserArticles = async () => {
  isLoadingUserArticles.value = true
  try {
    const type = activeTab.value === 'videos' ? 'video' : 'article'
    const response = await api.requestWithRetry(`/users/${username.value}/articles`, {
      method: 'GET',
      params: {
        page: 1,
        pageSize: 100, // 加载足够多的文章，避免分页复杂性
        type
      },
      skipAuth: true
    })
    if (response.success && response.data) {
      // 映射字段以匹配前端Article接口
      userArticles.value = response.data.items.map((item: any) => ({
        ...item,
        author: item.user?.username || '',
        authorId: item.user?.id || '',
        authorAvatar: item.user?.avatar || '',
        cover: toProxyUrl(item.cover) || '',
        // 保留原始user对象以备其他用途
      }))
      userArticlesPagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('加载用户文章失败:', error)
  } finally {
    isLoadingUserArticles.value = false
  }
}

// 观察activeTab变化重新加载
watch(activeTab, () => {
  loadUserArticles()
})

// 观察username变化重新加载
watch(username, () => {
  loadUserProfile()
  loadUserArticles()
})

onMounted(async () => {
  await Promise.all([
    loadUserProfile(),
    loadUserArticles()
  ])
})
</script>

<template>
  <div class="profile-page">
    <!-- Hero区域（深色背景） -->
    <div class="hero-section">
      <div class="hero-inner">
        <div class="hero-avatar">
          <Avatar
            :src="userData.avatar"
            :name="userData.name"
            size-preset="xl"
            class="big-avatar"
          />
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ username }}</h1>
          <p class="hero-bio">{{ userData.bio }}</p>
          <div class="hero-actions">
            <button class="btn-follow-light" @click="handleFollow">关注</button>
            <button class="btn-message-light" @click="handleMessage">私信</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 次级导航栏（粘性跟随） -->
    <div class="space-nav">
      <div class="space-nav-container">
        <div class="space-tabs">
          <div
            class="space-tab"
            :class="{ active: activeTab === 'videos' }"
            @click="activeTab = 'videos'"
          >
            视频
          </div>
          <div
            class="space-tab"
            :class="{ active: activeTab === 'articles' }"
            @click="activeTab = 'articles'"
          >
            文章
          </div>
        </div>
        <div class="space-search">
          <form @submit.prevent>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索该作者全部投稿..."
              class="search-input"
            />
          </form>
        </div>
      </div>
    </div>

    <!-- 作品区域 -->
    <div class="works-section">
      <div class="works-header">
        <div class="works-title">
          <span class="works-title-text">{{ activeTab === 'videos' ? '全部视频' : '全部文章' }}</span>
          <span class="works-count-num">· {{ filteredArticles.length }}{{ activeTab === 'videos' ? '个视频' : '篇文章' }}</span>
        </div>
      </div>

      <div v-if="isLoadingUserArticles" class="empty-works">
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredArticles.length > 0" class="works-grid" :class="{ 'article-list-mode': activeTab === 'articles' }">
        <ArticleCard
          v-for="article in filteredArticles"
          :key="article.id"
          :article="article"
          :profile-mode="true"
        />
      </div>

      <div v-else class="empty-works">
        <p>{{ searchQuery ? '没有找到相关作品' : '暂无作品' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #ffffff;
}

/* Hero区域 */
.hero-section {
  width: 100%;
  background: linear-gradient(135deg, #1a1c24 0%, #2a2e3a 100%);
  color: white;
  padding-top: 20px;
  padding-bottom: 40px;
}


.hero-inner {
  width: 70%;
  max-width: 1200px;
  margin: 20px auto 0 auto;
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.hero-avatar {
  flex-shrink: 0;
}

.hero-avatar .big-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}


.hero-info {
  flex: 1;
}

.hero-name {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-bio {
  font-size: 14px;
  opacity: 0.85;
  margin: 12px 0 20px 0;
  max-width: 560px;
  line-height: 1.45;
}


.hero-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.btn-follow-light {
  background-color: #fb7299;
  border: none;
  padding: 8px 24px;
  border-radius: 24px;
  color: white;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-follow-light:hover {
  background-color: #fc5c7d;
}

.btn-message-light {
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 24px;
  border-radius: 24px;
  color: white;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-message-light:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

/* 次级导航栏 */
.space-nav {
  position: sticky;
  top: 60px;
  z-index: 150;
  background-color: #fff;
  border-bottom: 1px solid #e9ebef;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.space-nav-container {
  width: 70%;
  max-width: 1200px;
  margin: 0 auto;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.space-tabs {
  display: flex;
  gap: 32px;
  height: 100%;
}

.space-tab {
  font-size: 15px;
  font-weight: 500;
  color: #61666d;
  cursor: pointer;
  display: flex;
  align-items: center;
  position: relative;
  transition: color 0.2s;
}

.space-tab:hover {
  color: #fb7299;
}

.space-tab.active {
  color: #fb7299;
}

.space-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #fb7299;
  border-radius: 2px;
}

.space-search {
  width: 260px;
}

.space-search form {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e3e5e8;
  background-color: #f5f6f7;
  font-size: 13px;
  outline: none;
  transition: 0.2s;
}

.search-input:focus {
  border-color: #fb7299;
  background-color: #fff;
}

/* 作品区域 */
.works-section {
  width: 70%;
  max-width: 1200px;
  margin: 0 auto;
  /* padding: 28px 20px 48px 20px; */
  background-color: #ffffff;
}

.works-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.works-title {
  font-size: 18px;
  font-weight: 600;
  color: #18191c;
}

.works-title-text {
  font-size: 18px;
  font-weight: 600;
  color: #18191c;
}

.works-count-num {
  font-size: 14px;
  font-weight: 400;
  color: #9499a0;
  margin-left: 8px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px 20px;
  transition: all 0.2s;
}

/* 文章列表样式 (横向布局, 每项一行) */
.works-grid.article-list-mode {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 文章卡片专用样式 (横向布局) */
.works-grid.article-list-mode .work-card {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  background: #fff;
  border-radius: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
  padding: 0;
}
.works-grid.article-list-mode .work-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}
.works-grid.article-list-mode .card-cover {
  width: 200px;
  flex-shrink: 0;
  margin-bottom: 0;
  border-radius: 12px;
  aspect-ratio: 16 / 9;
}
.works-grid.article-list-mode .card-info {
  flex: 1;
  padding: 4px 0 4px 0;
}
.works-grid.article-list-mode .work-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.empty-works {
  text-align: center;
  padding: 60px 0;
  color: #9499a0;
  font-size: 14px;
}

/* 视频卡片容器样式 */
:deep(.works-grid:not(.article-list-mode) .work-card) {
  width: 100%;
  box-sizing: border-box;
}

/* 视频卡片封面样式 */
:deep(.works-grid:not(.article-list-mode) .work-card .card-cover) {
  width: 100%;
  margin-bottom: 0;
}

/* 视频卡片标题内边距调整 */
:deep(.works-grid:not(.article-list-mode) .work-card .card-info) {
  padding: 5px;
}

/* 响应式 */
@media (max-width: 1100px) {
  .hero-inner,
  .space-nav-container,
  .works-section {
    width: 80%;
  }

  .works-section {
    padding: 28px 16px 48px 16px;
  }
}

@media (max-width: 860px) {
  .hero-inner,
  .space-nav-container,
  .works-section {
    width: 88%;
  }

  .space-search {
    width: 200px;
  }

  .hero-inner {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    margin-top: 8px;
  }

  .hero-name {
    font-size: 24px;
  }


  .works-section {
    padding: 28px 16px 48px 16px;
  }

  .works-grid.article-list-mode .card-cover {
    width: 150px;
  }
}

@media (max-width: 680px) {
  .space-nav-container {
    flex-wrap: wrap;
    height: auto;
    padding: 8px 0;
    gap: 10px;
  }

  .space-tabs {
    height: auto;
  }

  .space-search {
    width: 100%;
  }

  .works-section {
    padding: 28px 16px 48px 16px;
  }

  .works-grid {
    grid-template-columns: 1fr;
    gap: 20px 12px;
  }

  .works-grid.article-list-mode .work-card {
    gap: 12px;
  }
  .works-grid.article-list-mode .card-cover {
    width: 100px;
  }
  .works-grid.article-list-mode .work-title {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .works-grid:not(.article-list-mode) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .works-grid.article-list-mode .card-cover {
    width: 100px;
  }
}
</style>