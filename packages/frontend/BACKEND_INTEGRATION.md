# 后端集成文档

## 项目概述

Co-Arch 是一个内容创作与分享平台，支持文章和视频两种内容形式。前端采用 Vue 3 + TypeScript + Pinia + Vue Router 技术栈，当前版本为功能完整的原型，所有数据操作均为本地模拟。//现已采用真实用户账户进行操作。

本文档旨在为后端开发者提供完整的前端API需求说明，以便实现相应的后端服务。

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **构建工具**: Vite
- **UI框架**: 自定义CSS（无第三方UI库）

## 项目结构

```
frontend-vue/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # 可复用组件
│   ├── composables/     # 组合式函数
│   ├── config/         # 配置文件（API客户端）
│   ├── router/         # 路由配置
│   ├── stores/         # 状态管理
│   ├── types/          # TypeScript类型定义
│   ├── utils/          # 工具函数
│   ├── views/          # 页面组件
│   └── main.ts         # 应用入口
├── .env.development    # 开发环境变量
├── .env.production     # 生产环境变量
└── package.json
```

## 环境配置

前端使用环境变量来配置API端点和其他设置：

### 开发环境 (.env.development)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Co-Arch (开发环境)
VITE_DEBUG=true
VITE_LOG_API_REQUESTS=true
VITE_USE_MOCK_DATA=false
```

### 生产环境 (.env.production)
```env
VITE_API_BASE_URL=/api
VITE_APP_NAME=Co-Arch
VITE_DEBUG=false
VITE_LOG_API_REQUESTS=false
VITE_USE_MOCK_DATA=false
```

**注意**: 所有客户端可访问的环境变量必须以 `VITE_` 开头。

## API客户端配置

前端已经配置了统一的API客户端，位于 `src/config/api.ts`，包含以下功能：

1. **自动添加认证token**: 从localStorage读取token并添加到请求头
2. **统一的错误处理**: 处理HTTP状态码和网络错误
3. **请求超时**: 默认30秒超时
4. **请求重试**: 支持token过期自动刷新
5. **便捷方法**: 提供 `get`, `post`, `put`, `patch`, `delete` 等方法

### 使用示例
```typescript
import api from '@config/api'

// GET请求
const response = await api.get('/articles', { page: 1, pageSize: 20 })

// POST请求
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
})
```

## 认证系统

### 认证流程
1. 用户通过登录或注册获取JWT token
2. token存储在localStorage中（键名: `auth_token`）
3. 后续所有API请求自动在请求头中添加 `Authorization: Bearer <token>`
4. token过期时尝试使用刷新令牌获取新token

### 需要的认证接口

#### 1. 用户登录
- **端点**: `POST /api/auth/login`
- **请求体**:
  ```typescript
  {
    email: string;      // 用户邮箱
    password: string;   // 密码
    rememberMe?: boolean; // 是否记住登录状态
  }
  ```
- **响应体**:
  ```typescript
  {
    success: boolean;
    user: User;         // 用户信息
    token: string;      // 访问令牌
    refreshToken?: string; // 刷新令牌
    expiresIn?: number; // 令牌有效期（秒）
  }
  ```

#### 2. 用户注册
- **端点**: `POST /api/auth/register`
- **请求体**:
  ```typescript
  {
    username: string;         // 用户名
    email: string;           // 邮箱
    password: string;        // 密码
    confirmPassword: string; // 确认密码
  }
  ```
- **响应体**: 同登录响应

#### 3. 获取当前用户信息
- **端点**: `GET /api/auth/profile`
- **认证**: 需要有效的JWT token
- **响应体**:
  ```typescript
  {
    success: boolean;
    user: User;
  }
  ```

#### 4. 更新用户资料
- **端点**: `PUT /api/auth/profile`
- **认证**: 需要有效的JWT token
- **请求体**:
  ```typescript
  {
    username?: string;  // 新用户名
    email?: string;     // 新邮箱
    avatar?: string;    // 新头像URL
    bio?: string;       // 新个人简介
  }
  ```

#### 5. 刷新访问令牌
- **端点**: `POST /api/auth/refresh`
- **请求体**:
  ```typescript
  {
    refreshToken: string;
  }
  ```
- **响应体**:
  ```typescript
  {
    success: boolean;
    token: string;        // 新的访问令牌
    refreshToken: string; // 新的刷新令牌
    expiresIn: number;    // 有效期（秒）
  }
  ```

### 用户对象定义
```typescript
interface User {
  id: string;           // 用户ID
  username: string;     // 用户名
  email: string;        // 邮箱
  avatar: string;       // 头像URL
  bio?: string;         // 个人简介
  createdAt: string;    // 创建时间 ISO字符串
  updatedAt?: string;   // 更新时间
  followers: number;    // 粉丝数
  following: number;    // 关注数
  articleCount: number; // 文章数
  videoCount: number;   // 视频数
  isFollowed?: boolean; // 当前用户是否已关注
}
```

## 内容管理系统

### 内容类型
平台支持两种内容类型：
- `article`: 文章，包含富文本内容
- `video`: 视频，可关联B站链接

### 内容对象定义
```typescript
interface Article {
  id: number;           // 内容ID
  title: string;        // 标题
  content: string;      // 内容（HTML或Markdown）
  excerpt?: string;     // 内容摘要
  cover: string;       // 封面图URL
  author: string;      // 作者名
  authorId: string;    // 作者ID
  authorAvatar: string; // 作者头像
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
  publishedAt?: string; // 发布时间
  views: number;       // 浏览数
  likes: number;       // 点赞数
  comments: number;    // 评论数
  type: 'article' | 'video'; // 内容类型
  duration?: string;    // 视频时长 "HH:MM:SS" 或 "MM:SS"
  plays?: number;      // 播放量（视频）
  bilibiliUrl?: string; // B站链接（视频）
  tags: string[];      // 标签
  category?: string;   // 分类
  isLiked?: boolean;   // 当前用户是否已点赞
  isBookmarked?: boolean; // 当前用户是否已收藏
}
```

### 内容相关接口

#### 1. 获取内容列表
- **端点**: `GET /api/articles`
- **查询参数**:
  ```typescript
  {
    page?: number;                     // 页码，默认1
    pageSize?: number;                 // 每页数量，默认20
    type?: 'article' | 'video';        // 内容类型筛选
    author?: string;                   // 按作者筛选
    category?: string;                 // 按分类筛选
    tag?: string;                      // 按标签筛选
    search?: string;                   // 关键词搜索
    sortBy?: 'createdAt' | 'views' | 'likes' | 'comments'; // 排序字段
    sortOrder?: 'asc' | 'desc';        // 排序顺序
  }
  ```
- **响应体**:
  ```typescript
  {
    success: boolean;
    data: {
      items: Article[];                // 内容列表
      pagination: {                    // 分页信息
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      }
    }
  }
  ```

#### 2. 获取单个内容详情
- **端点**: `GET /api/articles/:id`
- **响应体**:
  ```typescript
  {
    success: boolean;
    article: Article;
    relatedArticles?: Article[];       // 相关推荐
  }
  ```

#### 3. 创建内容
- **端点**: `POST /api/articles`
- **认证**: 需要有效的JWT token
- **请求体**:
  ```typescript
  {
    title: string;                     // 标题
    content: string;                   // 内容
    cover?: string;                    // 封面图URL或Base64
    type: 'article' | 'video';         // 内容类型
    bilibiliUrl?: string;              // B站链接（视频投稿）
    tags?: string[];                   // 标签
    category?: string;                 // 分类
    isDraft?: boolean;                 // 是否保存为草稿
  }
  ```
- **特殊要求**:
  - 对于视频投稿 (`type: 'video'`)，后端需要实现B站链接解析功能，自动获取：
    - 视频封面
    - 视频标题（可覆盖用户输入的标题）
    - 视频时长
    - 播放量、点赞数等统计数据

#### 4. 更新内容
- **端点**: `PUT /api/articles/:id`
- **认证**: 需要有效的JWT token，且用户必须是内容作者
- **请求体**: 同创建内容，所有字段可选

#### 5. 删除内容
- **端点**: `DELETE /api/articles/:id`
- **认证**: 需要有效的JWT token，且用户必须是内容作者

#### 6. 点赞/取消点赞
- **端点**: `POST /api/articles/:id/like`
- **认证**: 需要有效的JWT token
- **响应体**:
  ```typescript
  {
    success: boolean;
    likes: number;     // 更新后的点赞数
    isLiked: boolean;  // 当前用户是否已点赞
  }
  ```

## 评论系统

### 评论对象定义
```typescript
interface Comment {
  id: number;           // 评论ID
  articleId: number;    // 所属内容ID
  userId: string;       // 评论用户ID
  userName: string;     // 评论用户名
  userAvatar: string;   // 评论用户头像
  content: string;      // 评论内容
  createdAt: string;    // 创建时间
  updatedAt?: string;   // 更新时间
  likes: number;       // 点赞数
  replies?: Comment[];  // 回复评论
  parentId?: number;    // 父评论ID（用于嵌套评论）
  isLiked?: boolean;    // 当前用户是否已点赞
}
```

### 评论相关接口

#### 1. 获取评论列表
- **端点**: `GET /api/articles/:articleId/comments`
- **查询参数**:
  ```typescript
  {
    page?: number;      // 页码
    pageSize?: number;  // 每页数量
    parentId?: number;  // 父评论ID（获取子评论）
  }
  ```

#### 2. 添加评论
- **端点**: `POST /api/articles/:articleId/comments`
- **认证**: 需要有效的JWT token
- **请求体**:
  ```typescript
  {
    content: string;    // 评论内容
    parentId?: number;  // 父评论ID（回复评论时使用）
  }
  ```

#### 3. 更新评论
- **端点**: `PUT /api/comments/:id`
- **认证**: 需要有效的JWT token，且用户必须是评论作者

#### 4. 删除评论
- **端点**: `DELETE /api/comments/:id`
- **认证**: 需要有效的JWT token，且用户必须是评论作者或内容作者

#### 5. 点赞/取消点赞评论
- **端点**: `POST /api/comments/:id/like`
- **认证**: 需要有效的JWT token

## 用户关系系统

### 1. 获取用户信息
- **端点**: `GET /api/users/:username`
- **响应体**:
  ```typescript
  {
    success: boolean;
    user: User;
    articles: Article[];          // 用户发布的内容
    likedArticles?: Article[];    // 用户点赞的内容
    followers?: User[];           // 粉丝列表
    following?: User[];           // 关注列表
  }
  ```

### 2. 关注/取消关注用户
- **端点**: `POST /api/users/:username/follow`
- **认证**: 需要有效的JWT token
- **响应体**:
  ```typescript
  {
    success: boolean;
    isFollowing: boolean;         // 关注状态
    followers: number;            // 更新后的粉丝数
  }
  ```

### 3. 获取用户发布的内容
- **端点**: `GET /api/users/:username/articles`
- **查询参数**: 同内容列表接口

## 搜索功能

### 全局搜索
- **端点**: `GET /api/search`
- **查询参数**:
  ```typescript
  {
    q: string;                    // 搜索关键词
    type?: 'article' | 'video' | 'user' | 'all'; // 搜索类型
    category?: string;            // 分类筛选
    tag?: string;                 // 标签筛选
    page?: number;                // 页码
    pageSize?: number;            // 每页数量
    sortBy?: 'relevance' | 'date' | 'views' | 'likes'; // 排序方式
  }
  ```
- **响应体**:
  ```typescript
  {
    success: boolean;
    data: {
      articles: Article[];        // 匹配的内容
      users: User[];              // 匹配的用户
      total: number;              // 总结果数
    }
  }
  ```

## 文件上传

### 1. 上传图片
- **端点**: `POST /api/upload/image`
- **认证**: 需要有效的JWT token
- **请求格式**: `multipart/form-data`
- **字段**: `file` (图片文件)
- **响应体**:
  ```typescript
  {
    success: boolean;
    url: string;        // 图片访问URL
    filename: string;   // 文件名
    size: number;       // 文件大小（字节）
    mimeType: string;   // MIME类型
  }
  ```

### 2. 上传视频
- **端点**: `POST /api/upload/video` (如果需要本地视频存储)
- **认证**: 需要有效的JWT token
- **请求格式**: `multipart/form-data`
- **字段**: `file` (视频文件)

## 模拟数据与真实API切换

前端目前使用模拟数据，所有数据操作都在 `src/stores/` 目录中模拟实现。要切换为真实API，需要：

### 1. 修改环境变量
确保 `.env.development` 中的 `VITE_API_BASE_URL` 指向正确的后端地址。

### 2. 启用真实API
设置 `VITE_USE_MOCK_DATA=false` 以禁用模拟数据（前端代码会自动检查此变量）。

### 3. 逐步替换模拟函数
在以下文件中，所有标记为 `TODO` 的函数都需要替换为真实API调用：

- `src/stores/auth.ts`:
  - `login()` → `POST /api/auth/login`
  - `register()` → `POST /api/auth/register`

- `src/stores/articles.ts`:
  - `loadArticles()` → `GET /api/articles`
  - `loadArticle()` → `GET /api/articles/:id`
  - `addComment()` → `POST /api/articles/:id/comments`

- `src/views/Submit.vue`:
  - `handleVideoSubmit()` → `POST /api/articles` (type: 'video')
  - `handleArticleSubmit()` → `POST /api/articles` (type: 'article')

### 4. 参考示例代码
`src/services/api-examples.ts` 提供了如何将模拟函数替换为真实API调用的示例。

## 错误处理规范

### HTTP状态码
- `200`: 请求成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未认证或token过期
- `403`: 权限不足
- `404`: 资源不存在
- `422`: 数据验证失败
- `500`: 服务器内部错误

### 响应格式
所有API响应都应遵循以下格式：
```typescript
{
  success: boolean;     // 操作是否成功
  data?: any;           // 响应数据（成功时）
  message?: string;     // 成功或失败的消息
  error?: string;       // 错误描述（失败时）
  code?: number;        // 自定义错误码
  timestamp?: string;   // 响应时间戳
}
```

### 错误示例
```json
{
  "success": false,
  "error": "邮箱或密码不正确",
  "code": 1001,
  "timestamp": "2024-03-28T10:30:00.000Z"
}
```

## 安全考虑

### 1. 认证与授权
- 使用JWT进行用户认证
- 每个API端点都需要适当的权限检查
- 敏感操作（删除、修改）需要验证用户身份

### 2. 数据验证
- 所有用户输入都需要服务器端验证
- 防止SQL注入、XSS攻击等安全漏洞
- 文件上传需要类型和大小限制

### 3. 速率限制
- 对登录、注册等敏感接口实施速率限制
- 防止暴力破解和DDoS攻击

### 4. CORS配置
- 配置适当的CORS策略，允许前端域名访问
- 生产环境应限制为特定域名

## 部署建议

### 1. 反向代理配置
建议使用Nginx或类似工具作为反向代理：
```nginx
location /api/ {
  proxy_pass http://backend:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location / {
  root /path/to/frontend/dist;
  try_files $uri $uri/ /index.html;
}
```

### 2. 环境分离
- 开发环境：使用开发环境变量，启用调试功能
- 生产环境：使用生产环境变量，禁用调试功能

### 3. 监控与日志
- 记录所有API请求和错误
- 监控系统性能和资源使用情况
- 设置告警机制

## 开发与调试

### 1. 前后端并行开发
在后台API尚未完全实现时，可以：
1. 保持 `VITE_USE_MOCK_DATA=true`
2. 逐步实现API接口
3. 逐个替换模拟函数

### 2. API文档工具
建议使用Swagger/OpenAPI或类似工具生成API文档，便于前后端协作。

### 3. 测试数据
后端应提供测试数据或数据种子，便于前端开发和测试。

## 联系与支持

如果在集成过程中遇到问题，请参考：
1. 类型定义文件：`src/types/api.ts`
2. API客户端配置：`src/config/api.ts`
3. 示例代码：`src/services/api-examples.ts`
4. 代码中的TODO注释：标识了需要后端实现的功能

---

*最后更新: 2024-03-28*