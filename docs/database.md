# 数据库指南

本文档提供 CoArch 项目的数据库设计、迁移和维护指南。项目使用 PostgreSQL 数据库和 Prisma ORM。

## 数据库架构概述

CoArch 使用 PostgreSQL 14+ 作为主数据库，Redis 6+ 作为缓存（可选）。数据库设计遵循关系型数据库最佳实践，支持用户管理、内容创作、评论互动等核心功能。

### 技术栈

- **数据库**：PostgreSQL 14+
- **ORM**：Prisma 7+
- **缓存**：Redis 7+（可选）
- **迁移工具**：Prisma Migrate

### 连接配置

```env
# .env 文件中的数据库配置
DATABASE_URL="postgresql://coarch:password@localhost:5432/coarch?schema=public"
REDIS_URL="redis://localhost:6379"
```

## 数据模型

### 实体关系图

```
┌───────────┐       ┌────────────┐       ┌───────────┐
│   User    │◄──────│ UserFollow │──────►│   User    │
└───────────┘       └────────────┘       └───────────┘
      │                     │
      │                     │
      ▼                     ▼
┌───────────┐       ┌────────────┐
│  Article  │◄──────│ ArticleLike│
└───────────┘       └────────────┘
      │                     │
      │                     │
      ▼                     ▼
┌───────────┐       ┌────────────┐
│  Comment  │◄──────│ CommentLike│
└───────────┘       └────────────┘
```

### 表结构详细说明

#### 1. 用户表 (users)

存储用户基本信息。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| id | uuid | 是 | 主键 | @id @default(uuid()) |
| username | varchar(50) | 是 | 用户名，唯一 | @unique |
| email | string | 是 | 邮箱，唯一 | @unique |
| password_hash | string | 是 | 密码哈希值 | - |
| avatar | varchar(500) | 否 | 头像URL | - |
| bio | text | 否 | 个人简介 | - |
| followers_count | integer | 是 | 粉丝数 | @default(0) |
| following_count | integer | 是 | 关注数 | @default(0) |
| article_count | integer | 是 | 文章数 | @default(0) |
| video_count | integer | 是 | 视频数 | @default(0) |
| is_creator | boolean | 是 | 是否为创作者 | @default(false) |
| created_at | timestamp | 是 | 创建时间 | @default(now()) |
| updated_at | timestamp | 是 | 更新时间 | @updatedAt |
| last_login_at | timestamp | 否 | 最后登录时间 | - |
| deleted_at | timestamp | 否 | 软删除时间 | - |

**索引**：
- 主键索引：id
- 唯一索引：username, email
- 普通索引：created_at

**关联关系**：
- 一个用户可以有多个文章 (User ↔ Article: 1:N)
- 一个用户可以有多个评论 (User ↔ Comment: 1:N)
- 一个用户可以有多个刷新令牌 (User ↔ RefreshToken: 1:N)
- 用户关注关系 (User ↔ UserFollow: N:M)

#### 2. 内容表 (articles)

存储文章和视频内容。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| id | uuid | 是 | 主键 | @id @default(uuid()) |
| user_id | uuid | 是 | 作者ID | 外键 references users(id) |
| title | varchar(255) | 是 | 标题 | - |
| content | text | 是 | 内容（Markdown格式） | - |
| excerpt | text | 否 | 摘要 | - |
| cover | varchar(500) | 否 | 封面图URL | - |
| type | varchar(10) | 是 | 内容类型：article 或 video | - |
| duration | varchar(20) | 否 | 视频时长（秒） | - |
| bilibili_url | varchar(500) | 否 | B站视频URL | - |
| bilibili_view_count | integer | 是 | B站播放量 | @default(0) |
| bilibili_like_count | integer | 是 | B站点赞数 | @default(0) |
| bilibili_danmaku_count | integer | 是 | B站弹幕数 | @default(0) |
| bilibili_author | varchar(100) | 否 | B站作者 | - |
| tags | text[] | 是 | 标签数组 | PostgreSQL数组类型 |
| category | varchar(100) | 否 | 分类 | - |
| views_count | integer | 是 | 浏览量 | @default(0) |
| likes_count | integer | 是 | 点赞数 | @default(0) |
| comments_count | integer | 是 | 评论数 | @default(0) |
| created_at | timestamp | 是 | 创建时间 | @default(now()) |
| updated_at | timestamp | 是 | 更新时间 | @updatedAt |
| published_at | timestamp | 是 | 发布时间 | @default(now()) |
| deleted_at | timestamp | 否 | 软删除时间 | - |

**索引**：
- 主键索引：id
- 外键索引：user_id
- 普通索引：type, created_at, category
- 复合索引：(type, created_at), (user_id, created_at)

**关联关系**：
- 属于一个用户 (Article ↔ User: N:1)
- 可以有多个评论 (Article ↔ Comment: 1:N)
- 可以有多个点赞 (Article ↔ ArticleLike: 1:N)

#### 3. 评论表 (comments)

存储内容的评论。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| id | uuid | 是 | 主键 | @id @default(uuid()) |
| article_id | uuid | 是 | 内容ID | 外键 references articles(id) |
| user_id | uuid | 是 | 用户ID | 外键 references users(id) |
| parent_id | uuid | 否 | 父评论ID | 自引用外键 |
| depth | integer | 是 | 评论层级（1-3级） | @default(1) |
| content | text | 是 | 评论内容 | - |
| likes_count | integer | 是 | 点赞数 | @default(0) |
| created_at | timestamp | 是 | 创建时间 | @default(now()) |
| updated_at | timestamp | 是 | 更新时间 | @updatedAt |
| deleted_at | timestamp | 否 | 软删除时间 | - |

**索引**：
- 主键索引：id
- 外键索引：article_id, user_id, parent_id
- 普通索引：depth
- 复合索引：(article_id, created_at)

**关联关系**：
- 属于一篇文章 (Comment ↔ Article: N:1)
- 属于一个用户 (Comment ↔ User: N:1)
- 可以有父评论和子评论 (自引用关系)
- 可以有多个点赞 (Comment ↔ CommentLike: 1:N)

#### 4. 用户关注表 (user_follows)

存储用户关注关系。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| follower_id | uuid | 是 | 关注者ID | 复合主键，外键 references users(id) |
| following_id | uuid | 是 | 被关注者ID | 复合主键，外键 references users(id) |
| created_at | timestamp | 是 | 关注时间 | @default(now()) |

**索引**：
- 复合主键：(follower_id, following_id)
- 普通索引：follower_id, following_id, created_at

**约束**：
- 不能重复关注同一用户
- 不能关注自己（应用层约束）

#### 5. 内容点赞表 (article_likes)

存储用户对内容的点赞记录。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| user_id | uuid | 是 | 用户ID | 复合主键，外键 references users(id) |
| article_id | uuid | 是 | 内容ID | 复合主键，外键 references articles(id) |
| created_at | timestamp | 是 | 点赞时间 | @default(now()) |

**索引**：
- 复合主键：(user_id, article_id)
- 普通索引：user_id, article_id, created_at

#### 6. 评论点赞表 (comment_likes)

存储用户对评论的点赞记录。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| user_id | uuid | 是 | 用户ID | 复合主键，外键 references users(id) |
| comment_id | uuid | 是 | 评论ID | 复合主键，外键 references comments(id) |
| created_at | timestamp | 是 | 点赞时间 | @default(now()) |

**索引**：
- 复合主键：(user_id, comment_id)
- 普通索引：user_id, comment_id

#### 7. 刷新令牌表 (refresh_tokens)

存储JWT刷新令牌。

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| id | uuid | 是 | 主键 | @id @default(uuid()) |
| token | string | 是 | 令牌内容 | - |
| user_id | uuid | 是 | 用户ID | 外键 references users(id) |
| expires_at | timestamp | 是 | 过期时间 | - |
| revoked | boolean | 是 | 是否已撤销 | @default(false) |
| created_at | timestamp | 是 | 创建时间 | @default(now()) |
| revoked_at | timestamp | 否 | 撤销时间 | - |

**索引**：
- 主键索引：id
- 普通索引：token, user_id, expires_at

## 数据库迁移

### 环境准备

#### 1. 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

```sql
-- 在 PostgreSQL 中执行
CREATE DATABASE coarch;
CREATE USER coarch WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE coarch TO coarch;
\c coarch
GRANT ALL ON SCHEMA public TO coarch;
```

#### 2. 使用 Docker（推荐）

```bash
# 启动 PostgreSQL 容器
docker run -d \
  --name coarch-postgres \
  -e POSTGRES_DB=coarch \
  -e POSTGRES_USER=coarch \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15-alpine

# 启动 Redis 容器（可选）
docker run -d \
  --name coarch-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 迁移命令

#### 初始化数据库

```bash
# 进入后端目录
cd packages/backend

# 1. 创建数据库（如果不存在）
npx prisma db create

# 2. 应用迁移
npx prisma migrate deploy

# 3. 生成 Prisma 客户端
npx prisma generate

# 4. 加载种子数据（可选）
npx prisma db seed
```

#### 创建新迁移

当修改 Prisma Schema 后：

```bash
# 1. 创建迁移文件
npx prisma migrate dev --name add_new_feature

# 2. 应用迁移并生成客户端
# （会自动执行 npx prisma generate）

# 3. 在生产环境部署迁移
npx prisma migrate deploy
```

#### 重置数据库（开发环境）

```bash
# 删除并重新创建数据库（危险！）
npx prisma migrate reset

# 或手动重置
npx prisma db push --force-reset
```

### 迁移最佳实践

1. **小步迁移**：每次迁移只做一件小事
2. **向后兼容**：确保迁移不影响现有数据
3. **测试迁移**：在开发环境充分测试
4. **备份数据**：生产环境迁移前备份
5. **回滚计划**：准备好回滚方案

## 种子数据

### 默认种子数据

项目包含基本的种子数据，用于开发和测试：

```bash
# 运行种子脚本
npx prisma db seed
```

种子数据包括：
- 测试用户（普通用户、创作者）
- 示例文章和视频
- 测试评论
- 用户关注关系

### 自定义种子数据

编辑 `prisma/seed.ts` 文件：

```typescript
// 示例：添加更多测试数据
async function main() {
  // 创建更多用户
  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        username: `testuser${i}`,
        email: `user${i}@example.com`,
        passwordHash: await hashPassword('password123'),
        bio: `这是测试用户 ${i} 的简介`,
      },
    });
  }
}
```

## 数据库维护

### 性能优化

#### 1. 查询优化

```sql
-- 查看慢查询
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- 分析查询计划
EXPLAIN ANALYZE
SELECT * FROM articles WHERE user_id = 'uuid' AND type = 'article';
```

#### 2. 索引优化

```sql
-- 查看索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 创建缺失索引
CREATE INDEX idx_articles_user_type 
ON articles(user_id, type, created_at DESC);
```

#### 3. 表维护

```sql
-- 清理旧数据（软删除）
DELETE FROM articles WHERE deleted_at < NOW() - INTERVAL '30 days';

-- 重新计算统计字段
UPDATE users u
SET 
  article_count = (SELECT COUNT(*) FROM articles a WHERE a.user_id = u.id AND a.deleted_at IS NULL),
  followers_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = u.id),
  following_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id = u.id);
```

### 备份与恢复

#### 1. 备份数据库

```bash
# 使用 pg_dump 备份
pg_dump -U coarch -h localhost -d coarch -F c -f coarch_backup.dump

# 使用 Docker 备份
docker exec coarch-postgres pg_dump -U coarch coarch > backup.sql
```

#### 2. 恢复数据库

```bash
# 从备份恢复
pg_restore -U coarch -h localhost -d coarch -c coarch_backup.dump

# 从 SQL 文件恢复
psql -U coarch -h localhost -d coarch < backup.sql
```

#### 3. 自动化备份脚本

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/coarch_$DATE.dump"

# 创建备份
pg_dump -U coarch -h localhost -d coarch -F c -f "$BACKUP_FILE"

# 保留最近7天的备份
find "$BACKUP_DIR" -name "coarch_*.dump" -mtime +7 -delete

# 上传到云存储（可选）
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
```

### 监控与告警

#### 1. 关键指标监控

- 连接数：`SHOW max_connections;`
- 活跃连接：`SELECT count(*) FROM pg_stat_activity;`
- 数据库大小：`SELECT pg_database_size('coarch');`
- 表大小：`SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;`

#### 2. 健康检查

```sql
-- 数据库连接检查
SELECT 1;

-- 关键表数据检查
SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM articles) as article_count,
  (SELECT COUNT(*) FROM comments) as comment_count;

-- 索引健康检查
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes;
```

## 故障排除

### 常见问题

#### 1. 连接失败

```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 检查连接配置
psql -U coarch -h localhost -d coarch

# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. 迁移失败

```bash
# 查看迁移状态
npx prisma migrate status

# 修复迁移冲突
npx prisma migrate resolve

# 重置开发环境
npx prisma migrate reset
```

#### 3. 性能问题

```sql
-- 查看锁等待
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.query AS blocked_query,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 终止阻塞进程
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';
```

### 日志分析

```bash
# PostgreSQL 错误日志
sudo grep -i error /var/log/postgresql/postgresql-15-main.log

# 慢查询日志（需要配置）
# 在 postgresql.conf 中添加：
# log_min_duration_statement = 1000  # 记录超过1秒的查询
```

## 扩展方案

### 分库分表

当数据量增长时考虑：

1. **按用户分片**：不同用户的数据存储在不同数据库
2. **按时间分区**：按月份或年份分区历史数据
3. **读写分离**：主库写，从库读

### 数据归档

```sql
-- 创建归档表
CREATE TABLE articles_archive (LIKE articles INCLUDING ALL);

-- 迁移历史数据
INSERT INTO articles_archive 
SELECT * FROM articles 
WHERE created_at < NOW() - INTERVAL '1 year';

-- 删除已归档数据
DELETE FROM articles WHERE created_at < NOW() - INTERVAL '1 year';
```

## 参考链接

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [数据库设计最佳实践](https://www.postgresql.org/docs/current/ddl.html)

---

*最后更新：2026-04-01*