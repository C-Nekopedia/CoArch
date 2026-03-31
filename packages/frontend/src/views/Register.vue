<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@stores/auth'
import { useUIStore } from '@stores/ui'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const verificationCode = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  // 简单验证
  if (!username.value || !email.value || !password.value || !confirmPassword.value) {
    uiStore.showError('请填写所有必填项')
    return
  }

  if (password.value !== confirmPassword.value) {
    uiStore.showError('两次输入的密码不一致')
    return
  }

  isLoading.value = true
  const result = await authStore.register({
    username: username.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value
  })

  isLoading.value = false

  if (result.success) {
    uiStore.showSuccess('注册成功！')
    router.push({ name: 'Home' })
  } else {
    // 显示注册失败的错误信息
    uiStore.showError(result.error || '注册失败，请稍后重试')
  }
}

const handleSendCode = () => {
  uiStore.showDevelopmentNotice('验证码发送')
}

const goToLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <h2>注册 Co-Arch</h2>
        <p>创建您的创作者账户</p>
      </div>

      <form @submit.prevent="handleSubmit" class="register-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名（3-15位汉字、字母、数字、下划线或连字符）"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">邮箱地址</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入邮箱地址"
            required
          />
        </div>

        <div class="form-group">
          <label for="verificationCode">验证码</label>
          <div class="verification-code-group">
            <input
              id="verificationCode"
              v-model="verificationCode"
              type="text"
              placeholder="开发中，可留空"
            />
            <button type="button" class="send-code-btn" @click="handleSendCode">发送验证码</button>
          </div>
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码（至少8位，包含字母和数字）"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
          />
        </div>

        <button type="submit" class="register-btn" :disabled="isLoading">
          {{ isLoading ? '注册中...' : '注册' }}
        </button>

        <div class="register-footer">
          <p>已有账户？ <a @click="goToLogin" class="login-link">立即登录</a></p>
          <p>或 <a href="/" class="guest-link">以游客身份浏览</a></p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 40px;
  background-color: #f8f9fa;
}

.register-container {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 20px;
  padding: 60px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 8px;
}

.register-header p {
  font-size: 14px;
  color: #5e636b;
}

.register-form {
  margin-top: 8px;
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

.verification-code-group {
  display: flex;
  gap: 12px;
}

.verification-code-group input {
  flex: 1;
}

.send-code-btn {
  padding: 0 16px;
  background: #eef0f2;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #5e636b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: 0.2s;
}

.send-code-btn:hover {
  background: #e2e8f0;
}

.register-btn {
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
  margin-top: 8px;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.register-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: #5e636b;
}

.register-footer a {
  color: #fb7299;
  text-decoration: none;
  cursor: pointer;
}

.register-footer a:hover {
  text-decoration: underline;
}

.login-link {
  font-weight: 600;
}

.guest-link {
  font-weight: 500;
}
</style>