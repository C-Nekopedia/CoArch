<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  // 必需属性
  src?: string        // 头像URL
  alt?: string        // 替代文本（用于图片alt属性）

  // 尺寸相关
  size?: number       // 自定义尺寸（像素）
  sizePreset?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'  // 预设尺寸

  // 显示相关
  fallback?: string   // 自定义回退文本（默认取alt或name的首字母）
  name?: string       // 用户姓名（用于生成首字母）

  // 样式相关
  backgroundColor?: string  // 自定义背景色
  textColor?: string       // 自定义文字颜色
  rounded?: boolean        // 是否圆形（默认true）

  // 状态相关
  isOnline?: boolean       // 在线状态指示器
  showBorder?: boolean     // 显示边框
  borderColor?: string     // 边框颜色

  // 向后兼容属性
  avatar?: string          // 旧属性名，向后兼容
  username?: string        // 旧属性名，向后兼容
}

const props = withDefaults(defineProps<Props>(), {
  rounded: true,
  isOnline: false,
  showBorder: false,
  backgroundColor: '#fb7299',
  textColor: 'white',
  borderColor: 'white',
})

// 尺寸预设映射
const sizePresets = {
  xs: 24,  // 超小：评论头像
  sm: 36,  // 小：导航栏头像
  md: 48,  // 中：作者卡片、用户菜单
  lg: 72,  // 大：作者卡片
  xl: 96,  // 超大：个人主页
  '2xl': 128 // 巨大：特殊场景
}

// 计算有效尺寸
const effectiveSize = computed(() => {
  if (props.size) return props.size
  if (props.sizePreset) return sizePresets[props.sizePreset]
  return sizePresets.md // 默认中等尺寸
})

// 处理向后兼容：优先使用新属性名，其次使用旧属性名
const effectiveSrc = computed(() => props.src || props.avatar)
const effectiveAlt = computed(() => props.alt || props.name || props.username || '用户头像')
const effectiveName = computed(() => props.name || props.username)

// 统一的URL检测逻辑
const isImageUrl = computed(() => {
  const src = effectiveSrc.value
  if (!src) return false
  return src.startsWith('http') ||
         src.startsWith('/') ||
         src.includes('.') // 支持data:image等
})

// 统一的回退文本生成
const fallbackText = computed(() => {
  if (props.fallback) return props.fallback
  if (effectiveName.value) return effectiveName.value.charAt(0).toUpperCase()
  if (effectiveAlt.value) return effectiveAlt.value.charAt(0).toUpperCase()
  return '?'
})

// 动态样式计算
const avatarStyle = computed(() => ({
  width: `${effectiveSize.value}px`,
  height: `${effectiveSize.value}px`,
  backgroundColor: props.backgroundColor,
  color: props.textColor,
  borderRadius: props.rounded ? '50%' : '8px',
  fontSize: `${Math.max(12, effectiveSize.value * 0.4)}px`,
  border: props.showBorder ? `2px solid ${props.borderColor}` : 'none',
  lineHeight: `${effectiveSize.value}px`,
}))

// 在线状态指示器样式
const onlineIndicatorStyle = computed(() => ({
  width: `${Math.max(6, effectiveSize.value * 0.15)}px`,
  height: `${Math.max(6, effectiveSize.value * 0.15)}px`,
  backgroundColor: '#4caf50',
  border: `2px solid ${props.backgroundColor || '#fb7299'}`,
}))
</script>

<template>
  <div class="avatar-container" :style="avatarStyle">
    <!-- 图片头像 -->
    <img
      v-if="isImageUrl && effectiveSrc"
      :src="effectiveSrc"
      :alt="effectiveAlt"
      class="avatar-image"
    />

    <!-- 首字母占位符 -->
    <div v-else class="avatar-placeholder">
      {{ fallbackText }}
    </div>

    <!-- 在线状态指示器 -->
    <div v-if="isOnline" class="avatar-online-indicator" :style="onlineIndicatorStyle"></div>
  </div>
</template>

<style scoped>
.avatar-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-weight: 600;
  user-select: none;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  border-radius: 50%;
  z-index: 1;
}
</style>