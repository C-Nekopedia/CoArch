<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)

const handleSubmit = async () => {
  if (!email.value || !password.value) {
    uiStore.showError('请输入邮箱和密码')
    return
  }

  isLoading.value = true
  const result = await authStore.login({
    email: email.value,
    password: password.value,
    rememberMe: rememberMe.value
  })

  isLoading.value = false

  if (result.success) {
    uiStore.showSuccess('登录成功')
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || { name: 'Home' })
  }
}

const goToRegister = () => {
  router.push({ name: 'Register' })
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h2>登录 Co-Arch</h2>
        <p>欢迎回来，请登录您的账户</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">邮箱 / 用户名</label>
          <input
            id="email"
            v-model="email"
            type="text"
            placeholder="请输入邮箱或用户名"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>记住我</span>
          </label>
          <a href="#" class="forgot-password">忘记密码？</a>
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          {{ isLoading ? '登录中...' : '登录' }}
        </button>


        <div class="login-footer">
          <p>还没有账户？ <a @click="goToRegister" class="register-link">立即注册</a></p>
          <p>或 <a href="/" class="guest-link">以游客身份浏览</a></p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 40px;
  background-color: #f8f9fa;
}

.login-container {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 20px;
  padding: 60px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  color: #5e636b;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #18191c;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: 0.2s;
  background-color: #f8f9fa;
}

.form-group input:focus {
  outline: none;
  border-color: #fb7299;
  background-color: white;
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 14px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5e636b;
  cursor: pointer;
}

.remember-me input {
  margin: 0;
}

.forgot-password {
  color: #fb7299;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #fb7299 0%, #fc5c7d 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: #5e636b;
}

.login-footer a {
  color: #fb7299;
  text-decoration: none;
  cursor: pointer;
}

.login-footer a:hover {
  text-decoration: underline;
}

.register-link {
  font-weight: 600;
}

.guest-link {
  font-weight: 500;
}

</style>