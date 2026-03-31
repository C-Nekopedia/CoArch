<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="error-code">404</div>
        <h1 class="error-title">页面未找到</h1>
        <p class="error-description">
          您访问的页面可能已被删除、移动或暂时不可用。
        </p>
        <div class="error-actions">
          <button class="btn-primary" @click="goHome">返回首页</button>
          <button class="btn-secondary" @click="goBack">返回上一页</button>
        </div>
        <div class="error-tips">
          <p class="tips-title">您可以尝试：</p>
          <ul class="tips-list">
            <li>检查网址是否正确</li>
            <li>使用搜索功能查找内容</li>
            <li>回到首页浏览其他内容</li>
          </ul>
        </div>
      </div>
      <div class="not-found-illustration">
        <div class="illustration-box">
          <div class="illustration-icon">❓</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: calc(100vh - 120px);
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.not-found-container {
  max-width: 1000px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 60px;
  background: white;
  border-radius: 24px;
  padding: 60px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

.not-found-content {
  flex: 1;
}

.error-code {
  font-size: 72px;
  font-weight: 800;
  color: #fb7299;
  margin-bottom: 16px;
  line-height: 1;
}

.error-title {
  font-size: 32px;
  font-weight: 600;
  color: #18191c;
  margin-bottom: 16px;
}

.error-description {
  font-size: 16px;
  color: #5e636b;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 500px;
}

.error-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 14px 32px;
  background: linear-gradient(135deg, #fb7299 0%, #fc5c7d 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(251, 114, 153, 0.25);
}

.btn-secondary {
  padding: 14px 32px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #5e636b;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background: #eef0f2;
}

.error-tips {
  border-top: 1px solid #eef0f2;
  padding-top: 24px;
}

.tips-title {
  font-size: 14px;
  font-weight: 500;
  color: #9499a0;
  margin-bottom: 12px;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  font-size: 14px;
  color: #5e636b;
  padding: 6px 0;
  position: relative;
  padding-left: 20px;
}

.tips-list li::before {
  content: '•';
  color: #fb7299;
  position: absolute;
  left: 0;
}

.not-found-illustration {
  flex-shrink: 0;
}

.illustration-box {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #f8f9fa 0%, #eef0f2 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e2e8f0;
}

.illustration-icon {
  font-size: 64px;
  opacity: 0.6;
}

/* 响应式 */
@media (max-width: 860px) {
  .not-found-container {
    flex-direction: column;
    text-align: center;
    gap: 40px;
    padding: 40px 24px;
  }

  .error-description {
    margin-left: auto;
    margin-right: auto;
  }

  .error-actions {
    justify-content: center;
  }

  .tips-list li {
    text-align: left;
  }

  .illustration-box {
    width: 150px;
    height: 150px;
  }

  .illustration-icon {
    font-size: 48px;
  }
}

@media (max-width: 480px) {
  .error-code {
    font-size: 56px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>