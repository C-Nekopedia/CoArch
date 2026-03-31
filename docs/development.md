# 开发指南

本文档提供 CoArch 项目的开发环境设置、代码规范和开发流程指南。

## 环境要求

### 必备软件
- **Node.js** 18+ 和 npm 8+
- **Git** 2.30+
- **Docker** 24+ 和 Docker Compose 2.20+（可选，用于本地数据库）
- **PostgreSQL** 14+（如果不用 Docker）

### 推荐工具
- **VS Code** 或 **WebStorm**
- **Postman** 或 **Insomnia**（API 测试）
- **Git GUI 客户端**（如 Sourcetree, GitKraken）

## 项目结构

```
coarch/
├── packages/
│   ├── backend/          # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/      # 功能模块
│   │   │   │   ├── auth/     # 认证模块
│   │   │   │   ├── articles/ # 文章模块
│   │   │   │   ├── comments/ # 评论模块
│   │   │   │   └── users/    # 用户模块
│   │   │   ├── common/       # 通用模块
│   │   │   ├── shared/       # 共享模块
│   │   │   └── config/       # 配置管理
│   │   ├── prisma/           # 数据库架构
│   │   └── uploads/          # 文件上传目录
│   ├── frontend/         # Vue 3 前端
│   │   ├── src/
│   │   │   ├── views/        # 页面组件
│   │   │   ├── components/   # 可复用组件
│   │   │   ├── stores/       # Pinia 状态管理
│   │   │   ├── utils/        # 工具函数
│   │   │   └── config/       # 前端配置
│   │   └── public/           # 静态资源
│   └── shared/           # 共享代码包
│       ├── src/
│       │   ├── types/        # TypeScript 类型定义
│       │   ├── utils/        # 工具函数
│       │   └── constants/    # 常量配置
│       └── dist/             # 构建输出
├── scripts/              # 部署和工具脚本
├── config-examples/      # 配置模板
└── docs/                 # 项目文档
```

## 开发环境设置

### 1. 克隆仓库

```bash
git clone https://github.com/C-Nekopedia/CoArch.git
cd coarch
```

### 2. 安装依赖

```bash
# 安装所有包依赖（使用 npm workspaces）
npm install

# 或者分别安装
cd packages/backend && npm install
cd ../frontend && npm install
cd ../shared && npm install
```

### 3. 配置环境变量

```bash
# 后端环境变量
cp packages/backend/.env.example packages/backend/.env
# 编辑 .env 文件，设置数据库连接等信息

# 前端环境变量（开发环境）
cp packages/frontend/.env.example packages/frontend/.env.development
```

#### 后端环境变量说明
```env
# 数据库配置
DATABASE_URL="postgresql://coarch:password@localhost:5432/coarch?schema=public"

# Redis 配置（可选）
REDIS_URL="redis://localhost:6379"

# JWT 配置
JWT_SECRET="your-jwt-secret-key-change-this"
JWT_EXPIRES_IN="7d"

# 应用配置
API_PORT=3000
NODE_ENV=development

# 文件上传
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_MIME_TYPES="image/jpeg,image/png,image/gif"
```

### 4. 启动本地数据库（使用 Docker）

```bash
cd packages/backend
docker-compose up -d postgres redis
```

### 5. 运行数据库迁移

```bash
# 在 backend 目录中
npx prisma migrate deploy
npx prisma db seed  # 加载测试数据（可选）
```

### 6. 启动开发服务器

```bash
# 方法1：分别启动（推荐）
# 终端1 - 启动后端
cd packages/backend
npm run start:dev

# 终端2 - 启动前端
cd packages/frontend
npm run dev
```

```bash
# 方法2：使用 monorepo 脚本（同时启动）
npm run dev
```

### 7. 访问应用

- **前端开发服务器**：http://localhost:5173
- **后端 API**：http://localhost:3000/api
- **API 文档**：http://localhost:3000/api/docs
- **Prisma Studio**（数据库管理）：`npx prisma studio`

## 代码规范

### TypeScript 规范

1. **类型定义**
   - 所有接口使用 `interface` 而不是 `type`（除非需要联合类型）
   - 导出类型使用 `export interface` 或 `export type`
   - 使用共享包中的类型定义，避免重复定义

2. **命名约定**
   - 接口：`PascalCase`，如 `UserProfile`
   - 变量和函数：`camelCase`
   - 常量：`UPPER_SNAKE_CASE`
   - 文件名：`kebab-case`

3. **类型安全**
   - 避免使用 `any`，使用 `unknown` 或具体类型
   - 使用可选链 `?.` 和空值合并 `??`
   - 启用严格模式（已在 tsconfig.json 中配置）

### Vue 组件规范

1. **组件结构**
   ```vue
   <template>
     <!-- 模板内容 -->
   </template>
   
   <script setup lang="ts">
   // 脚本内容
   </script>
   
   <style scoped>
   /* 样式内容 */
   </style>
   ```

2. **Composition API**
   - 使用 `<script setup>` 语法
   - 按逻辑组织代码，使用自定义组合函数
   - 使用 `ref`、`reactive`、`computed` 等响应式 API

3. **状态管理**
   - 使用 Pinia 进行全局状态管理
   - 按功能模块组织 store
   - 避免在组件中直接修改 store 状态，使用 actions

### NestJS 规范

1. **模块组织**
   - 每个功能一个模块（如 `AuthModule`、`ArticlesModule`）
   - 使用 NestJS 的依赖注入
   - 遵循单一职责原则

2. **DTO 和验证**
   - 使用 `class-validator` 进行输入验证
   - 为每个 API 端点创建对应的 DTO
   - 使用共享包中的类型定义作为基础

3. **错误处理**
   - 使用 NestJS 的异常过滤器
   - 统一的错误响应格式
   - 使用共享包中的错误代码

### Git 工作流

1. **分支策略**
   - `main`：稳定版本，用于生产环境
   - `develop`：开发分支，集成功能
   - `feature/*`：功能分支
   - `bugfix/*`：修复分支
   - `release/*`：发布分支

2. **提交消息**
   ```
   type(scope): subject
   
   body
   
   footer
   ```
   
   **类型**：
   - `feat`：新功能
   - `fix`：修复 bug
   - `docs`：文档更新
   - `style`：代码格式（不影响功能）
   - `refactor`：代码重构
   - `test`：测试相关
   - `chore`：构建过程或工具更改

3. **提交示例**
   ```bash
   git commit -m "feat(auth): add user registration endpoint"
   git commit -m "fix(articles): fix article creation validation"
   git commit -m "docs(readme): update installation instructions"
   ```

## 开发工作流

### 1. 开始新功能开发

```bash
# 创建功能分支
git checkout -b feature/user-profile

# 安装新依赖（如果需要）
cd packages/backend
npm install new-package

# 开发完成后提交
git add .
git commit -m "feat(users): add user profile page"
git push origin feature/user-profile
```

### 2. 运行测试

```bash
# 运行所有测试
npm run test

# 运行后端测试
cd packages/backend && npm run test

# 运行前端测试
cd packages/frontend && npm run test

# 运行 e2e 测试
cd packages/backend && npm run test:e2e
```

### 3. 代码质量检查

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# TypeScript 类型检查
cd packages/frontend && npm run type-check
cd packages/backend && npx tsc --noEmit
```

### 4. 构建检查

```bash
# 构建所有包
npm run build

# 构建后端
cd packages/backend && npm run build

# 构建前端
cd packages/frontend && npm run build
```

## 调试指南

### 后端调试

1. **使用调试模式**
   ```bash
   cd packages/backend
   npm run start:debug
   ```
   
   然后使用 VS Code 的调试器连接到端口 9229。

2. **日志级别**
   - 开发环境：`DEBUG` 级别
   - 生产环境：`INFO` 级别

3. **数据库调试**
   ```bash
   # 查看 Prisma 生成的 SQL
   PRISMA_LOG_LEVELS="query,info,warn,error" npm run start:dev
   
   # 使用 Prisma Studio 查看数据
   npx prisma studio
   ```

### 前端调试

1. **浏览器开发者工具**
   - 使用 Vue Devtools 扩展
   - 查看组件层次结构和状态

2. **网络请求调试**
   - 查看 API 请求和响应
   - 检查请求头和响应体

3. **控制台日志**
   ```typescript
   // 开发环境日志
   if (import.meta.env.DEV) {
     console.log('Debug info:', data)
   }
   ```

## 常见问题

### 1. 数据库连接失败
- 检查 PostgreSQL 服务是否运行
- 验证 `DATABASE_URL` 环境变量
- 运行 `docker-compose ps` 检查容器状态

### 2. 端口冲突
- 后端默认端口：3000
- 前端开发服务器：5173
- 修改端口可在环境变量中设置

### 3. 依赖安装失败
- 清除 npm 缓存：`npm cache clean --force`
- 删除 node_modules 重新安装
- 使用 `npm install --legacy-peer-deps`（如果遇到兼容性问题）

### 4. TypeScript 编译错误
- 运行类型检查：`npm run type-check`
- 检查共享包是否正确构建
- 确保所有类型定义已导出

## 性能优化建议

### 开发环境
- 使用 Vite 的热模块替换（HMR）
- 启用懒加载路由
- 使用 Tree-shaking 减少打包体积

### 生产环境
- 启用压缩和代码分割
- 使用 CDN 分发静态资源
- 启用浏览器缓存
- 数据库查询优化

## 贡献指南

请参阅 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解如何为项目做贡献。

## 获取帮助

- **GitHub Issues**：报告 bug 或请求功能
- **项目文档**：查看相关文档
- **代码审查**：提交 Pull Request 前进行代码审查

---

*最后更新：2026-04-01*