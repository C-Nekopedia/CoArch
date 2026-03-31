<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useArticlesStore } from '@stores/articles'
import api from '@config/api'
import type { User, PaginatedResponse } from '@coarch/shared'
import ArticleCard from '@components/article/ArticleCard.vue'
import AuthorCard from '@components/article/AuthorCard.vue'

const articlesStore = useArticlesStore()
const creators = ref<User[]>([])
const isLoadingCreators = ref(false)

const exploreAuthors = () => {
  const section = document.getElementById('authorsSection')
  if (section) section.scrollIntoView({ behavior: 'smooth' })
}

// 加载创作者列表
const loadCreators = async () => {
  isLoadingCreators.value = true
  try {
    const response = await api.requestWithRetry<PaginatedResponse<User>>('/users/creators', {
      method: 'GET',
      params: { page: 1, pageSize: 20 },
      skipAuth: true
    })
    if (response.success && response.data) {
      creators.value = response.data.items
    }
  } catch (error) {
    console.error('加载创作者列表失败:', error)
  } finally {
    isLoadingCreators.value = false
  }
}

// 格式化创作者数据，适配AuthorCard组件
const formattedCreators = computed(() => {
  return creators.value.map(user => ({
    name: user.username,
    avatar: user.avatar || user.username.charAt(0),
    bio: user.bio || '暂无简介',
    stats: `${user.articleCount}篇文章，${user.videoCount}个视频`,
    username: user.username
  }))
})

// 加载最新内容（限制10个）
const loadRecentArticles = async () => {
  await articlesStore.loadArticles(1, undefined, 10)
}

onMounted(async () => {
  await Promise.all([
    loadCreators(),
    loadRecentArticles()
  ])
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">发现有趣的内容创作者</h1>
        <p class="hero-subtitle">从视频到文章，记录灵感与思考</p>
        <button class="hero-btn" @click="exploreAuthors">开始探索</button>
      </div>
    </section>

    <!-- 创作者区域 -->
    <section class="authors-section" id="authorsSection">
      <div class="section-header">
        <h2>创作者</h2>
      </div>
      <div class="authors-grid">
        <AuthorCard
          v-for="author in formattedCreators"
          :key="author.name"
          :author="author"
        />
      </div>
    </section>

    <!-- 最近更新区域 -->
    <section class="updates-section">
      <div class="section-header">
        <h2>最近更新</h2>
      </div>
      <div class="updates-list">
        <ArticleCard
          v-for="article in articlesStore.articles"
          :key="article.id"
          :article="article"
        />
      </div>
    </section>

    <!-- 回到顶部按钮已由App.vue提供 -->
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
}

/* Hero Section */
.hero-section {
  width: 100%;
  background: linear-gradient(135deg, #2a2e3a 0%, #1a1c24 100%);
  padding: 80px 20px;
  text-align: center;
  color: white;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff, #fb7299);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 32px;
}

.hero-btn {
  background-color: #fb7299;
  border: none;
  padding: 12px 32px;
  border-radius: 40px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.hero-btn:hover {
  background-color: #fc5c7d;
  transform: translateY(-2px);
}

/* 作者卡片网格 */
.authors-section,
.updates-section {
  max-width: 1200px;
  margin: 60px auto;
  padding: 0 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 28px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #18191c;
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 响应式 */
@media (max-width: 860px) {
  .hero-title {
    font-size: 36px;
  }

  .authors-grid {
    gap: 20px;
  }
}

@media (max-width: 680px) {
  .hero-section {
    padding: 60px 16px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .authors-grid {
    grid-template-columns: 1fr;
  }
}
</style>