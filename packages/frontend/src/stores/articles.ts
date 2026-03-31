import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { formatDate, formatRelativeTime } from '@coarch/shared'
import { toProxyUrl } from '@utils/image'
import { API_ENDPOINTS } from '@coarch/shared'
import api from '@config/api'
import type {
  Article as ApiArticle,
  Comment as ApiComment,
  UpdateArticleRequest,
  DeleteArticleResponse
} from '@coarch/shared'

/**
 * 文章/视频内容状态管理
 *
 * 注意：当前实现为模拟数据，所有内容操作均在本地完成。
 * 后端开发者需要根据以下API规范实现相应的后端接口：
 *
 * 1. GET /api/articles - 获取文章/视频列表（支持分页、类型过滤、搜索）
 *   查询参数：{ page?: number, pageSize?: number, type?: 'article' | 'video', search?: string, ... }
 *   响应体：{ success: boolean, data: { items: Article[], pagination: {...} } }
 *
 * 2. GET /api/articles/:id - 获取单个内容详情
 *   响应体：{ success: boolean, article: Article, relatedArticles?: Article[] }
 *
 * 3. POST /api/articles - 创建新内容（文章或视频）
 *   请求体：{ title: string, content: string, cover?: string, type: 'article' | 'video', ... }
 *   响应体：{ success: boolean, article: Article }
 *
 * 4. GET /api/articles/:id/comments - 获取评论列表
 *   响应体：{ success: boolean, comments: Comment[], pagination?: {...} }
 *
 * 5. POST /api/articles/:id/comments - 添加评论
 *   请求体：{ content: string, parentId?: number }
 *   响应体：{ success: boolean, comment: Comment }
 *
 * 6. POST /api/articles/:id/like - 点赞/取消点赞
 *   响应体：{ success: boolean, likes: number, isLiked: boolean }
 *
 * 详细类型定义请参考：src/types/api.ts
 * API客户端配置请参考：src/config/api.ts
 */

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export const useArticlesStore = defineStore('articles', () => {
  // 状态
  const articles = ref<ApiArticle[]>([])
  const currentArticle = ref<ApiArticle | null>(null)
  const comments = ref<ApiComment[]>([])
  const pagination = ref<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 模拟数据（已注释，使用真实API）
  /* const mockArticles: Article[] = [
    {
      id: 1,
      title: "极简桌面改造｜沉浸式搭建我的创作角落",
      content: "从零开始布置我的极简桌面，分享高效创作环境的搭建思路与好物推荐。",
      cover: "",
      author: "设计爱好者",
      authorAvatar: "",
      createdAt: "2025-03-20T10:30:00Z",
      views: 32000,
      likes: 1245,
      comments: 89,
      type: 'video',
      duration: "04:28",
      plays: "3.2万播放"
    },
    {
      id: 2,
      title: "用代码写一首BGM？AI生成+手动调校全记录",
      content: "尝试用AI生成旋律，再手动混音调校，最终完成一首完整的背景音乐，附技术细节。",
      cover: "",
      author: "音乐程序员",
      authorAvatar: "",
      createdAt: "2025-03-18T14:20:00Z",
      views: 18000,
      likes: 2673,
      comments: 156,
      type: 'video',
      duration: "07:12",
      plays: "1.8万播放"
    },
    {
      id: 3,
      title: "B站个人主页极简设计｜HTML/CSS仿写思路分享",
      content: "手把手教你复刻一个极简风格的B站个人主页，涉及flex、grid布局和响应式设计。",
      cover: "",
      author: "前端设计师",
      authorAvatar: "",
      createdAt: "2025-03-15T09:15:00Z",
      views: 56000,
      likes: 4120,
      comments: 234,
      type: 'video',
      duration: "12:01",
      plays: "5.6万播放"
    },
    {
      id: 4,
      title: "极简主义设计：如何用CSS网格重构个人主页",
      content: "探讨极简主义设计原则，分享使用CSS网格系统重构个人主页的实践经验。",
      cover: "",
      author: "UI设计师",
      authorAvatar: "",
      createdAt: "2025-03-10T16:45:00Z",
      views: 12800,
      likes: 845,
      comments: 42,
      type: 'article'
    },
    {
      id: 5,
      title: "独立创作者的工具箱：2025年实用软件推荐",
      content: "分享独立创作者在2025年必备的实用软件工具，涵盖设计、开发、内容创作等领域。",
      cover: "",
      author: "工具爱好者",
      authorAvatar: "",
      createdAt: "2025-03-05T11:20:00Z",
      views: 9800,
      likes: 623,
      comments: 31,
      type: 'article'
    }
  ] */

  /* const mockComments: Comment[] = [
    {
      id: 1,
      articleId: 1,
      userId: "user1",
      userName: "设计爱好者",
      userAvatar: "",
      content: "这个桌面布置太有启发性了！我也准备按这个思路改造我的工作区。",
      createdAt: "2025-03-21T09:15:00Z",
      likes: 24
    },
    {
      id: 2,
      articleId: 1,
      userId: "user2",
      userName: "极简生活",
      userAvatar: "",
      content: "请问那个显示器支架是什么牌子的？看起来很稳固。",
      createdAt: "2025-03-21T14:30:00Z",
      likes: 12
    },
    {
      id: 3,
      articleId: 2,
      userId: "user3",
      userName: "音乐制作人",
      userAvatar: "",
      content: "AI生成音乐的技术越来越成熟了，期待更多这样的教程！",
      createdAt: "2025-03-19T16:45:00Z",
      likes: 45
    }
  ] */

  // 计算属性
  const formattedArticles = computed(() => {
    return articles.value.map((article: ApiArticle) => ({
      ...article,
      formattedDate: formatDate(article.createdAt),
      relativeDate: formatRelativeTime(article.createdAt)
    }))
  })

  const videoArticles = computed(() => articles.value.filter((a: ApiArticle) => a.type === 'video'))
  const articleArticles = computed(() => articles.value.filter((a: ApiArticle) => a.type === 'article'))

  // 加载文章列表 - 真实API调用
  const loadArticles = async (page: number = 1, type?: 'article' | 'video', pageSize?: number) => {
    isLoading.value = true
    error.value = null

    try {
      // 构建查询参数
      const params: Record<string, string | number> = {
        page,
        pageSize: pageSize || pagination.value.pageSize
      }
      if (type) {
        params.type = type
      }

      // 调用真实API（带令牌自动刷新）
      const response = await api.requestWithRetry<any>(API_ENDPOINTS.ARTICLES.LIST, {
        method: 'GET',
        params,
      })

      if (response.success && response.data) {
        // 映射后端文章数据到前端接口
        articles.value = response.data.items.map((backendArticle: any) => ({
          ...backendArticle,
          author: backendArticle.user?.username || '未知作者',
          authorId: backendArticle.user?.id || backendArticle.userId || '',
          authorAvatar: backendArticle.user?.avatar || '',
          views: backendArticle.viewsCount || 0,
          likes: backendArticle.likesCount || 0,
          comments: backendArticle.commentsCount || 0,
          plays: backendArticle.plays || 0, // 播放量（用于视频）
          excerpt: backendArticle.excerpt || '',
          cover: toProxyUrl(backendArticle.cover) || '',
          duration: backendArticle.duration || '',
          bilibiliUrl: backendArticle.bilibiliUrl || '',
          bvid: backendArticle.bvid || '', // 新增：B站视频BV号
          bilibiliViewCount: backendArticle.bilibiliViewCount || 0, // B站播放量
          bilibiliLikeCount: backendArticle.bilibiliLikeCount || 0, // B站点赞量
          bilibiliDanmakuCount: backendArticle.bilibiliDanmakuCount || 0, // B站弹幕数
          bilibiliAuthor: backendArticle.bilibiliAuthor || '', // B站视频作者
          tags: backendArticle.tags || [],
          category: backendArticle.category || '',
          isLiked: backendArticle.isLiked || false,
          isBookmarked: backendArticle.isBookmarked || false,
          createdAt: backendArticle.createdAt,
          updatedAt: backendArticle.updatedAt,
          publishedAt: backendArticle.publishedAt,
        }))
        pagination.value = response.data.pagination

        return {
          success: true,
          articles: response.data.items,
          pagination: response.data.pagination
        }
      } else {
        error.value = response.error || '加载文章失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      console.error('loadArticles失败:', err)
      error.value = err instanceof Error ? err.message : '加载文章失败'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 加载单个文章 - 真实API调用
  const loadArticle = async (id: string) => {
    isLoading.value = true
    error.value = null

    try {
      // 获取文章详情（带令牌自动刷新）
      const articleResponse = await api.requestWithRetry<any>(API_ENDPOINTS.ARTICLES.DETAIL(Number(id)), {
        method: 'GET',
      })
      if (!articleResponse.success || !articleResponse.data) {
        throw new Error(articleResponse.error || '加载文章详情失败')
      }

      // 将后端响应映射到前端Article接口
      const backendArticle = articleResponse.data
      currentArticle.value = {
        ...backendArticle,
        id: backendArticle.id,
        title: backendArticle.title,
        content: backendArticle.content,
        author: backendArticle.user?.username || '未知作者',
        authorId: backendArticle.user?.id || backendArticle.userId || '',
        authorAvatar: backendArticle.user?.avatar || '',
        views: backendArticle.viewsCount || 0,
        likes: backendArticle.likesCount || 0,
        comments: backendArticle.commentsCount || 0,
        plays: backendArticle.plays || 0, // 播放量（用于视频）
        excerpt: backendArticle.excerpt || '',
        cover: toProxyUrl(backendArticle.cover) || '',
        duration: backendArticle.duration || '',
        bilibiliUrl: backendArticle.bilibiliUrl || '',
        bvid: backendArticle.bvid || '', // 新增：B站视频BV号
        bilibiliViewCount: backendArticle.bilibiliViewCount || 0, // B站播放量
        bilibiliLikeCount: backendArticle.bilibiliLikeCount || 0, // B站点赞量
        bilibiliDanmakuCount: backendArticle.bilibiliDanmakuCount || 0, // B站弹幕数
        bilibiliAuthor: backendArticle.bilibiliAuthor || '', // B站视频作者
        tags: backendArticle.tags || [],
        category: backendArticle.category || '',
        isLiked: backendArticle.isLiked || false,
        isBookmarked: backendArticle.isBookmarked || false,
        type: backendArticle.type,
        // 日期字段保持原样
        createdAt: backendArticle.createdAt,
        updatedAt: backendArticle.updatedAt,
        publishedAt: backendArticle.publishedAt,
      }

      // 获取评论列表（带令牌自动刷新）
      const commentsResponse = await api.requestWithRetry<any>(API_ENDPOINTS.COMMENTS.LIST(Number(id)), {
        method: 'GET',
        params: {
          page: 1,
          pageSize: 50
        }
      })
      if (commentsResponse.success && commentsResponse.data) {
        // 映射后端评论数据到前端接口
        comments.value = commentsResponse.data.items.map((backendComment: any) => ({
          id: backendComment.id,
          articleId: backendComment.articleId,
          userId: backendComment.userId,
          userName: backendComment.user?.username || '匿名用户',
          userAvatar: backendComment.user?.avatar || '',
          content: backendComment.content,
          createdAt: backendComment.createdAt,
          updatedAt: backendComment.updatedAt,
          likes: backendComment.likesCount || 0,
          replies: backendComment.replies ? backendComment.replies.map((reply: any) => ({
            id: reply.id,
            articleId: reply.articleId,
            userId: reply.userId,
            userName: reply.user?.username || '匿名用户',
            userAvatar: reply.user?.avatar || '',
            content: reply.content,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            likes: reply.likesCount || 0,
            replies: reply.replies || [],
            parentId: reply.parentId,
            isLiked: reply.isLiked || false,
          })) : [],
          parentId: backendComment.parentId,
          isLiked: backendComment.isLiked || false,
        }))
      } else {
        comments.value = [] // 如果加载评论失败，清空评论列表
      }

      return { success: true, data: currentArticle.value }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载文章详情失败'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 添加评论 - 真实API调用
  const addComment = async (articleId: string, content: string, parentId?: string) => {
    try {
      const requestBody: any = { content }
      if (parentId) {
        requestBody.parentId = parentId
      }

      const response = await api.requestWithRetry<any>(API_ENDPOINTS.COMMENTS.CREATE(Number(articleId)), {
        method: 'POST',
        body: requestBody,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || '添加评论失败')
      }

      // 映射后端评论数据到前端接口
      const backendComment = response.data as any
      const mappedComment = {
        id: backendComment.id,
        articleId: backendComment.articleId,
        userId: backendComment.userId,
        userName: backendComment.user?.username || '当前用户',
        userAvatar: backendComment.user?.avatar || '',
        content: backendComment.content,
        createdAt: backendComment.createdAt,
        updatedAt: backendComment.updatedAt,
        likes: backendComment.likesCount || 0,
        replies: backendComment.replies ? backendComment.replies.map((reply: any) => ({
          id: reply.id,
          articleId: reply.articleId,
          userId: reply.userId,
          userName: reply.user?.username || '匿名用户',
          userAvatar: reply.user?.avatar || '',
          content: reply.content,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          likes: reply.likesCount || 0,
          replies: reply.replies || [],
          parentId: reply.parentId,
          isLiked: reply.isLiked || false,
        })) : [],
        parentId: backendComment.parentId,
        isLiked: backendComment.isLiked || false,
      }
      // 将新评论添加到列表前面
      comments.value.unshift(mappedComment)
      return { success: true, comment: mappedComment }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加评论失败'
      return { success: false, error: error.value }
    }
  }

  // 创建文章/视频 - 真实API调用（带令牌自动刷新）
  const createArticle = async (articleData: any) => {
    isLoading.value = true
    error.value = null

    // 调试：显示发送的数据
    console.log('createArticle 发送的数据:', JSON.stringify(articleData, null, 2))

    try {
      const response = await api.requestWithRetry<any>(API_ENDPOINTS.ARTICLES.CREATE, {
        method: 'POST',
        body: JSON.stringify(articleData),
      })

      if (response.success && response.data) {
        // 将新创建的文章添加到列表前面
        const backendArticle = response.data
        const mappedArticle = {
          ...backendArticle,
          author: backendArticle.user?.username || '未知作者',
          authorId: backendArticle.user?.id || backendArticle.userId || '',
          authorAvatar: backendArticle.user?.avatar || '',
          views: backendArticle.viewsCount || 0,
          likes: backendArticle.likesCount || 0,
          comments: backendArticle.commentsCount || 0,
          plays: backendArticle.plays || 0,
          excerpt: backendArticle.excerpt || '',
          cover: toProxyUrl(backendArticle.cover) || '',
          duration: backendArticle.duration || '',
          bilibiliUrl: backendArticle.bilibiliUrl || '',
          bvid: backendArticle.bvid || '',
          bilibiliViewCount: backendArticle.bilibiliViewCount || 0,
          bilibiliLikeCount: backendArticle.bilibiliLikeCount || 0,
          bilibiliDanmakuCount: backendArticle.bilibiliDanmakuCount || 0,
          bilibiliAuthor: backendArticle.bilibiliAuthor || '',
          tags: backendArticle.tags || [],
          category: backendArticle.category || '',
          isLiked: backendArticle.isLiked || false,
          isBookmarked: backendArticle.isBookmarked || false,
          createdAt: backendArticle.createdAt,
          updatedAt: backendArticle.updatedAt,
          publishedAt: backendArticle.publishedAt,
        }

        // 添加到文章列表前面
        articles.value.unshift(mappedArticle)

        return { success: true, article: mappedArticle }
      } else {
        error.value = response.error || '创建内容失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      console.error('createArticle失败:', err)
      error.value = err instanceof Error ? err.message : '创建内容失败'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 点赞文章 - 真实API调用
  const likeArticle = async (id: string) => {
    try {
      const response = await api.requestWithRetry<{ likes: number; isLiked: boolean }>(API_ENDPOINTS.ARTICLES.LIKE(Number(id)), {
        method: 'POST',
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || '点赞操作失败')
      }

      // 更新文章列表中的点赞数
      const article = articles.value.find((a: ApiArticle) => a.id === id)
      if (article) {
        article.likes = response.data.likes
        article.isLiked = response.data.isLiked
      }

      // 更新当前文章的点赞数
      if (currentArticle.value && currentArticle.value.id === id) {
        currentArticle.value.likes = response.data.likes
        currentArticle.value.isLiked = response.data.isLiked
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '点赞操作失败'
      console.error('点赞失败:', err)
    }
  }

  // 更新文章 - 真实API调用
  const updateArticle = async (id: string, articleData: UpdateArticleRequest) => {
    isLoading.value = true
    error.value = null

    try {
      console.log('更新文章请求:', { id, articleData })
      const response = await api.requestWithRetry<any>(API_ENDPOINTS.ARTICLES.UPDATE(Number(id)), {
        method: 'PUT',
        body: JSON.stringify(articleData),
      })
      console.log('更新文章响应:', response)

      if (response.success && response.data) {
        const backendArticle = response.data
        const mappedArticle = {
          ...backendArticle,
          author: backendArticle.user?.username || '未知作者',
          authorId: backendArticle.user?.id || backendArticle.userId || '',
          authorAvatar: backendArticle.user?.avatar || '',
          views: backendArticle.viewsCount || 0,
          likes: backendArticle.likesCount || 0,
          comments: backendArticle.commentsCount || 0,
          plays: backendArticle.plays || 0,
          excerpt: backendArticle.excerpt || '',
          cover: toProxyUrl(backendArticle.cover) || '',
          duration: backendArticle.duration || '',
          bilibiliUrl: backendArticle.bilibiliUrl || '',
          bvid: backendArticle.bvid || '',
          bilibiliViewCount: backendArticle.bilibiliViewCount || 0,
          bilibiliLikeCount: backendArticle.bilibiliLikeCount || 0,
          bilibiliDanmakuCount: backendArticle.bilibiliDanmakuCount || 0,
          bilibiliAuthor: backendArticle.bilibiliAuthor || '',
          tags: backendArticle.tags || [],
          category: backendArticle.category || '',
          isLiked: backendArticle.isLiked || false,
          isBookmarked: backendArticle.isBookmarked || false,
          createdAt: backendArticle.createdAt,
          updatedAt: backendArticle.updatedAt,
          publishedAt: backendArticle.publishedAt,
        }

        // 更新文章列表中的文章
        const articleIndex = articles.value.findIndex((a: ApiArticle) => a.id === id)
        if (articleIndex !== -1) {
          articles.value[articleIndex] = mappedArticle
        }

        // 更新当前文章
        if (currentArticle.value && currentArticle.value.id === id) {
          currentArticle.value = mappedArticle
        }

        return { success: true, article: mappedArticle }
      } else {
        error.value = response.error || '更新文章失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新文章失败'
      console.error('更新文章失败:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 删除文章 - 真实API调用
  const deleteArticle = async (id: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.requestWithRetry<DeleteArticleResponse>(API_ENDPOINTS.ARTICLES.DELETE(Number(id)), {
        method: 'DELETE',
      })

      if (response.success) {
        // 从文章列表中删除
        articles.value = articles.value.filter((a: ApiArticle) => a.id !== id)

        // 清空当前文章（如果正在查看被删除的文章）
        if (currentArticle.value && currentArticle.value.id === id) {
          currentArticle.value = null
          comments.value = []
        }

        return { success: true, data: response.data }
      } else {
        error.value = response.error || '删除文章失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除文章失败'
      console.error('删除文章失败:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 初始化加载 - 使用真实API
  const init = () => {
    // 清空状态
    articles.value = []
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }

    // 异步加载第一页数据（错误已在loadArticles中处理）
    Promise.resolve().then(() => loadArticles(1).catch(err => {
      console.error('初始化加载文章失败:', err)
    }))
  }

  // 初始化
  init()

  return {
    // 状态
    articles: formattedArticles,
    currentArticle,
    comments,
    pagination,
    isLoading,
    error,

    // 计算属性
    videoArticles,
    articleArticles,

    // 方法
    loadArticles,
    loadArticle,
    addComment,
    createArticle,
    likeArticle,
    updateArticle,
    deleteArticle,
    init
  }
})