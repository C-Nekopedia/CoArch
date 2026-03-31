# Co-Arch Frontend

Vue 3 + TypeScript + Vite 前端应用，用于 Co-Arch 内容创作与分享平台。

## 🚀 快速开始

### 前提条件
- Node.js 18+
- npm 或 yarn
- 后端服务运行中（默认端口 3000）

### 安装和运行

1. **进入前端目录**
   ```bash
   cd packages/frontend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.development
   # 编辑 .env.development，设置 API 地址等
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   - 开发服务器: http://localhost:5173
   - 生产构建: `npm run build`

## 📁 项目结构

```
src/
├── views/           # 页面组件
│   ├── Home.vue    # 首页
│   ├── Login.vue   # 登录页
│   ├── Register.vue # 注册页
│   ├── Profile.vue # 用户资料页
│   ├── ArticleDetail.vue # 文章详情页
│   ├── ArticleEdit.vue  # 文章编辑页
│   └── NotFound.vue    # 404页面
├── components/      # 可复用组件
│   ├── common/     # 通用组件
│   └── ui/         # UI 组件
├── stores/          # Pinia 状态管理
│   ├── auth.ts     # 认证状态
│   ├── articles.ts # 文章状态
│   ├── ui.ts       # UI 状态
│   └── index.ts    # 导出
├── utils/           # 工具函数
│   ├── validation.ts # 验证函数
│   ├── format.ts    # 格式化函数
│   ├── error-handler.ts # 错误处理
│   └── image.ts     # 图片处理
├── config/          # 配置
│   └── api.ts      # API 客户端配置
├── composables/     # 组合式函数
│   ├── useMessage.ts # 消息提示
│   └── useBackToTop.ts # 返回顶部
├── assets/          # 静态资源
│   ├── css/        # 样式文件
│   └── images/     # 图片资源
└── router/          # 路由配置
```

## 🛠️ 开发指南

### 技术栈
- **Vue 3** - Composition API + `<script setup>`
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Pinia** - 状态管理
- **Vue Router 4** - 路由管理
- **CSS/SCSS** - 样式方案

### 代码规范
- 使用 ESLint + Prettier
- 遵循 Vue 3 最佳实践
- 组件使用 PascalCase 命名
- 组合式函数使用 useXXX 命名

### 脚本命令
```bash
# 开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 测试
npm run test
```

### API 集成
- 使用自定义的 `api.ts` HTTP 客户端
- 支持请求/响应拦截器
- 自动处理认证 token
- 错误统一处理

### 状态管理
使用 Pinia 管理应用状态：
- `auth` store: 用户认证状态
- `articles` store: 文章数据
- `ui` store: UI 状态（消息提示等）

## 🎨 样式设计

### 设计系统
- 响应式布局，支持移动端和桌面端
- 统一的颜色、字体、间距变量
- 渐进式增强的交互体验

### CSS 架构
- 使用 CSS 变量定义设计令牌
- 组件作用域样式 (`<style scoped>`)
- 全局样式文件 (`src/style.css`)

## 🔧 构建和部署

### 开发环境
```bash
npm run dev
```
- 支持热重载
- 环境变量注入
- 开发服务器代理配置

### 生产构建
```bash
npm run build
```
- 代码压缩和优化
- 资源哈希处理
- 自动生成 sourcemap

### 部署方式
1. **静态文件部署**：将 `dist` 目录部署到任何静态服务器
2. **Docker 部署**：使用 Dockerfile 构建镜像
3. **平台部署**：Vercel、Netlify、Cloudflare Pages 等

## 🤝 贡献

请阅读根目录的 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解如何为项目做贡献。

## 📄 许可证

本项目采用 [MIT 许可证](../LICENSE)。
