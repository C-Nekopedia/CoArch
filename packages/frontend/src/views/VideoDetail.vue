<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticlesStore } from '@stores/articles'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { formatDate } from '@coarch/shared'
import DropdownMenu from '@components/common/DropdownMenu.vue'
import Avatar from '@components/ui/Avatar.vue'

const route = useRoute()
const router = useRouter()
const articlesStore = useArticlesStore()
const authStore = useAuthStore()
const uiStore = useUIStore()

const videoId = route.params.id as string
const commentText = ref('')
const showEditMenu = ref(false)

// 检查当前用户是否可以编辑视频
const canEdit = computed(() => {
  const article = articlesStore.currentArticle
  return article && authStore.user && article.authorId === authStore.user.id
})

// 编辑菜单项
const editMenuItems = computed(() => [
  { label: '编辑', action: 'edit' },
  { label: '删除', action: 'delete', danger: true }
])

// 获取B站播放器iframe的src
const bilibiliIframeSrc = computed(() => {
  const bvid = articlesStore.currentArticle?.bvid
  if (!bvid) return ''

  return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1`
})

// 检查是否有B站视频
const hasBilibiliVideo = computed(() => {
  return !!articlesStore.currentArticle?.bilibiliUrl
})

const submitComment = async () => {
  if (!commentText.value.trim()) {
    uiStore.showError('请输入评论内容')
    return
  }

  // 检查用户是否登录
  if (!authStore.isAuthenticated) {
    uiStore.showError('请先登录后再发表评论')
    // 可以在这里添加跳转到登录页的逻辑
    // router.push('/login')
    return
  }

  try {
    await articlesStore.addComment(videoId, commentText.value)
    uiStore.showSuccess('评论发表成功')
    commentText.value = ''
  } catch (error) {
    // 错误已在store中处理，这里只显示通用错误
    uiStore.showError('评论发表失败，请稍后重试')
  }
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

// 处理编辑菜单操作
const handleEditAction = async (action: string) => {
  const article = articlesStore.currentArticle
  if (!article) return

  switch (action) {
    case 'edit':
      router.push({ name: 'VideoEdit', params: { id: article.id } })
      break
    case 'delete':
      if (confirm('确定要删除这个视频吗？删除后无法恢复。')) {
        try {
          const result = await articlesStore.deleteArticle(article.id)
          if (result.success) {
            uiStore.showSuccess('视频已删除')
            // 尝试返回上一页，如果无法返回则跳转到用户个人主页或首页
            try {
              if (window.history.length > 1) {
                router.back()
              } else {
                // 如果没有历史记录，跳转到用户个人主页（如果已登录）或首页
                if (authStore.user?.username) {
                  router.push({ name: 'Profile', params: { username: authStore.user.username } })
                } else {
                  router.push({ name: 'Home' })
                }
              }
            } catch (error) {
              // 如果返回失败，跳转到首页
              router.push({ name: 'Home' })
            }
          } else {
            uiStore.showError(result.error || '删除失败')
          }
        } catch (error) {
          uiStore.showError('删除失败，请稍后重试')
        }
      }
      break
  }
  showEditMenu.value = false
}

const toggleEditMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showEditMenu.value = !showEditMenu.value
}

onMounted(async () => {
  await articlesStore.loadArticle(videoId)
})
</script>

<template>
  <div class="video-detail-page">
    <div v-if="articlesStore.currentArticle" class="video-container">
      <!-- 视频标题区域 -->
      <div class="video-header">
        <div class="header-row">
          <h1 class="video-title">{{ articlesStore.currentArticle.title }}</h1>
          <div v-if="canEdit" class="edit-actions">
            <button @click="toggleEditMenu" class="edit-button">
              <span class="edit-icon">⋮</span>
            </button>
            <DropdownMenu
              v-if="showEditMenu"
              :items="editMenuItems"
              position="top-right"
              @action="handleEditAction"
              @close="showEditMenu = false"
            />
          </div>
        </div>
        <div class="video-meta">
          <router-link
            :to="`/profile/${articlesStore.currentArticle.author}`"
            class="author-info-link"
          >
            <div class="author-info">
              <Avatar
                :src="articlesStore.currentArticle.authorAvatar"
                :name="articlesStore.currentArticle.author"
                size-preset="md"
                class="author-avatar"
              />
              <div class="author-name">{{ articlesStore.currentArticle.author }}</div>
            </div>
          </router-link>
          <div class="video-stats">
            <span class="stat-item">播放 {{ formatNumber(articlesStore.currentArticle.bilibiliViewCount) || formatNumber(articlesStore.currentArticle.plays) || '0' }}</span>
            <span class="stat-item">时长 {{ articlesStore.currentArticle.duration }}</span>
            <span class="stat-item">点赞 {{ formatNumber(articlesStore.currentArticle.bilibiliLikeCount) || formatNumber(articlesStore.currentArticle.likes) || '0' }}</span>
            <span v-if="articlesStore.currentArticle.bilibiliAuthor" class="stat-item">来源: {{ articlesStore.currentArticle.bilibiliAuthor }}</span>
          </div>
        </div>
      </div>

      <!-- 视频播放器区域 -->
      <div class="video-player">
        <div v-if="hasBilibiliVideo && bilibiliIframeSrc" class="bilibili-player">
          <iframe
            :src="bilibiliIframeSrc"
            scrolling="no"
            frameborder="no"
            allowfullscreen="true"
            class="bilibili-iframe"
          ></iframe>
        </div>
        <div v-else class="player-placeholder">
          <div class="placeholder-content">
            <div class="play-icon"></div>
            <p>视频播放器</p>
            <p>视频ID: {{ videoId }}</p>
            <p>这里将嵌入B站或其他平台的视频播放器</p>
          </div>
        </div>
      </div>

      <!-- 视频简介 -->
      <div class="video-description">
        <h3>视频简介</h3>
        <p>{{ articlesStore.currentArticle.content }}</p>
      </div>

      <!-- 评论区（复用ArticleDetail的评论区） -->
      <div class="comments-section">
        <h3 class="comments-title">评论 ({{ articlesStore.comments.length }})</h3>

        <!-- 评论表单 -->
        <div class="comment-form">
          <textarea v-model="commentText" placeholder="写下你的评论..." class="comment-input"></textarea>
          <button @click="submitComment" class="comment-submit">发表评论</button>
        </div>

        <div class="comment-list">
          <div v-for="comment in articlesStore.comments" :key="comment.id" class="comment-item">
            <Avatar
                :src="comment.userAvatar"
                :name="comment.userName"
                size-preset="xs"
                class="comment-avatar"
              />
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-name">{{ comment.userName }}</span>
                <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-text">{{ comment.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading">
      加载中...
    </div>
  </div>
</template>

<style scoped>
.video-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.video-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.video-header {
  margin-bottom: 32px;
  border-bottom: 1px solid #eef0f2;
  padding-bottom: 24px;
}

.video-title {
  font-size: 32px;
  font-weight: 700;
  color: #18191c;
  margin-bottom: 20px;
  line-height: 1.3;
}

.video-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  overflow: hidden;
}


.author-name {
  font-size: 16px;
  font-weight: 600;
  color: #18191c;
}

.video-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #9499a0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.video-player {
  margin-bottom: 32px;
}

.player-placeholder {
  aspect-ratio: 16 / 9;
  background: linear-gradient(145deg, #1a1c24, #2a2e3a);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.placeholder-content {
  text-align: center;
}

.play-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.player-placeholder p {
  margin: 8px 0;
  opacity: 0.8;
}

.video-description {
  margin-bottom: 48px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 16px;
}

.video-description h3 {
  font-size: 18px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 12px;
}

.video-description p {
  line-height: 1.6;
  color: #4a5568;
}

.comments-section {
  border-top: 1px solid #eef0f2;
  padding-top: 32px;
}

.comments-title {
  font-size: 20px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 24px;
}

.comment-list {
  margin-bottom: 32px;
}

.comment-item {
  display: flex;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid #f0f2f5;
}

.comment-avatar {
  flex-shrink: 0;
  overflow: hidden;
}

.comment-content {
  flex: 1;
}

.comment-header {
  margin-bottom: 8px;
}

.comment-name {
  font-weight: 600;
  font-size: 14px;
  color: #18191c;
}

.comment-time {
  font-size: 12px;
  color: #9499a0;
  margin-left: 8px;
  font-weight: normal;
}

.comment-text {
  font-size: 14px;
  color: #4a5568;
  line-height: 1.5;
}

.loading {
  text-align: center;
  padding: 80px 0;
  font-size: 18px;
  color: #9499a0;
}

@media (max-width: 860px) {
  .video-detail-page {
    padding: 24px 16px;
  }

  .video-container {
    padding: 24px;
  }

  .video-title {
    font-size: 24px;
  }

  .video-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .video-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
}


/* B站播放器容器 */
.bilibili-player {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 比例 */
  height: 0;
  overflow: hidden;
  border-radius: 16px;
  background-color: #000;
}

.bilibili-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* 作者信息链接样式 */
.author-info-link {
  text-decoration: none;
  color: inherit;
  display: inline-block;
}

.author-info-link:hover .author-name {
  color: #fb7299;
}

.comment-form {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 20px;
}

.comment-input {
  width: 100%;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  margin-bottom: 16px;
  background: white;
}

.comment-input:focus {
  outline: none;
  border-color: #fb7299;
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.comment-submit {
  background: linear-gradient(135deg, #fb7299 0%, #fc5c7d 100%);
  border: none;
  padding: 12px 32px;
  border-radius: 40px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
  margin-left: auto;
  display: block;
}

.comment-submit:hover {
  transform: translateY(-2px);
}

/* 编辑按钮样式 */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
}

.edit-actions {
  position: relative;
  flex-shrink: 0;
  margin-left: 16px;
}

.edit-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #5e636b;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.edit-button:hover {
  background: #eef0f2;
  border-color: #d0d7de;
  color: #18191c;
}

.edit-icon {
  font-size: 18px;
  line-height: 1;
}

/* 响应式样式 */
@media (max-width: 860px) {
  .header-row {
    flex-direction: column;
    gap: 16px;
  }

  .edit-actions {
    margin-left: 0;
    align-self: flex-end;
  }

  .edit-button {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>