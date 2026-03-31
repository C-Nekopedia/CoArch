import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { useArticlesStore } from '@stores/articles'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫：认证检查
// TODO: 后端集成注意事项
// 1. 当前认证检查仅依赖本地token存在性，未验证token有效性
// 2. 后端需要提供token验证接口，建议实现：GET /api/auth/verify 或使用中间件验证
// 3. 需要考虑token刷新机制，避免用户在操作过程中突然需要重新登录
// 4. 对于需要敏感权限的路由，建议后端返回用户权限信息进行细粒度控制
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  // 设置页面标题
  const title = to.meta.title as string || 'Co-Arch'
  document.title = title

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    uiStore.showWarning('请先登录后再访问')
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 检查是否仅限访客（已登录用户不能访问）
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    uiStore.showInfo('您已登录，将跳转到首页')
    next({ name: 'Home' })
    return
  }

  // 检查是否需要内容所有权（编辑/删除权限）
  if (to.meta.requiresOwnership) {
    const articlesStore = useArticlesStore()
    const articleId = to.params.id as string

    if (!authStore.isAuthenticated || !authStore.user) {
      uiStore.showError('请先登录后再访问')
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    try {
      // 加载文章数据
      const result = await articlesStore.loadArticle(articleId)
      if (!result.success || !result.data) {
        uiStore.showError('内容不存在或加载失败')
        next({ name: 'Home' })
        return
      }

      const article = result.data
      // 检查当前用户是否是作者
      if (article.authorId !== authStore.user.id) {
        uiStore.showError('您没有权限编辑此内容')
        next({ name: 'Home' })
        return
      }
    } catch (error) {
      console.error('检查内容所有权失败:', error)
      uiStore.showError('权限验证失败，请稍后重试')
      next({ name: 'Home' })
      return
    }
  }

  next()
})

// 路由错误处理
router.onError((error) => {
  const uiStore = useUIStore()
  console.error('路由错误:', error)
  uiStore.showError('页面加载失败，请刷新重试')
})

export default router