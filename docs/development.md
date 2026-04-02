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
REDIS_URL="redis://localhost:6379"  # 可选，用于缓存功能

# JWT 配置
JWT_SECRET="your-jwt-secret-key-change-this"
JWT_EXPIRES_IN="7d"

# 应用配置
API_PORT=3001
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
- **后端 API**：http://localhost:3001/api
- **API 文档**：http://localhost:3001/api/docs
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

**验证管道配置注意事项**：
   - 项目使用 `class-validator@0.13.2` 和 `class-transformer@0.5.1`，与 NestJS 11 兼容
   - 验证管道配置在 `main.ts` 中统一管理，避免在 `app.module.ts` 中重复配置
   - 如果遇到 "class-validator package is missing" 警告，这是 NestJS 的误报，可忽略
   - 全局验证管道已启用 `transform: true`，自动转换请求数据为 DTO 实例

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

## 缓存系统

CoArch 使用 Redis 作为缓存层，提供高性能的数据访问。

### 缓存配置

1. **Redis 配置**：在 `.env` 文件中设置 Redis 连接参数：
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

2. **缓存模块**：位于 `src/shared/redis/`，提供统一的缓存服务接口。

### 缓存使用

#### 文章缓存
- 文章详情缓存：键格式 `article:{id}`，TTL 60分钟
- 点赞状态缓存：键格式 `article:{id}:like:{userId}`，TTL 5分钟
- 更新/删除文章时自动清除相关缓存

#### 缓存服务 API
```typescript
// 基本操作
await redisService.get<T>(key);
await redisService.set<T>(key, value, ttl);
await redisService.del(key);

// 高级操作
await redisService.getOrSet(key, fetchFn, ttl); // 缓存穿透保护
await redisService.getOrSetWithLock(key, fetchFn, ttl); // 缓存击穿保护
```

### 缓存策略
- **读多写少**：长时间缓存，更新时清除
- **高频更新**：短时间缓存或直接穿透
- **热点数据**：使用锁防止缓存击穿

## 日志系统

CoArch 使用结构化日志系统，基于 Pino 实现高性能日志记录。

### 日志配置

1. **开发环境**：美化输出，包含颜色和格式化时间
2. **生产环境**：JSON 格式输出，便于日志收集和分析

### 日志级别
- `debug`: 调试信息（开发环境）
- `info`: 常规操作信息
- `warn`: 警告信息
- `error`: 错误信息
- `fatal`: 致命错误

### 日志内容
- **HTTP 请求**：自动记录请求方法、URL、状态码、耗时
- **业务操作**：记录关键业务操作和性能指标
- **错误追踪**：完整的错误堆栈和上下文信息

### 请求追踪
每个 HTTP 请求都有唯一的 `X-Request-ID`，便于：
- 追踪请求链路
- 关联相关日志
- 调试分布式系统

### 日志使用

```typescript
// 在服务中使用
this.logger.info('操作完成', { userId, articleId });
this.logger.error('操作失败', error, { context: 'ArticlesService' });

// 记录 HTTP 请求（中间件自动处理）
// 记录性能指标
this.logger.logMetric('api_response_time', duration, 'ms', { endpoint: '/api/articles' });
```

## 性能监控

### 缓存命中率监控
通过日志记录缓存命中/未命中情况，分析缓存效果。

### API 性能监控
- 请求响应时间分布
- 错误率和慢查询
- 数据库查询性能

### 资源使用监控
- Redis 内存使用
- 数据库连接池
- 服务器资源使用率

## 高级优化功能

### 健康检查系统
CoArch 提供了完整的健康检查端点，用于监控系统各组件状态：

#### 健康检查端点
- `GET /api/v1/health` - 完整健康检查（数据库、Redis、内存）
- `GET /api/v1/health/ready` - 就绪检查（更严格）
- `GET /api/v1/health/live` - 存活检查（用于负载均衡器）
- `GET /api/v1/health/info` - 系统信息
- `GET /api/v1/health/cache-stats` - 缓存统计信息
- `POST /api/v1/health/cache-stats/reset` - 重置缓存统计

#### 缓存统计监控
Redis 缓存系统提供详细的统计信息：
- 命中率监控（整体和按前缀分组）
- 内存使用情况
- 操作计数（get、set、delete）
- 错误统计

### 性能指标收集（Prometheus）
系统集成了 Prometheus 指标收集：

#### 指标端点
- `GET /api/v1/metrics` - Prometheus 格式指标

#### 收集的指标
- HTTP 请求计数和持续时间
- 数据库查询性能和错误率
- 缓存命中率和操作统计
- 系统资源使用（内存、CPU、事件循环延迟）
- 活动请求数

### 请求限流和防护
系统内置多层防护机制：

#### 速率限制
- 基于 IP 的请求频率限制
- 可配置的时间窗口和最大请求数
- 生产环境：100 请求/15分钟
- 开发环境：1000 请求/小时

#### 慢速限制
- 针对频繁请求逐渐增加延迟
- 防止 API 滥用和暴力攻击
- 最大延迟限制为 5 秒

#### 健康检查豁免
- 健康检查端点不受限流影响
- 确保监控系统始终可访问

### 数据库查询优化

#### 慢查询监控
- 自动检测并记录慢查询
- 可配置阈值（默认 100ms）
- 详细的查询日志（开发环境）

#### 查询性能分析
- 查询类型分类（SELECT、INSERT、UPDATE等）
- 执行时间统计
- 错误追踪和报告

### API 响应优化

#### 压缩中间件
- 智能内容类型压缩
- 可配置的压缩级别和阈值
- 支持 JSON、文本、JavaScript、XML 等格式

#### 安全中间件
- Helmet.js 安全头部（生产环境）
- CORS 配置
- 请求体大小限制

## 环境变量配置

新增优化相关环境变量：

```env
# 数据库性能监控
DB_SLOW_QUERY_THRESHOLD=100  # 慢查询阈值（毫秒）

# 日志配置
LOG_LEVEL=debug  # 日志级别：debug, info, warn, error, fatal
```

## 获取帮助

- **GitHub Issues**：报告 bug 或请求功能
- **项目文档**：查看相关文档
- **代码审查**：提交 Pull Request 前进行代码审查

---

*最后更新：2026-04-01*

> **优化功能已全部实现**：
> - ✅ 健康检查端点系统
> - ✅ 缓存命中率监控和统计
> - ✅ API响应压缩中间件
> - ✅ 请求限流和并发控制
> - ✅ Prometheus指标收集
> - ✅ 数据库慢查询监控