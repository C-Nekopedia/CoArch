<script setup lang="ts">
import { useUIStore } from '@stores/ui'

const uiStore = useUIStore()
const currentYear = new Date().getFullYear()

const handleFooterLinkClick = (featureName: string) => {
  uiStore.showDevelopmentNotice(featureName)
}
</script>

<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-content">
        <div class="footer-logo">Co-Arch</div>
        <p class="footer-description">发现有趣的内容创作者 · 从视频到文章，记录灵感与思考</p>
        <div class="footer-links">
          <a href="#" class="footer-link" @click.prevent="handleFooterLinkClick('关于我们')">关于我们</a>
          <a href="#" class="footer-link" @click.prevent="handleFooterLinkClick('帮助中心')">帮助中心</a>
          <a href="#" class="footer-link" @click.prevent="handleFooterLinkClick('服务条款')">服务条款</a>
          <a href="#" class="footer-link" @click.prevent="handleFooterLinkClick('隐私政策')">隐私政策</a>
          <a href="#" class="footer-link" @click.prevent="handleFooterLinkClick('联系我们')">联系我们</a>
        </div>
        <div class="footer-copyright">
          © {{ currentYear }} Co-Arch. All rights reserved.
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: linear-gradient(135deg, #1a1c24 0%, #2a2e3a 100%);
  color: rgba(255, 255, 255, 0.85);
  padding: 40px 0;
  margin-top: 60px;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-content {
  text-align: center;
}

.footer-logo {
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #fb7299, #fc5c7d);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 16px;
}

.footer-description {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 24px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.footer-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #fb7299;
}

.footer-copyright {
  font-size: 12px;
  opacity: 0.6;
}

/* 响应式 */
@media (max-width: 680px) {
  .app-footer {
    padding: 32px 0;
  }

  .footer-links {
    gap: 20px;
  }

  .footer-container {
    padding: 0 16px;
  }
}
</style>