<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { escapeHtml } from '@utils/dom'

interface Props {
  article: {
    id: string
    title: string
    type: 'article' | 'video'
    meta?: string
    emoji?: string
    link?: string
    formattedDate?: string
    duration?: string
    cover?: string
  }
  profileMode?: boolean
}

const props = defineProps<Props>()
const router = useRouter()

const articleLink = computed(() => {
  if (props.article.link) return props.article.link
  return props.article.type === 'video'
    ? `/videos/${props.article.id}`
    : `/articles/${props.article.id}`
})

const articleTypeText = computed(() => {
  return props.article.type === 'video' ? '视频' : '文章'
})

const handleClick = () => {
  router.push(articleLink.value)
}
</script>

<template>
  <div v-if="!profileMode" class="article-card" @click="handleClick">
    <div class="card-cover">
      <div v-if="article.cover" class="cover-image" :style="{ backgroundImage: 'url(' + article.cover + ')' }"></div>
      <span v-else class="cover-emoji">{{ article.emoji || '' }}</span>
      <span class="article-type">{{ articleTypeText }}</span>
    </div>
    <div class="card-info">
      <div class="article-title">{{ escapeHtml(article.title) }}</div>
      <div v-if="article.meta" class="article-meta">
        <span>{{ article.meta }}</span>
      </div>
      <div v-if="article.formattedDate" class="article-date">
        {{ article.formattedDate }}
      </div>
    </div>
  </div>
  <div v-else class="work-card" @click="handleClick">
    <div class="card-cover">
      <div v-if="article.cover" class="cover-image" :style="{ backgroundImage: 'url(' + article.cover + ')' }"></div>
      <div v-else class="cover-placeholder">{{ article.emoji || '' }}</div>
      <div v-if="article.type === 'video' && article.duration" class="duration">{{ article.duration }}</div>
    </div>
    <div class="card-info">
      <div class="work-title">{{ escapeHtml(article.title) }}</div>
      <div class="work-meta">
        <span class="submit-time">{{ article.formattedDate || '投稿时间：--' }}</span>
        <span class="work-description">{{ article.meta || '简介：--' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-card {
  display: flex;
  gap: 20px;
  background: #fff;
  border-radius: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  padding: 16px;
  border: 1px solid #eef0f2;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  border-color: transparent;
}

.card-cover {
  width: 160px;
  flex-shrink: 0;
  aspect-ratio: 16 / 9;
  background: linear-gradient(145deg, #d9e0e8, #cbd2da);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;
}

.cover-emoji {
  font-size: 36px;
}

.cover-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 12px;
  background-color: #eef0f2; /* 图片加载失败时的后备背景色 */
}

.article-type {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.card-info {
  flex: 1;
  padding: 4px 0;
  min-width: 0; /* 防止flex内容溢出 */
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #18191c;
}

.article-meta {
  font-size: 12px;
  color: #9499a0;
}

.article-date {
  font-size: 12px;
  color: #9499a0;
  margin-top: 4px;
}

@media (max-width: 680px) {
  .article-card {
    flex-direction: column;
    gap: 12px;
  }

  .card-cover {
    width: 100%;
    max-width: 280px;
  }

  .article-title {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .article-card {
    padding: 12px;
  }

  .card-cover {
    font-size: 24px;
  }

  .cover-emoji {
    font-size: 32px;
  }

  .article-title {
    font-size: 14px;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

/* Profile模式卡片样式 */
.work-card {
  transition: transform 0.2s ease, box-shadow 0.2s;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.work-card:hover {
  transform: translateY(-4px);
}

.work-card .card-cover {
  aspect-ratio: 16 / 9;
  background-color: #eef0f2;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.work-card .cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #d9e0e8, #cbd2da);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #7c7f84;
}

.work-card .duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  backdrop-filter: blur(2px);
}

.work-card .card-info {
  padding: 0 4px;
}

.work-card .work-title {
  font-size: 14px;
  font-weight: 500;
  color: #18191c;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.work-card .work-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #9499a0;
}

.work-card .submit-time,
.work-card .work-description {
  line-height: 1.3;
}

/* 文章列表模式（横向布局） - 由父容器控制 */
</style>