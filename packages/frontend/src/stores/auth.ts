import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isValidEmail, checkPasswordStrength, isValidUsername, isValidRegisterPassword, API_ENDPOINTS } from '@coarch/shared'
import api from '@config/api'
import {
  REMEMBER_ME_KEY,
  TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  SESSION_TOKEN_KEY,
  SESSION_REFRESH_TOKEN_KEY
} from '@config/api'
import type {
  AuthResponse,
  User
} from '@coarch/shared'

/**
 * 用户认证状态管理
 *
 * 注意：当前实现为模拟数据，所有认证操作均在本地完成。
 * 后端开发者需要根据以下API规范实现相应的后端接口：
 *
 * 1. POST /api/auth/login - 用户登录
 *   请求体：{ email: string, password: string, rememberMe?: boolean }
 *   响应体：{ success: boolean, user: User, token: string, refreshToken?: string, expiresIn?: number }
 *
 * 2. POST /api/auth/register - 用户注册
 *   请求体：{ username: string, email: string, password: string, confirmPassword: string }
 *   响应体：{ success: boolean, user: User, token: string, refreshToken?: string, expiresIn?: number }
 *
 * 3. GET /api/auth/profile - 获取当前用户信息
 *   响应体：{ success: boolean, user: User }
 *
 * 4. PUT /api/auth/profile - 更新用户资料
 *   请求体：{ username?: string, email?: string, avatar?: string, bio?: string }
 *   响应体：{ success: boolean, user: User }
 *
 * 5. POST /api/auth/refresh - 刷新访问令牌
 *   请求体：{ refreshToken: string }
 *   响应体：{ success: boolean, token: string, refreshToken: string, expiresIn: number }
 *
 * 详细类型定义请参考：src/types/api.ts
 * API客户端配置请参考：src/config/api.ts
 */

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const userAvatar = computed(() => user.value?.avatar || '')
  const userName = computed(() => user.value?.username || '')

  // 初始化时从存储加载token（优先使用sessionStorage，其次localStorage）
  const initFromStorage = () => {
    // 优先检查sessionStorage（会话级别存储）
    let storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
    let storedUser = sessionStorage.getItem('session_auth_user')
    let storedRefreshToken = sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)
    let fromSession = true

    // 如果sessionStorage中没有，检查localStorage（持久化存储）
    if (!storedToken) {
      storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
      storedUser = localStorage.getItem('auth_user')
      storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
      fromSession = false
    }

    if (storedToken) {
      token.value = storedToken
      api.setAuthToken(storedToken)

      // 存储来源标志，用于后续操作
      if (fromSession) {
        sessionStorage.setItem(REMEMBER_ME_KEY, 'false')
      } else {
        localStorage.setItem(REMEMBER_ME_KEY, 'true')
      }
    }

    // 设置刷新令牌（如果存在）
    if (storedRefreshToken) {
      api.setRefreshToken(storedRefreshToken)
    }

    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        console.error('Failed to parse stored user:', e)
        // 清除损坏的存储
        if (fromSession) {
          sessionStorage.removeItem('session_auth_user')
        } else {
          localStorage.removeItem('auth_user')
        }
      }
    }
  }

  // 真实登录API调用
  // 使用后端实现的认证接口
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null

    try {
      // 验证邮箱格式
      if (!isValidEmail(credentials.email)) {
        throw new Error('邮箱格式不正确')
      }

      // 调用真实API
      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
        email: credentials.email,
        password: credentials.password
      })

      if (response.success && response.data) {
        const { user: userData, token: authToken, refreshToken } = response.data

        // 更新状态
        user.value = userData
        token.value = authToken

        // 存储token到api客户端
        api.setAuthToken(authToken)
        if (refreshToken) {
          api.setRefreshToken(refreshToken)
        }

        // 根据"记住我"选择存储到localStorage或sessionStorage
        if (credentials.rememberMe) {
          // 持久化存储到localStorage
          localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
          localStorage.setItem('auth_user', JSON.stringify(userData))
          if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
          }
          localStorage.setItem(REMEMBER_ME_KEY, 'true')

          // 清除sessionStorage中的旧数据
          sessionStorage.removeItem(SESSION_TOKEN_KEY)
          sessionStorage.removeItem('session_auth_user')
          sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
          sessionStorage.removeItem(REMEMBER_ME_KEY)
        } else {
          // 会话级别存储到sessionStorage
          sessionStorage.setItem(SESSION_TOKEN_KEY, authToken)
          sessionStorage.setItem('session_auth_user', JSON.stringify(userData))
          if (refreshToken) {
            sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken)
          }
          sessionStorage.setItem(REMEMBER_ME_KEY, 'false')

          // 清除localStorage中的旧数据
          localStorage.removeItem(TOKEN_STORAGE_KEY)
          localStorage.removeItem('auth_user')
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
          localStorage.removeItem(REMEMBER_ME_KEY)
        }

        return { success: true, user: userData }
      } else {
        // API返回了错误
        error.value = response.error || '登录失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 真实注册API调用
  const register = async (data: RegisterData) => {
    isLoading.value = true
    error.value = null

    try {
      // 验证数据
      if (!isValidEmail(data.email)) {
        throw new Error('邮箱格式不正确')
      }

      if (!isValidUsername(data.username)) {
        throw new Error('用户名格式不正确：3-15位汉字、字母、数字、下划线或连字符')
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('两次输入的密码不一致')
      }

      if (!isValidRegisterPassword(data.password)) {
        throw new Error('密码格式不符合要求：至少8位，且包含字母和数字')
      }

      const strength = checkPasswordStrength(data.password)
      if (strength === 'weak') {
        throw new Error('密码强度太弱，请使用更强的密码')
      }

      // 调用真实API
      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
        username: data.username,
        email: data.email,
        password: data.password
      })

      if (response.success && response.data) {
        const { user: userData, token: authToken, refreshToken } = response.data

        // 更新状态
        user.value = userData
        token.value = authToken

        // 存储token到api客户端
        api.setAuthToken(authToken)
        if (refreshToken) {
          api.setRefreshToken(refreshToken)
        }

        // 注册后默认使用持久化存储（localStorage）
        localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
        localStorage.setItem('auth_user', JSON.stringify(userData))
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
        }
        localStorage.setItem(REMEMBER_ME_KEY, 'true')

        // 清除sessionStorage中的旧数据
        sessionStorage.removeItem(SESSION_TOKEN_KEY)
        sessionStorage.removeItem('session_auth_user')
        sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
        sessionStorage.removeItem(REMEMBER_ME_KEY)

        return { success: true, user: userData }
      } else {
        // API返回了错误
        error.value = response.error || '注册失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 退出登录
  const logout = () => {
    user.value = null
    token.value = null
    error.value = null

    // 清除所有本地存储（localStorage和sessionStorage）
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem('auth_user')
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)

    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem('session_auth_user')
    sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(REMEMBER_ME_KEY)

    // 清除api客户端token
    api.clearAuthTokens()
  }

  // 更新用户资料
  const updateProfile = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }

      // 根据当前存储位置更新用户数据
      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
      if (sessionToken) {
        // 存储在sessionStorage中
        sessionStorage.setItem('session_auth_user', JSON.stringify(user.value))
      } else {
        // 存储在localStorage中（或默认）
        localStorage.setItem('auth_user', JSON.stringify(user.value))
      }
    }
  }

  // 检查认证状态
  const checkAuth = () => {
    initFromStorage()
    return isAuthenticated.value
  }

  // 初始化
  initFromStorage()

  return {
    // 状态
    user,
    token,
    isLoading,
    error,

    // 计算属性
    isAuthenticated,
    userAvatar,
    userName,

    // 方法
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  }
})