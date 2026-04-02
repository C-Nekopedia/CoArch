<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
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

const articleId = route.params.id as string
const commentText = ref('')
const showEditMenu = ref(false)

// 检查当前用户是否可以编辑文章
const canEdit = computed(() => {
  const article = articlesStore.currentArticle
  return article && authStore.user && article.authorId === authStore.user.id
})

// 编辑菜单项
const editMenuItems = computed(() => [
  { label: '编辑', action: 'edit' },
  { label: '删除', action: 'delete', danger: true }
])

const formattedDate = computed(() => {
  if (articlesStore.currentArticle?.createdAt) {
    return formatDate(articlesStore.currentArticle.createdAt)
  }
  return ''
})

onMounted(async () => {
  await articlesStore.loadArticle(articleId)
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
    await articlesStore.addComment(articleId, commentText.value)
    uiStore.showSuccess('评论发表成功')
    commentText.value = ''
  } catch (error) {
    // 错误已在store中处理，这里只显示通用错误
    uiStore.showError('评论发表失败，请稍后重试')
  }
}

// 处理编辑菜单操作
const handleEditAction = async (action: string) => {
  const article = articlesStore.currentArticle
  if (!article) return

  switch (action) {
    case 'edit':
      router.push({ name: 'ArticleEdit', params: { id: article.id } })
      break
    case 'delete':
      if (confirm('确定要删除这篇文章吗？删除后无法恢复。')) {
        try {
          const result = await articlesStore.deleteArticle(article.id)
          if (result.success) {
            uiStore.showSuccess('文章已删除')
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
</script>

<template>
  <div class="article-detail-page">
    <div v-if="articlesStore.currentArticle" class="article-container">
      <!-- 文章标题区域 -->
      <div class="article-header">
        <div class="header-row">
          <h1 class="article-title">{{ articlesStore.currentArticle.title }}</h1>
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
        <div class="article-meta">
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
          <div class="article-stats">
            <span class="stat-item">{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- 文章内容区域 -->
      <div class="article-content">
        <div v-if="articlesStore.currentArticle.content" class="content-html" v-html="articlesStore.currentArticle.content"></div>
        <div v-else class="content-placeholder">
          <p>暂无内容</p>
        </div>
      </div>

      <!-- 评论区 -->
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
.article-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.article-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.article-header {
  margin-bottom: 32px;
  border-bottom: 1px solid #eef0f2;
  padding-bottom: 24px;
}

.article-title {
  font-size: 32px;
  font-weight: 700;
  color: #18191c;
  margin-bottom: 20px;
  line-height: 1.3;
}

.article-meta {
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

.article-stats {
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

.article-content {
  margin-bottom: 48px;
  line-height: 1.8;
  color: #4a5568;
}

.content-placeholder {
  background: #f8f9fa;
  padding: 32px;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
  text-align: center;
  color: #5e636b;
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

.loading {
  text-align: center;
  padding: 80px 0;
  font-size: 18px;
  color: #9499a0;
}

@media (max-width: 860px) {
  .article-detail-page {
    padding: 24px 16px;
  }

  .article-container {
    padding: 24px;
  }

  .article-title {
    font-size: 24px;
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .article-stats {
    flex-wrap: wrap;
    gap: 12px;
  }

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

/* 作者信息链接样式 */
.author-info-link {
  text-decoration: none;
  color: inherit;
  display: inline-block;
}

.author-info-link:hover .author-name {
  color: #fb7299;
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
/* 文章内容中的图片样式 */
.content-html :deep(img) {
  max-width: 80% !important;
  min-width: 30% !important;
  height: auto !important;
  width: auto !important;
  display: block !important;
  margin: 1em auto !important;
  border-radius: 8px !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .content-html :deep(img) {
    max-width: 100% !important;
    min-width: 50% !important;
  }
}

</style>