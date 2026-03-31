# Co-Arch - 内容创作与分享平台

<p align="center">
  <img src="packages/frontend/src/assets/hero.png" alt="Co-Arch Logo" width="400">
  <br>
  <em>现代化的内容创作、分享与协作平台</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://nestjs.com"><img src="https://img.shields.io/badge/NestJS-%5E11.0.0-red.svg" alt="NestJS"></a>
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.x-green.svg" alt="Vue.js"></a>
</p>

## ✨ 功能特性

- 📝 **文章创作**：支持富文本编辑，实时预览
- 👥 **用户社区**：用户认证、个人资料，其他等待后续实现
- 💬 **互动评论**：仅评论，其他等待后续实现
- 🔍 **智能搜索**：等待后续实现
- 📁 **文件管理**：图片上传，其他等待后续实现
- 📱 **响应式设计**：适配桌面和移动设备
- 🚀 **性能优化**：等待后续实现

## 🏗️ 技术栈

### 后端 (NestJS)
- **框架**：NestJS + TypeScript
- **数据库**：PostgreSQL + Prisma ORM
- **缓存**：Redis（等待后续实现）
- **认证**：JWT + Passport
- **文件存储**：本地文件系统（也许未来可扩展至云存储）
- **API 文档**：Swagger/OpenAPI

### 前端 (Vue 3)
- **框架**：Vue 3 + Composition API + TypeScript
- **状态管理**：Pinia
- **路由**：Vue Router 4
- **UI 组件**：自定义组件 + 渐进式样式
- **构建工具**：Vite

### 共享代码
- **类型定义**：统一的 TypeScript 接口
- **工具函数**：验证、格式化、错误处理
- **常量配置**：API 端点、错误代码、正则表达式

## 🚀 快速开始

### 前提条件
- Node.js 18+ 和 npm
- PostgreSQL 14+
- Redis 6+（等待后续实现）
- Git

### 开发环境部署

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/coarch.git
   cd coarch
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   # 后端配置
   cp packages/backend/.env.example packages/backend/.env
   # 编辑 .env 文件，设置数据库连接等信息
   
   # 前端配置
   cp packages/frontend/.env.example packages/frontend/.env.development
   ```

4. **启动数据库服务**
   ```bash
   cd packages/backend
   docker-compose up -d postgres redis
   ```

5. **运行数据库迁移**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

6. **启动开发服务器**
   ```bash
   # 启动后端（端口 3000）
   npm run start:dev
   
   # 启动前端（新终端，端口 5173）
   cd packages/frontend
   npm run dev
   ```

7. **访问应用**
   - 前端：http://localhost:5173
   - 后端 API：http://localhost:3000/api
   - API 文档：http://localhost:3000/api/docs

### 生产环境部署（等待后续实现）

提供多种部署方式：

1. **全容器化部署**（推荐）
   ```bash
   ./scripts/deploy.sh --mode=docker --env=production
   ```

2. **混合部署**（数据库容器 + 系统服务）
   ```bash
   ./scripts/deploy.sh --mode=hybrid --env=production
   ```

3. **纯系统部署**
   ```bash
   ./scripts/deploy.sh --mode=system --env=production
   ```

详细部署指南请查看 [部署文档](docs/deployment.md)。

## 🏗️ 项目结构

```
coarch/
├── packages/
│   ├── backend/          # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/  # 功能模块（auth, articles, comments...）
│   │   │   ├── common/   # 通用模块（过滤器、拦截器、守卫）
│   │   │   ├── shared/   # 共享模块（数据库、配置）
│   │   │   └── config/   # 配置管理
│   │   ├── prisma/       # 数据库架构和迁移
│   │   └── uploads/      # 文件上传目录
│   ├── frontend/         # Vue 3 前端
│   │   ├── src/
│   │   │   ├── views/    # 页面组件
│   │   │   ├── components/# 可复用组件
│   │   │   ├── stores/   # Pinia 状态管理
│   │   │   ├── utils/    # 工具函数
│   │   │   └── config/   # 前端配置
│   │   └── public/       # 静态资源
│   └── shared/           # 共享代码包
│       ├── src/
│       │   ├── types/    # TypeScript 类型定义
│       │   ├── utils/    # 工具函数
│       │   └── constants/# 常量配置
│       └── dist/         # 构建输出
├── scripts/              # 部署和工具脚本
├── config-examples/      # 配置模板
└── docs/                 # 项目文档
```

## 📚 详细文档（等待后续编写）

- [开发指南](docs/development.md) - 开发环境设置和代码规范
- [API 文档](docs/api.md) - 完整的 API 接口文档
- [数据库指南](docs/database.md) - 数据库设计和迁移
- [部署指南](docs/deployment.md) - 生产环境部署

## 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读：
- [贡献指南](CONTRIBUTING.md) - 如何开始贡献
- [行为准则](CODE_OF_CONDUCT.md) - 社区行为规范
- [安全政策](SECURITY.md) - 安全漏洞报告流程

### 贡献流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 联系方式

- **项目维护者**：[猫帕]
- **问题反馈**：[GitHub Issues](https://github.com/C-Nekopedia/CoArch/issues)
- **安全报告**：请查看 [SECURITY.md](SECURITY.md)

---

<p align="center">
  使用 💙 构建 | 欢迎 Star ⭐ 和 Fork 🍴
</p>
