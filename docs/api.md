# API 文档

本文档提供 CoArch 项目完整的 REST API 接口文档。所有 API 遵循统一的响应格式和错误处理机制。

## API 基础信息

### 基本 URL

- **开发环境**：`http://localhost:3000/api`
- **生产环境**：`https://your-domain.com/api`

### 响应格式

所有 API 响应遵循以下格式：

```typescript
interface ApiResponse<T = any> {
  success: boolean;      // 请求是否成功
  data?: T;             // 响应数据
  message?: string;      // 成功或错误消息
  error?: string;       // 错误详情（仅失败时）
  code?: number;        // 业务错误代码
  timestamp?: string;   // 响应时间戳
}
```

### 分页响应

分页接口返回以下格式：

```typescript
interface PaginatedResponse<T> {
  items: T[];           // 数据列表
  pagination: {
    page: number;       // 当前页码
    pageSize: number;   // 每页数量
    total: number;      // 总记录数
    totalPages: number; // 总页数
    hasNext: boolean;   // 是否有下一页
    hasPrev: boolean;   // 是否有上一页
  };
}
```

### 错误代码

| 代码范围 | 说明 | 示例 |
|---------|------|------|
| 1000-1099 | 网络错误 | 1001: 网络连接超时 |
| 1100-1199 | 认证错误 | 1101: 令牌无效 |
| 1200-1299 | 客户端错误 | 1201: 参数验证失败 |
| 1300-1399 | 服务器错误 | 1301: 数据库错误 |
| 1400-1499 | 业务逻辑错误 | 1401: 资源不存在 |

### 认证

大多数 API 需要 JWT 认证。在请求头中添加：

```
Authorization: Bearer <access_token>
```

## 认证 API

### 用户注册

注册新用户账户。

**端点**：`POST /auth/register`

**请求体**：
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": null,
      "bio": null,
      "followersCount": 0,
      "followingCount": 0,
      "articleCount": 0,
      "videoCount": 0
    }
  },
  "message": "注册成功"
}
```

**状态码**：
- `201 Created` - 注册成功
- `400 Bad Request` - 参数验证失败
- `409 Conflict` - 用户名或邮箱已存在

### 用户登录

使用邮箱和密码登录。

**端点**：`POST /auth/login`

**请求体**：
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": null,
      "bio": null,
      "followersCount": 0,
      "followingCount": 0,
      "articleCount": 0,
      "videoCount": 0
    }
  },
  "message": "登录成功"
}
```

**状态码**：
- `200 OK` - 登录成功
- `400 Bad Request` - 参数验证失败
- `401 Unauthorized` - 邮箱或密码错误

### 刷新访问令牌

使用刷新令牌获取新的访问令牌。

**端点**：`POST /auth/refresh`

**请求体**：
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": null,
      "bio": null,
      "followersCount": 0,
      "followingCount": 0,
      "articleCount": 0,
      "videoCount": 0
    }
  },
  "message": "令牌刷新成功"
}
```

**状态码**：
- `200 OK` - 刷新成功
- `400 Bad Request` - 参数验证失败
- `401 Unauthorized` - 刷新令牌无效或已过期

### 用户注销

注销当前用户，使令牌失效。

**端点**：`POST /auth/logout`

**认证**：需要 Bearer Token

**响应**：
```json
{
  "success": true,
  "data": null,
  "message": "注销成功"
}
```

**状态码**：
- `200 OK` - 注销成功
- `401 Unauthorized` - 未授权访问

### 获取当前用户信息

获取已登录用户的个人信息。

**端点**：`GET /auth/profile`

**认证**：需要 Bearer Token

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": null,
    "bio": null,
    "followersCount": 0,
    "followingCount": 0,
    "articleCount": 0,
    "videoCount": 0,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T10:30:00.000Z",
    "lastLoginAt": "2026-03-28T10:30:00.000Z"
  },
  "message": "获取用户信息成功"
}
```

**状态码**：
- `200 OK` - 获取成功
- `401 Unauthorized` - 未授权访问

## 内容 API

### 创建内容（文章或视频）

创建新的文章或视频内容。

**端点**：`POST /articles`

**认证**：需要 Bearer Token

**请求体**：
```json
{
  "title": "我的第一篇技术文章",
  "content": "# 标题\n\n这里是文章内容...",
  "excerpt": "这是一篇关于技术的文章...",
  "cover": "https://example.com/cover.jpg",
  "type": "article",  // 可选：article 或 video
  "duration": null,   // 视频时长（秒），仅视频类型需要
  "bilibiliUrl": null, // B站视频URL，仅视频类型需要
  "tags": ["技术", "编程", "JavaScript"],
  "category": "技术"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "我的第一篇技术文章",
    "content": "# 标题\n\n这里是文章内容...",
    "excerpt": "这是一篇关于技术的文章...",
    "cover": "https://example.com/cover.jpg",
    "type": "article",
    "duration": null,
    "bilibiliUrl": null,
    "tags": ["技术", "编程", "JavaScript"],
    "category": "技术",
    "viewsCount": 0,
    "likesCount": 0,
    "commentsCount": 0,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T10:30:00.000Z",
    "publishedAt": "2026-03-28T10:30:00.000Z",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "isLiked": false
  },
  "message": "创建成功"
}
```

**状态码**：
- `201 Created` - 创建成功
- `400 Bad Request` - 参数验证失败
- `401 Unauthorized` - 未授权访问

### 获取内容列表

获取内容列表，支持分页、筛选和排序。

**端点**：`GET /articles`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | number | 否 | 页码，默认为1 |
| `pageSize` | number | 否 | 每页数量，默认为20，最大100 |
| `type` | string | 否 | 内容类型：article（文章）或 video（视频） |
| `author` | string | 否 | 作者用户名 |
| `category` | string | 否 | 分类 |
| `tag` | string | 否 | 标签 |
| `search` | string | 否 | 搜索关键词 |
| `sortBy` | string | 否 | 排序字段：createdAt（创建时间）、views（浏览量）、likes（点赞数）、comments（评论数） |
| `sortOrder` | string | 否 | 排序顺序：asc（升序）或 desc（降序） |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "我的第一篇技术文章",
        "content": "# 标题\n\n这里是文章内容...",
        "excerpt": "这是一篇关于技术的文章...",
        "cover": "https://example.com/cover.jpg",
        "type": "article",
        "duration": null,
        "bilibiliUrl": null,
        "tags": ["技术", "编程", "JavaScript"],
        "category": "技术",
        "viewsCount": 100,
        "likesCount": 50,
        "commentsCount": 20,
        "createdAt": "2026-03-28T10:30:00.000Z",
        "updatedAt": "2026-03-28T10:30:00.000Z",
        "publishedAt": "2026-03-28T10:30:00.000Z",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "username": "john_doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "isLiked": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "获取内容列表成功"
}
```

**状态码**：
- `200 OK` - 获取成功

### 获取内容详情

获取指定内容的详细信息。

**端点**：`GET /articles/{id}`

**路径参数**：
- `id` - 内容ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "我的第一篇技术文章",
    "content": "# 标题\n\n这里是文章内容...",
    "excerpt": "这是一篇关于技术的文章...",
    "cover": "https://example.com/cover.jpg",
    "type": "article",
    "duration": null,
    "bilibiliUrl": null,
    "tags": ["技术", "编程", "JavaScript"],
    "category": "技术",
    "viewsCount": 100,
    "likesCount": 50,
    "commentsCount": 20,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T10:30:00.000Z",
    "publishedAt": "2026-03-28T10:30:00.000Z",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "isLiked": true
  },
  "message": "获取内容详情成功"
}
```

**状态码**：
- `200 OK` - 获取成功
- `404 Not Found` - 内容不存在

### 更新内容

更新指定内容。

**端点**：`PUT /articles/{id}`

**认证**：需要 Bearer Token（必须是内容作者）

**路径参数**：
- `id` - 内容ID（UUID格式）

**请求体**：
```json
{
  "title": "更新后的标题",
  "content": "# 更新后的内容...",
  "excerpt": "这是更新后的摘要...",
  "cover": "https://example.com/new-cover.jpg",
  "tags": ["更新", "技术", "编程"],
  "category": "技术分享"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "更新后的标题",
    "content": "# 更新后的内容...",
    "excerpt": "这是更新后的摘要...",
    "cover": "https://example.com/new-cover.jpg",
    "type": "article",
    "duration": null,
    "bilibiliUrl": null,
    "tags": ["更新", "技术", "编程"],
    "category": "技术分享",
    "viewsCount": 100,
    "likesCount": 50,
    "commentsCount": 20,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T11:30:00.000Z",
    "publishedAt": "2026-03-28T10:30:00.000Z",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "isLiked": true
  },
  "message": "更新内容成功"
}
```

**状态码**：
- `200 OK` - 更新成功
- `400 Bad Request` - 参数验证失败
- `401 Unauthorized` - 未授权访问
- `403 Forbidden` - 无权修改此内容
- `404 Not Found` - 内容不存在

### 删除内容

删除指定内容。

**端点**：`DELETE /articles/{id}`

**认证**：需要 Bearer Token（必须是内容作者）

**路径参数**：
- `id` - 内容ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

**状态码**：
- `204 No Content` - 删除成功
- `401 Unauthorized` - 未授权访问
- `403 Forbidden` - 无权删除此内容
- `404 Not Found` - 内容不存在

### 点赞内容

对指定内容进行点赞。

**端点**：`POST /articles/{id}/like`

**认证**：需要 Bearer Token

**路径参数**：
- `id` - 内容ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likesCount": 51
  },
  "message": "点赞成功"
}
```

**状态码**：
- `200 OK` - 点赞成功
- `401 Unauthorized` - 未授权访问
- `404 Not Found` - 内容不存在
- `409 Conflict` - 已经点赞过该内容

### 取消点赞内容

取消对指定内容的点赞。

**端点**：`DELETE /articles/{id}/like`

**认证**：需要 Bearer Token

**路径参数**：
- `id` - 内容ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "data": {
    "isLiked": false,
    "likesCount": 50
  },
  "message": "取消点赞成功"
}
```

**状态码**：
- `200 OK` - 取消点赞成功
- `401 Unauthorized` - 未授权访问
- `404 Not Found` - 内容不存在
- `409 Conflict` - 尚未点赞该内容

### 增加内容浏览量

增加指定内容的浏览量（无需认证）。

**端点**：`POST /articles/{id}/view`

**路径参数**：
- `id` - 内容ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "message": "浏览量增加成功"
}
```

**状态码**：
- `200 OK` - 增加成功
- `404 Not Found` - 内容不存在

## 评论 API

### 获取内容评论列表

获取指定内容的评论列表。

**端点**：`GET /comments`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `articleId` | string | 是 | 内容ID |
| `page` | number | 否 | 页码，默认为1 |
| `pageSize` | number | 否 | 每页数量，默认为20 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "content": "这是一条评论",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "username": "john_doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "articleId": "uuid",
        "parentId": null,
        "createdAt": "2026-03-28T10:30:00.000Z",
        "updatedAt": "2026-03-28T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "获取评论列表成功"
}
```

### 发表评论

对指定内容发表评论。

**端点**：`POST /comments`

**认证**：需要 Bearer Token

**请求体**：
```json
{
  "content": "这是一条评论",
  "articleId": "550e8400-e29b-41d4-a716-446655440000",
  "parentId": null  // 父评论ID，用于回复评论
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "这是一条评论",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "articleId": "uuid",
    "parentId": null,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T10:30:00.000Z"
  },
  "message": "评论发表成功"
}
```

### 删除评论

删除指定评论。

**端点**：`DELETE /comments/{id}`

**认证**：需要 Bearer Token（必须是评论作者或管理员）

**路径参数**：
- `id` - 评论ID（UUID格式）

**响应**：
```json
{
  "success": true,
  "message": "评论删除成功"
}
```

## 用户 API

### 获取用户信息

获取指定用户的公开信息。

**端点**：`GET /users/{username}`

**路径参数**：
- `username` - 用户名

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "这是一个用户简介",
    "followersCount": 100,
    "followingCount": 50,
    "articleCount": 25,
    "videoCount": 10,
    "createdAt": "2026-03-28T10:30:00.000Z"
  },
  "message": "获取用户信息成功"
}
```

### 更新用户信息

更新当前用户的信息。

**端点**：`PUT /users/profile`

**认证**：需要 Bearer Token

**请求体**：
```json
{
  "avatar": "https://example.com/new-avatar.jpg",
  "bio": "更新后的用户简介"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": "https://example.com/new-avatar.jpg",
    "bio": "更新后的用户简介",
    "followersCount": 100,
    "followingCount": 50,
    "articleCount": 25,
    "videoCount": 10,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "updatedAt": "2026-03-28T11:30:00.000Z"
  },
  "message": "用户信息更新成功"
}
```

## 上传 API

### 上传文件

上传图片或其他文件。

**端点**：`POST /upload`

**认证**：需要 Bearer Token

**请求格式**：`multipart/form-data`

**参数**：
- `file` - 文件内容
- `type` - 文件类型：`avatar`（头像）、`cover`（封面）、`content`（内容图片）

**响应**：
```json
{
  "success": true,
  "data": {
    "url": "/uploads/2026/03/28/filename.jpg",
    "filename": "filename.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  },
  "message": "文件上传成功"
}
```

**限制**：
- 最大文件大小：10MB
- 允许的文件类型：`image/jpeg`, `image/png`, `image/gif`
- 文件将根据类型存储在不同目录

## 搜索 API

### 搜索内容

搜索文章和视频。

**端点**：`GET /search`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词 |
| `page` | number | 否 | 页码，默认为1 |
| `pageSize` | number | 否 | 每页数量，默认为20 |
| `type` | string | 否 | 内容类型：article 或 video |
| `category` | string | 否 | 分类筛选 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "文章标题",
        "excerpt": "文章摘要...",
        "cover": "https://example.com/cover.jpg",
        "type": "article",
        "user": {
          "id": "uuid",
          "username": "author_name",
          "avatar": "https://example.com/avatar.jpg"
        },
        "createdAt": "2026-03-28T10:30:00.000Z",
        "viewsCount": 100,
        "likesCount": 50
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "搜索成功"
}
```

## 健康检查 API

### 服务健康状态

检查 API 服务是否正常运行。

**端点**：`GET /health`

**响应**：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-28T10:30:00.000Z",
    "uptime": 86400,
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  },
  "message": "服务运行正常"
}
```

## 使用示例

### cURL 示例

```bash
# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePassword123"}'

# 获取内容列表
curl -X GET "http://localhost:3000/api/articles?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc"

# 创建内容（需要认证）
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"title":"测试文章","content":"内容","type":"article","tags":["测试"]}'
```

### JavaScript Fetch 示例

```javascript
// 用户登录
const login = async () => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'SecurePassword123',
    }),
  });
  
  const data = await response.json();
  if (data.success) {
    const { accessToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
  }
  return data;
};

// 获取内容列表（带分页）
const getArticles = async (page = 1, pageSize = 20) => {
  const response = await fetch(
    `http://localhost:3000/api/articles?page=${page}&pageSize=${pageSize}&sortBy=createdAt&sortOrder=desc`
  );
  return await response.json();
};

// 创建内容（带认证）
const createArticle = async (articleData) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:3000/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(articleData),
  });
  return await response.json();
};
```

---
