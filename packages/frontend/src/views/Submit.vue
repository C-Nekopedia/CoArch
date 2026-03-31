<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@stores/ui'
import { useArticlesStore } from '@stores/articles'
import { useAuthStore } from '@stores/auth'
import { uploadImage } from '@services/api-examples'
import type { CreateArticleRequest, UpdateArticleRequest } from '@coarch/shared'

const uiStore = useUIStore()
const articlesStore = useArticlesStore()
const authStore = useAuthStore()
const router = useRouter()

// Props
interface Props {
  mode?: 'create' | 'edit'
  articleId?: string
  articleType?: 'article' | 'video'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  articleType: 'video'
})

// 投稿类型
const activeTab = ref<'video' | 'article'>(props.mode === 'edit' ? props.articleType : 'video')

// 计算属性
const isEditMode = computed(() => props.mode === 'edit')
const pageTitle = computed(() => {
  if (props.mode === 'edit') {
    return props.articleType === 'video' ? '编辑视频' : '编辑文章'
  }
  return props.articleType === 'video' ? '视频投稿' : '文章投稿'
})
const submitButtonText = computed(() => {
  return '发表'
})
const containerClass = computed(() => ({
  'edit-mode': isEditMode.value
}))

// 加载文章数据用于编辑
const loadArticleForEdit = async (id: string) => {
  try {
    const result = await articlesStore.loadArticle(id)
    if (result.success && result.data) {
      const article = result.data
      if (article.type === 'article') {
        articleForm.value.title = article.title
        editorContent.value = article.content
        // 加载现有封面URL
        articleForm.value.coverUrl = article.cover || null

        // 等待DOM更新后设置编辑器内容
        await nextTick()
        setEditorContent(article.content)
      } else if (article.type === 'video') {
        videoForm.value.bilibiliUrl = article.bilibiliUrl || ''
        videoForm.value.title = article.title
        videoForm.value.description = article.content || ''
      }
    } else {
      uiStore.showError(result.error || '加载文章数据失败')
    }
  } catch (error) {
    uiStore.showError('加载文章数据失败，请稍后重试')
    console.error('加载文章数据失败:', error)
  }
}


// 视频投稿表单数据
const videoForm = ref({
  bilibiliUrl: '',
  title: '',
  description: ''
})

// 文章投稿表单数据
const articleForm = ref({
  title: '',
  coverFile: null as File | null, // 新选择的封面文件
  coverUrl: null as string | null, // 现有封面URL或新上传的URL
  content: ''
})

// 富文本编辑器内容
const editorContent = ref('')


// TODO: 后端需要实现视频投稿API
// 需要调用：POST /api/articles
// 请求体：{
//   title: string,
//   content: string,
//   type: 'video',
//   bilibiliUrl: string,
//   ...其他字段
// }
// 后端应实现B站链接解析功能，自动获取视频封面、时长、播放量等信息
// 实现提示：参考 src/services/api-examples.ts 中的示例代码
const handleVideoSubmit = async () => {
  // 检查用户是否登录
  if (!authStore.isAuthenticated) {
    uiStore.showError('请先登录后再投稿')
    return
  }

  // 验证表单
  if (!videoForm.value.title) {
    uiStore.showError('请填写标题')
    return
  }

  // 创建模式需要B站链接，编辑模式可以保持不变
  if (props.mode !== 'edit' && !videoForm.value.bilibiliUrl) {
    uiStore.showError('请填写B站链接')
    return
  }

  // 构建请求数据
  let requestData: UpdateArticleRequest | CreateArticleRequest
  if (props.mode === 'edit') {
    // 编辑模式：只发送允许更新的字段（根据UpdateArticleRequest接口）
    requestData = {
      title: videoForm.value.title,
      content: videoForm.value.description || '', // 使用描述作为内容
      // 注意：bilibiliUrl 和 type 字段通常不可更新，所以不发送
    } as UpdateArticleRequest
  } else {
    // 创建模式：发送完整数据
    requestData = {
      title: videoForm.value.title,
      content: videoForm.value.description || '', // 使用描述作为内容
      type: 'video' as const,
      bilibiliUrl: videoForm.value.bilibiliUrl,
      // 其他字段可选
    } as CreateArticleRequest
  }

  // 调试信息
  console.log('编辑模式:', props.mode)
  console.log('文章ID:', props.articleId)
  console.log('发送的数据:', requestData)

  // 调试：检查articlesStore对象
  console.log('articlesStore对象:', articlesStore)
  console.log('createArticle方法是否存在:', typeof articlesStore.createArticle)
  console.log('updateArticle方法是否存在:', typeof articlesStore.updateArticle)

  try {
    let result
    if (props.mode === 'edit' && props.articleId) {
      // 编辑模式：更新文章
      result = await articlesStore.updateArticle(props.articleId, requestData as UpdateArticleRequest)
      if (result.success) {
        uiStore.showSuccess('视频更新成功！')
        // 跳转回视频详情页
        router.push({ name: 'VideoDetail', params: { id: props.articleId } })
      }
    } else {
      // 创建模式：新建文章
      result = await articlesStore.createArticle(requestData)
      if (result.success) {
        uiStore.showSuccess('视频投稿提交成功！')
        // 清空表单
        videoForm.value = {
          bilibiliUrl: '',
          title: '',
          description: ''
        }
      }
    }

    if (!result.success) {
      uiStore.showError(result.error || (props.mode === 'edit' ? '视频更新失败' : '视频投稿失败'))
    }
  } catch (error) {
    uiStore.showError(props.mode === 'edit' ? '视频更新失败，请稍后重试' : '视频投稿失败，请稍后重试')
    console.error('视频操作失败:', error)
  }
}

// TODO: 后端需要实现文章投稿API
// 需要调用：POST /api/articles
// 请求体：{
//   title: string,
//   content: string,
//   type: 'article',
//   cover?: string (图片URL或Base64),
//   ...其他字段
// }
// 注意：需要处理富文本内容、图片上传等功能
// 实现提示：参考 src/services/api-examples.ts 中的示例代码
const handleArticleSubmit = async () => {
  // 检查用户是否登录
  if (!authStore.isAuthenticated) {
    uiStore.showError('请先登录后再投稿')
    return
  }

  if (!articleForm.value.title || !editorContent.value) {
    uiStore.showError('请填写标题和文章内容')
    return
  }

  // 处理封面数据
  // 注意：使用上传API /api/v1/upload/image，返回的图片URL为 /uploads/filename.jpg
  let coverToSend: string | undefined = undefined

  // 如果有新选择的封面文件，上传到服务器
  if (articleForm.value.coverFile) {
    try {
      uiStore.showInfo('正在上传封面图片...')
      const uploadResult = await uploadImage(articleForm.value.coverFile)

      if (!uploadResult.success || !uploadResult.data) {
        uiStore.showError(uploadResult.error || '封面图片上传失败')
        return
      }

      // 获取上传后的URL
      coverToSend = uploadResult.data.url
      // 更新coverUrl，以便后续使用
      articleForm.value.coverUrl = coverToSend
      uiStore.showSuccess('封面图片上传成功')
    } catch (error) {
      console.error('封面图片上传失败:', error)
      uiStore.showError('封面图片上传失败，请稍后重试')
      return
    }
  } else if (articleForm.value.coverUrl) {
    // 检查现有URL是否是上传服务的URL（以/uploads/开头）
    // 后端上传API返回的URL格式为 /uploads/filename.jpg
    // 如果是Base64字符串（以data:开头），则忽略，因为需要重新上传
    if (articleForm.value.coverUrl.startsWith('/uploads/') ||
        articleForm.value.coverUrl.includes('localhost:3001/uploads/')) {
      // 有效的上传URL，直接使用
      coverToSend = articleForm.value.coverUrl
    } else if (articleForm.value.coverUrl.startsWith('data:')) {
      // Base64字符串，需要重新上传（这里不处理，用户需要重新选择图片）
      uiStore.showInfo('现有封面图片需要重新上传，请重新选择图片')
      // 不清除coverFile，让用户重新选择
    }
  }

  // 构建请求数据 - 使用编辑器内容
  let requestData: UpdateArticleRequest | CreateArticleRequest
  if (props.mode === 'edit') {
    // 编辑模式：只发送允许更新的字段（根据UpdateArticleRequest接口）
    requestData = {
      title: articleForm.value.title,
      content: editorContent.value,
    } as UpdateArticleRequest
    // 如果有封面数据，添加到请求数据
    if (coverToSend !== undefined) {
      requestData.cover = coverToSend
    }
  } else {
    // 创建模式：发送完整数据
    requestData = {
      title: articleForm.value.title,
      content: editorContent.value,
      type: 'article' as const,
    } as CreateArticleRequest
    // 如果有封面数据，添加到请求数据
    if (coverToSend !== undefined) {
      requestData.cover = coverToSend
    }
  }

  // 调试信息
  console.log('编辑模式 (文章):', props.mode)
  console.log('文章ID (文章):', props.articleId)
  console.log('发送的数据 (文章):', requestData)

  // 调试：检查articlesStore对象
  console.log('articlesStore对象 (文章投稿):', articlesStore)
  console.log('createArticle方法是否存在 (文章投稿):', typeof articlesStore.createArticle)
  console.log('updateArticle方法是否存在 (文章投稿):', typeof articlesStore.updateArticle)

  try {
    let result
    if (props.mode === 'edit' && props.articleId) {
      // 编辑模式：更新文章
      result = await articlesStore.updateArticle(props.articleId, requestData as UpdateArticleRequest)
      if (result.success) {
        uiStore.showSuccess('文章更新成功！')
        // 跳转回文章详情页
        router.push({ name: 'ArticleDetail', params: { id: props.articleId } })
      }
    } else {
      // 创建模式：新建文章
      result = await articlesStore.createArticle(requestData)
      if (result.success) {
        uiStore.showSuccess('文章投稿提交成功！')
        // 清空表单
        articleForm.value = {
          title: '',
          coverFile: null,
          coverUrl: null,
          content: ''
        }
        editorContent.value = ''
      }
    }

    if (!result.success) {
      uiStore.showError(result.error || (props.mode === 'edit' ? '文章更新失败' : '文章投稿失败'))
    }
  } catch (error) {
    uiStore.showError(props.mode === 'edit' ? '文章更新失败，请稍后重试' : '文章投稿失败，请稍后重试')
    console.error('文章操作失败:', error)
  }
}

const handleCoverUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    articleForm.value.coverFile = input.files[0]
    articleForm.value.coverUrl = null // 清除现有URL，使用新文件
    uiStore.showInfo(`封面已选择: ${input.files[0].name}`)
  }
}

// 取消编辑/投稿
const handleCancel = () => {
  router.back()
}

// 富文本编辑器工具
const editorTools = [
  { icon: 'B', command: 'bold', title: '粗体' },
  { icon: 'I', command: 'italic', title: '斜体' },
  { icon: 'U', command: 'underline', title: '下划线' },
  { icon: '链接', command: 'link', title: '链接' },
  { icon: '图片', command: 'image', title: '图片' }
]

// 上传并插入图片
const uploadAndInsertImage = (range: Range, selection: Selection) => {
  // 创建隐藏的文件输入
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.style.display = 'none'

  fileInput.onchange = (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      uiStore.showError('请选择图片文件')
      return
    }

    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      uiStore.showError('图片大小不能超过5MB')
      return
    }

    // 读取文件为DataURL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string

      // 创建图片元素
      const img = document.createElement('img')
      img.className = 'embedded-image'
      // 设置初始样式确保立即适应
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '0 auto'
      img.style.boxSizing = 'border-box'

      // 图片加载后精确调整尺寸
      img.onload = function() {
        const editor = document.getElementById('article-editor') as HTMLElement
        if (!editor) return

        // 计算编辑器内容区域的实际可用宽度（减去内边距）
        const editorStyle = window.getComputedStyle(editor)
        const editorPaddingLeft = parseFloat(editorStyle.paddingLeft) || 0
        const editorPaddingRight = parseFloat(editorStyle.paddingRight) || 0
        const availableWidth = editor.clientWidth - editorPaddingLeft - editorPaddingRight - 4 // 减去边框等

        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight

        // 清除可能的内联宽度/高度，让max-width生效
        img.style.width = ''
        img.style.height = ''

        // 如果图片宽度大于可用宽度，按比例缩小
        if (naturalWidth > availableWidth) {
          const ratio = availableWidth / naturalWidth
          const scaledHeight = naturalHeight * ratio

          // 设置宽度为100%使其填充容器，高度自动按比例
          img.style.width = '100%'
          img.style.height = 'auto'
          // 限制最大高度
          if (scaledHeight > 400) {
            img.style.maxHeight = '400px'
          }
        } else {
          // 图片较小，保持原尺寸
          img.style.width = naturalWidth + 'px'
          img.style.height = naturalHeight + 'px'
          // 但仍然限制最大高度
          if (naturalHeight > 400) {
            img.style.maxHeight = '400px'
            img.style.height = 'auto'
            // 重新计算宽度以保持比例
            const heightRatio = 400 / naturalHeight
            img.style.width = (naturalWidth * heightRatio) + 'px'
          }
        }

        // 确保容器也限制宽度
        const container = img.parentElement
        if (container && container.classList.contains('image-container')) {
          container.style.maxWidth = '100%'
          container.style.overflow = 'hidden'
        }
      }
      img.src = dataUrl

      // 创建容器div
      const container = document.createElement('div')
      container.className = 'image-container'
      container.appendChild(img)

      // 插入到选区位置
      range.deleteContents()
      range.insertNode(container)

      // 添加换行，确保图片上下有间距
      const brAfter = document.createElement('br')
      container.after(brAfter)

      // 恢复选区在图片后面
      const newRange = document.createRange()
      newRange.setStartAfter(brAfter)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)

      // 更新编辑器内容
      const editor = document.getElementById('article-editor') as HTMLElement
      if (editor) {
        editorContent.value = editor.innerHTML
      }
    }

    reader.onerror = () => {
      uiStore.showError('图片读取失败，请重试')
    }

    reader.readAsDataURL(file)
  }

  // 触发文件选择
  document.body.appendChild(fileInput)
  fileInput.click()

  // 清理
  setTimeout(() => {
    document.body.removeChild(fileInput)
  }, 100)
}

const executeEditorCommand = (command: string) => {
  const editor = document.getElementById('article-editor') as HTMLElement
  if (!editor) return

  editor.focus()

  // 保存当前选区
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)

    switch (command) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
      case 'link':
        // 第一步：询问链接地址
        const url = prompt('请输入链接地址:', 'https://')
        if (url) {
          // 第二步：询问显示文本（可选）
          const displayText = prompt('请输入链接显示文本（可选，留空则使用链接地址）:', '')

          // 创建链接元素，添加样式类
          const link = document.createElement('a')
          link.href = url
          link.textContent = displayText?.trim() || url
          link.className = 'embedded-link'
          link.target = '_blank'
          link.rel = 'noopener noreferrer'

          // 插入到选区位置
          range.deleteContents()
          range.insertNode(link)
        }
        break
      case 'image':
        uploadAndInsertImage(range, selection)
        break
    }
  }
}

// 处理编辑器输入事件
const handleEditorInput = (event: Event) => {
  const editor = event.target as HTMLElement
  editorContent.value = editor.innerHTML
}

// 处理编辑器粘贴事件，自动处理图片样式
const handleEditorPaste = (event: ClipboardEvent) => {
  event.preventDefault()

  const editor = event.target as HTMLElement
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)

  // 获取剪贴板内容
  const clipboardData = event.clipboardData
  if (!clipboardData) return

  // 检查是否有图片
  if (clipboardData.types.includes('Files')) {
    const items = clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          // 创建图片预览
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = document.createElement('img')
            img.className = 'embedded-image'
            // 设置初始样式确保立即适应
            img.style.maxWidth = '100%'
            img.style.height = 'auto'
            img.style.display = 'block'
            img.style.margin = '0 auto'
            img.style.boxSizing = 'border-box'

            // 图片加载后精确调整尺寸
            img.onload = function() {
              const editor = document.getElementById('article-editor') as HTMLElement
              if (!editor) return

              // 计算编辑器内容区域的实际可用宽度（减去内边距）
              const editorStyle = window.getComputedStyle(editor)
              const editorPaddingLeft = parseFloat(editorStyle.paddingLeft) || 0
              const editorPaddingRight = parseFloat(editorStyle.paddingRight) || 0
              const availableWidth = editor.clientWidth - editorPaddingLeft - editorPaddingRight - 4 // 减去边框等

              const naturalWidth = img.naturalWidth
              const naturalHeight = img.naturalHeight

              // 清除可能的内联宽度/高度，让max-width生效
              img.style.width = ''
              img.style.height = ''

              // 如果图片宽度大于可用宽度，按比例缩小
              if (naturalWidth > availableWidth) {
                const ratio = availableWidth / naturalWidth
                const scaledHeight = naturalHeight * ratio

                // 设置宽度为100%使其填充容器，高度自动按比例
                img.style.width = '100%'
                img.style.height = 'auto'
                // 限制最大高度
                if (scaledHeight > 400) {
                  img.style.maxHeight = '400px'
                }
              } else {
                // 图片较小，保持原尺寸
                img.style.width = naturalWidth + 'px'
                img.style.height = naturalHeight + 'px'
                // 但仍然限制最大高度
                if (naturalHeight > 400) {
                  img.style.maxHeight = '400px'
                  img.style.height = 'auto'
                  // 重新计算宽度以保持比例
                  const heightRatio = 400 / naturalHeight
                  img.style.width = (naturalWidth * heightRatio) + 'px'
                }
              }

              // 确保容器也限制宽度
              const container = img.parentElement
              if (container && container.classList.contains('image-container')) {
                container.style.maxWidth = '100%'
                container.style.overflow = 'hidden'
              }
            }

            img.src = e.target?.result as string

            const container = document.createElement('div')
            container.className = 'image-container'
            container.appendChild(img)

            // 插入图片容器
            range.deleteContents()
            range.insertNode(container)

            // 添加换行
            const brAfter = document.createElement('br')
            container.after(brAfter)

            // 更新编辑器内容
            editorContent.value = editor.innerHTML
          }
          reader.readAsDataURL(file)
        }
        return
      }
    }
  }

  // 处理文本粘贴
  const text = clipboardData.getData('text/plain')
  if (text) {
    // 检查是否是链接，如果是则自动创建链接
    if (text.match(/^https?:\/\/\S+$/)) {
      // 提取域名作为显示文本
      let displayText = text
      try {
        const urlObj = new URL(text)
        displayText = urlObj.hostname.replace(/^www\./, '')
        // 如果路径简短，可以附加路径
        if (urlObj.pathname && urlObj.pathname !== '/') {
          const path = urlObj.pathname
          if (path.length < 30) {
            displayText += path
          }
        }
      } catch {
        // URL解析失败，使用原始文本
      }

      const link = document.createElement('a')
      link.href = text
      link.textContent = displayText
      link.className = 'embedded-link'
      link.target = '_blank'
      link.rel = 'noopener noreferrer'

      range.deleteContents()
      range.insertNode(link)
    } else {
      // 普通文本
      const textNode = document.createTextNode(text)
      range.deleteContents()
      range.insertNode(textNode)
    }

    // 移动光标到插入内容之后
    range.setStartAfter(range.endContainer)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    // 更新编辑器内容
    editorContent.value = editor.innerHTML
  }
}

// 设置编辑器内容
const setEditorContent = (content: string) => {
  const editor = document.getElementById('article-editor') as HTMLElement
  if (editor) {
    editor.innerHTML = content
    editorContent.value = content
  }
}

// 初始化编辑器内容
onMounted(() => {
  if (props.mode === 'edit' && props.articleId) {
    loadArticleForEdit(props.articleId)
  } else {
    // 初始化空编辑器
    const editor = document.getElementById('article-editor') as HTMLElement
    if (editor) {
      editor.innerHTML = editorContent.value
    }
  }
})
</script>

<template>
  <div class="submit-page">
    <div class="submit-container" :class="containerClass">
      <!-- 左侧菜单 -->
      <div class="submit-sidebar" v-if="!isEditMode">
        <div
          class="sidebar-item"
          :class="{ active: activeTab === 'video' }"
          @click="activeTab = 'video'"
        >
          <span class="sidebar-text">视频投稿</span>
        </div>
        <div
          class="sidebar-item"
          :class="{ active: activeTab === 'article' }"
          @click="activeTab = 'article'"
        >
          <span class="sidebar-text">文章投稿</span>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="submit-content">
        <!-- 视频投稿表单 -->
        <div v-if="activeTab === 'video'" class="video-submit-form">
          <h2 class="form-title">{{ pageTitle }}</h2>
          <p class="form-description">{{ isEditMode ? '编辑您的视频作品' : '分享你的视频作品，支持B站链接直接投稿' }}</p>

          <form @submit.prevent="handleVideoSubmit" class="submit-form">
            <div class="form-group" v-if="mode !== 'edit'">
              <label for="bilibiliUrl">B站视频链接 *</label>
              <input
                id="bilibiliUrl"
                v-model="videoForm.bilibiliUrl"
                type="url"
                placeholder="https://www.bilibili.com/video/BV..."
                required
              />
              <p class="form-hint">请粘贴B站视频的完整链接</p>
            </div>

            <div class="form-group">
              <label for="videoTitle">视频标题 *</label>
              <input
                id="videoTitle"
                v-model="videoForm.title"
                type="text"
                placeholder="请输入视频标题"
                maxlength="100"
                required
              />
              <p class="form-hint">标题应简洁明了，不超过100字</p>
            </div>

            <div class="form-group">
              <label for="videoDescription">视频简介</label>
              <textarea
                id="videoDescription"
                v-model="videoForm.description"
                placeholder="简单描述视频内容、创作背景等..."
                rows="4"
              ></textarea>
              <p class="form-hint">可选，最多500字</p>
            </div>


            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="handleCancel">取消</button>
              <button type="submit" class="submit-btn">{{ submitButtonText }}</button>
            </div>
          </form>
        </div>

        <!-- 文章投稿表单 -->
        <div v-if="activeTab === 'article'" class="article-submit-form">
          <h2 class="form-title">{{ pageTitle }}</h2>
          <p class="form-description">{{ isEditMode ? '编辑您的文章作品' : '分享你的文字作品，支持富文本编辑' }}</p>

          <form @submit.prevent="handleArticleSubmit" class="submit-form">
            <div class="form-group">
              <label for="articleTitle">文章标题 *</label>
              <input
                id="articleTitle"
                v-model="articleForm.title"
                type="text"
                placeholder="请输入文章标题"
                maxlength="100"
                required
              />
              <p class="form-hint">标题应简洁明了，不超过100字</p>
            </div>

            <div class="form-group">
              <label for="articleCover">文章封面</label>
              <div class="cover-upload">
                <input
                  id="articleCover"
                  type="file"
                  accept="image/*"
                  @change="handleCoverUpload"
                  class="file-input"
                />
                <label for="articleCover" class="upload-btn">
                  {{ articleForm.coverFile ? '更换封面' : '选择封面图片' }}
                </label>
                <span v-if="articleForm.coverFile" class="file-name">
                  {{ articleForm.coverFile.name }}
                </span>
              </div>
              <p class="form-hint">建议尺寸：1200×630px，支持JPG、PNG格式</p>
            </div>

            <div class="form-group">
              <label>文章内容 *</label>
              <div class="editor-toolbar">
                <button
                  v-for="tool in editorTools"
                  :key="tool.command"
                  type="button"
                  class="editor-btn"
                  :title="tool.title"
                  @click="executeEditorCommand(tool.command)"
                >
                  {{ tool.icon }}
                </button>
              </div>
              <div
                id="article-editor"
                contenteditable="true"
                @input="handleEditorInput"
                @paste="handleEditorPaste"
                placeholder="开始撰写你的文章..."
                class="editor-content"
              ></div>
            </div>


            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="handleCancel">取消</button>
              <button type="submit" class="submit-btn">{{ submitButtonText }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.submit-page {
  flex: 1;
  background-color: #f8f9fa;
  padding: 40px 0;
}

.submit-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 48px;
  padding: 0 32px;
}

/* 左侧菜单 */
.submit-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: white;
  border-radius: 20px;
  padding: 24px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 4px solid transparent;
}

.sidebar-item:hover {
  background-color: #f8f9fa;
}

.sidebar-item.active {
  background-color: #f8f9fa;
  border-left-color: #fb7299;
  color: #fb7299;
}

.sidebar-icon {
  font-size: 20px;
}

.sidebar-text {
  font-size: 16px;
  font-weight: 500;
}

/* 右侧内容区域 */
.submit-content {
  flex: 1;
  background: white;
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  max-width: 100%;
  box-sizing: border-box;
}

.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 8px;
}

.form-description {
  font-size: 14px;
  color: #5e636b;
  margin-bottom: 32px;
}

/* 表单样式 */
.submit-form {
  max-width: 1000px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #18191c;
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: 0.2s;
  background-color: white;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #fb7299;
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.form-group textarea {
  resize: vertical;
}

.form-hint {
  font-size: 12px;
  color: #9499a0;
  margin-top: 4px;
}

/* 封面上传 */
.cover-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-input {
  display: none;
}

.upload-btn {
  padding: 10px 20px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #5e636b;
  cursor: pointer;
  transition: 0.2s;
}

.upload-btn:hover {
  background: #eef0f2;
}

.file-name {
  font-size: 14px;
  color: #5e636b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* 编辑器工具栏 */
.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.editor-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.editor-btn:hover {
  background: #eef0f2;
}

.editor-textarea {
  font-family: inherit;
  line-height: 1.6;
}

/* 下拉选择框 */
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

/* 表单操作按钮 */
.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eef0f2;
}

.cancel-btn {
  padding: 14px 32px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #5e636b;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #eef0f2;
  border-color: #d0d7de;
  color: #18191c;
}

.submit-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #fb7299 0%, #fc5c7d 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
}


/* 响应式 */
@media (max-width: 860px) {
  .submit-container {
    flex-direction: column;
    padding: 0 16px;
  }

  .submit-sidebar {
    width: 100%;
    display: flex;
    padding: 0;
  }

  .sidebar-item {
    flex: 1;
    justify-content: center;
    border-left: none;
    border-bottom: 4px solid transparent;
  }

  .sidebar-item.active {
    border-left: none;
    border-bottom-color: #fb7299;
  }

  .submit-content {
    padding: 24px;
  }

  .form-actions {
    flex-wrap: wrap;
  }

  .submit-btn,
  .cancel-btn {
    flex: 1;
    min-width: 120px;
  }

  .submit-form {
    max-width: 100%;
  }
}

@media (max-width: 680px) {
  .submit-content {
    padding: 16px;
  }

  .editor-content {
    padding: 12px;
  }

  .embedded-image {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .submit-content {
    padding: 12px;
  }

  .editor-content {
    padding: 8px;
    min-height: 250px;
  }

  .embedded-image {
    max-height: 250px;
  }
}

/* 编辑器内容区域 */
.editor-content {
  min-height: 300px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background-color: white;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
}

.editor-content:focus {
  border-color: #fb7299;
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.editor-content:empty:before {
  content: attr(placeholder);
  color: #9499a0;
}

/* 嵌入图片样式 */
.image-container {
  display: block;
  margin: 24px 0;
  text-align: center;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.embedded-image {
  display: block;
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  max-height: 400px !important;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  object-fit: contain;
}


/* 嵌入链接样式 */
.embedded-link {
  color: #0066cc; /* 蓝色，更醒目 */
  font-weight: 600; /* 加粗显示 */
  text-decoration: none;
  border-bottom: 2px solid rgba(0, 102, 204, 0.3); /* 更粗的边框 */
  padding-bottom: 2px;
  transition: all 0.2s;
  background-color: rgba(0, 102, 204, 0.05); /* 浅蓝色背景 */
  padding: 2px 6px;
  border-radius: 4px;
}

.embedded-link:hover {
  color: #0052a3; /* 更深的蓝色 */
  border-bottom-color: rgba(0, 102, 204, 0.8);
  text-decoration: none;
  background-color: rgba(0, 102, 204, 0.1); /* 悬停时背景加深 */
}

/* 编辑模式样式 */
.submit-container.edit-mode {
  gap: 0;
}

.submit-container.edit-mode .submit-content {
  width: 100%;
}
</style>