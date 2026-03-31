# 部署指南

本文档提供 CoArch 项目在生产环境和开发环境的完整部署指南。项目支持三种部署模式：全容器化部署、混合部署和纯系统部署。

## 部署概述

### 部署模式对比

| 模式 | 描述 | 适用场景 | 复杂度 |
|------|------|----------|--------|
| **全容器化部署** | 所有服务（数据库、后端、前端）都运行在 Docker 容器中 | 开发环境、小型生产环境、快速部署 | 低 |
| **混合部署** | 数据库使用 Docker 容器，应用作为系统服务运行 | 推荐的生产环境部署方式，易于管理 | 中 |
| **纯系统部署** | 所有服务都直接安装到操作系统 | 高级用户、特殊环境要求 | 高 |

### 系统要求

#### 最低配置
- **CPU**：2 核
- **内存**：4 GB
- **存储**：20 GB SSD
- **操作系统**：Ubuntu 20.04+ / CentOS 8+ / Debian 11+

#### 推荐配置（生产环境）
- **CPU**：4 核
- **内存**：8 GB
- **存储**：100 GB SSD
- **操作系统**：Ubuntu 22.04 LTS

### 网络要求
- **HTTP 端口**：80（生产环境）
- **HTTPS 端口**：443（生产环境）
- **后端 API 端口**：3000（可配置）
- **数据库端口**：5432（PostgreSQL）
- **Redis 端口**：6379（可选）

## 部署准备

### 1. 获取项目代码

```bash
# 克隆仓库
git clone https://github.com/C-Nekopedia/CoArch.git
cd coarch

# 或下载最新发布版本
wget https://github.com/C-Nekopedia/CoArch/archive/refs/tags/v1.0.0.tar.gz
tar -xzf v1.0.0.tar.gz
cd CoArch-1.0.0
```

### 2. 环境检查

运行环境检查脚本：

```bash
# 检查系统环境
./scripts/deploy.sh --help
```

### 3. 域名和 SSL 证书（生产环境）

生产环境需要准备：
- 域名（如 `coarch.example.com`）
- SSL 证书（或使用 Let's Encrypt）
- DNS 解析配置

## 全容器化部署

使用 Docker Compose 一键部署所有服务。

### 部署步骤

```bash
# 1. 运行部署脚本（交互式）
./scripts/deploy.sh

# 2. 或直接指定参数
./scripts/deploy.sh --mode=docker --env=production --domain=coarch.example.com
```

### 配置文件

部署脚本会自动生成以下配置文件：

1. **Docker Compose 文件**：`config-examples/docker-compose.prod.example.yml`
2. **环境变量文件**：`.env.production`
3. **Nginx 配置**：`config-examples/nginx/coarch-frontend.conf.example`

### 服务架构

```
用户请求 → Nginx（负载均衡）→ 后端容器群 → PostgreSQL 容器 + Redis 容器
                    ↓
               前端静态文件
```

### 自定义配置

编辑生成的 `docker-compose.prod.yml`：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://coarch:${DB_PASSWORD}@postgres:5432/coarch
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
```

### 启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

### 数据持久化

- 数据库数据：存储在 Docker 卷中
- 上传文件：挂载到主机目录
- 日志文件：输出到标准输出，可由 Docker 日志驱动收集

## 混合部署

数据库使用 Docker 容器，应用作为系统服务运行。

### 部署步骤

```bash
# 1. 运行部署脚本
sudo ./scripts/deploy.sh --mode=hybrid --env=production --domain=coarch.example.com

# 2. 或交互式运行
sudo ./scripts/deploy.sh
```

### 系统架构

```
用户请求 → Nginx（系统服务）→ 后端（systemd 服务）
                    ↓
             PostgreSQL 容器 + Redis 容器
```

### 自动配置流程

部署脚本会自动完成以下步骤：

1. **安装系统依赖**：Node.js、npm、Nginx、PM2
2. **配置数据库容器**：创建 Docker Compose 文件，启动 PostgreSQL 和 Redis
3. **构建后端服务**：安装依赖、构建代码、创建 systemd 服务
4. **构建前端服务**：安装依赖、构建、部署到 Nginx 目录
5. **配置 Nginx**：设置反向代理、SSL、缓存策略
6. **配置防火墙**：开放必要端口
7. **执行数据库迁移**：创建表结构，加载种子数据
8. **验证部署**：检查服务状态，测试 API 连接

### 服务管理

#### 后端服务管理

```bash
# 查看服务状态
systemctl status coarch-backend

# 启动服务
systemctl start coarch-backend

# 停止服务
systemctl stop coarch-backend

# 重启服务
systemctl restart coarch-backend

# 查看日志
journalctl -u coarch-backend -f
```

#### 数据库容器管理

```bash
# 进入数据库部署目录
cd database-deploy

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f postgres

# 停止数据库
docker-compose down

# 启动数据库
docker-compose up -d
```

#### Nginx 管理

```bash
# 测试配置
nginx -t

# 重新加载配置
systemctl reload nginx

# 重启服务
systemctl restart nginx

# 查看日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 生产环境优化

#### 1. SSL 证书配置

```bash
# 使用 Let's Encrypt 获取证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d coarch.example.com

# 自动续期证书
sudo certbot renew --dry-run
```

#### 2. 系统资源限制

编辑 `/etc/systemd/system/coarch-backend.service`：

```ini
[Service]
...
# 资源限制
MemoryMax=2G
CPUQuota=100%
LimitNOFILE=65536
LimitNPROC=4096
```

#### 3. 日志轮转

创建 `/etc/logrotate.d/coarch`：

```bash
/var/log/coarch/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload coarch-backend > /dev/null 2>&1 || true
    endscript
}
```

## 纯系统部署

所有服务都直接安装到操作系统。

### 部署步骤

```bash
# 运行部署脚本
sudo ./scripts/deploy.sh --mode=system --env=production --domain=coarch.example.com
```

### 安装的服务

1. **PostgreSQL**：系统服务 `postgresql`
2. **Redis**：系统服务 `redis-server`
3. **Node.js 后端**：systemd 服务 `coarch-backend`
4. **Nginx**：系统服务 `nginx`
5. **可选服务**：`coarch-worker`（后台任务）

### 手动安装步骤（参考）

```bash
# 1. 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. 创建数据库和用户
sudo -u postgres psql -c "CREATE DATABASE coarch;"
sudo -u postgres psql -c "CREATE USER coarch WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE coarch TO coarch;"

# 3. 安装 Redis
sudo apt install redis-server

# 4. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# 5. 安装 Nginx
sudo apt install nginx

# 6. 构建和部署应用
# （部署脚本会自动完成此步骤）
```

### 配置文件位置

- **后端服务**：`/etc/systemd/system/coarch-backend.service`
- **Nginx 配置**：`/etc/nginx/sites-available/coarch`
- **环境变量**：`/etc/default/coarch-backend`
- **数据库配置**：`/etc/postgresql/15/main/postgresql.conf`
- **Redis 配置**：`/etc/redis/redis.conf`

## 生产环境配置

### 安全配置

#### 1. 防火墙配置

```bash
# Ubuntu 使用 ufw
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# CentOS/RHEL 使用 firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 2. 非特权用户运行

```bash
# 创建专用用户
sudo useradd -r -s /bin/false coarch

# 设置目录权限
sudo chown -R coarch:coarch /var/www/coarch
sudo chown -R coarch:coarch /opt/coarch
```

#### 3. 文件权限

```bash
# 配置文件权限
sudo chmod 600 /etc/default/coarch-backend
sudo chmod 644 /etc/systemd/system/coarch-backend.service

# 上传目录权限
sudo mkdir -p /var/www/coarch/uploads
sudo chown -R www-data:www-data /var/www/coarch/uploads
sudo chmod 755 /var/www/coarch/uploads
```

### 性能优化

#### 1. 数据库优化

编辑 `/etc/postgresql/15/main/postgresql.conf`：

```ini
# 内存配置
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 64MB

# 查询优化
random_page_cost = 1.1
effective_cache_size = 2GB

# 连接池
max_connections = 100
```

#### 2. Redis 优化

编辑 `/etc/redis/redis.conf`：

```ini
# 内存限制
maxmemory 512mb
maxmemory-policy allkeys-lru

# 持久化
save 900 1
save 300 10
save 60 10000
```

#### 3. Nginx 优化

编辑 `/etc/nginx/nginx.conf`：

```nginx
# 工作进程
worker_processes auto;
worker_rlimit_nofile 65535;

# 连接配置
events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

# HTTP 配置
http {
    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=coarch_cache:10m inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    
    # 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
}
```

#### 4. Node.js 优化

环境变量配置：

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=2048"

# 集群模式（多核CPU）
export NODE_CLUSTER_SOCKET_ID=0
export NODE_ENV=production
```

### 监控和日志

#### 1. 系统监控

```bash
# 安装监控工具
sudo apt install htop nmon sysstat

# 查看系统资源
htop
nmon
```

#### 2. 应用监控

使用 PM2 监控 Node.js 应用：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用监控
pm2 start ecosystem.config.js
pm2 monit

# 查看日志
pm2 logs coarch-backend

# 设置开机自启
pm2 startup
pm2 save
```

#### 3. 日志收集

配置日志轮转和集中收集：

```bash
# 配置 systemd 日志
sudo journalctl -u coarch-backend -f

# 配置 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 配置应用日志
sudo mkdir -p /var/log/coarch
sudo chown coarch:coarch /var/log/coarch
```

## 备份与恢复

### 1. 数据库备份

```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/coarch_$DATE.sql"

# 创建备份
PGPASSWORD="$DB_PASSWORD" pg_dump -U coarch -h localhost -d coarch > "$BACKUP_FILE"

# 压缩备份
gzip "$BACKUP_FILE"

# 保留最近30天备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# 上传到云存储（可选）
# aws s3 cp "$BACKUP_FILE.gz" s3://your-bucket/backups/
```

### 2. 文件备份

```bash
#!/bin/bash
# backup-files.sh
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uploads_$DATE.tar.gz"

# 备份上传文件
tar -czf "$BACKUP_FILE" /var/www/coarch/uploads

# 备份配置文件
tar -czf "$BACKUP_DIR/configs_$DATE.tar.gz" \
  /etc/nginx/sites-available/coarch \
  /etc/systemd/system/coarch-backend.service \
  /etc/default/coarch-backend
```

### 3. 恢复数据库

```bash
#!/bin/bash
# restore-db.sh
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <备份文件>"
    exit 1
fi

# 停止应用服务
systemctl stop coarch-backend

# 恢复数据库
zcat "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql -U coarch -h localhost -d coarch

# 启动应用服务
systemctl start coarch-backend
```

## 故障排除

### 常见问题

#### 1. 服务启动失败

```bash
# 查看服务状态
systemctl status coarch-backend

# 查看详细日志
journalctl -xe -u coarch-backend

# 检查端口占用
sudo netstat -tlnp | grep :3000
```

#### 2. 数据库连接失败

```bash
# 检查数据库服务
systemctl status postgresql

# 测试数据库连接
PGPASSWORD="$DB_PASSWORD" psql -U coarch -h localhost -d coarch -c "SELECT 1"

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 3. Nginx 配置错误

```bash
# 测试 Nginx 配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log

# 检查 SSL 证书
openssl s_client -connect coarch.example.com:443 -servername coarch.example.com
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h

# 查看进程内存
ps aux --sort=-%mem | head -20

# 清理缓存
sync && echo 3 > /proc/sys/vm/drop_caches
```

### 性能诊断

#### 1. 慢查询分析

```sql
-- 启用慢查询日志
ALTER SYSTEM SET log_min_duration_statement = '1000';
SELECT pg_reload_conf();

-- 查看慢查询
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

#### 2. 连接池问题

```sql
-- 查看当前连接
SELECT count(*) FROM pg_stat_activity;

-- 查看空闲连接
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY duration DESC;
```

#### 3. 磁盘 I/O 瓶颈

```bash
# 查看磁盘使用
df -h

# 查看 I/O 统计
iostat -x 1

# 查看最活跃的文件
sudo lsof +D /var/lib/postgresql | head -20
```

### 应急恢复

#### 1. 服务降级

```bash
# 切换到维护模式
echo "系统维护中，请稍后访问..." > /var/www/coarch/maintenance.html
sudo systemctl stop coarch-backend

# 恢复服务
rm /var/www/coarch/maintenance.html
sudo systemctl start coarch-backend
```

#### 2. 快速重启

```bash
# 一键重启所有服务
sudo systemctl restart nginx postgresql redis-server coarch-backend

# 验证服务状态
sudo systemctl is-active nginx postgresql redis-server coarch-backend
```

#### 3. 回滚部署

```bash
# 恢复到上一个版本
cd /opt/coarch
git checkout v1.0.0

# 重新构建和部署
npm run build
sudo systemctl restart coarch-backend
```

## 升级指南

### 1. 小版本升级

```bash
# 备份当前版本
cd /opt/coarch
git stash
git pull origin main

# 更新依赖
npm install

# 运行数据库迁移
npx prisma migrate deploy

# 重启服务
sudo systemctl restart coarch-backend
```

### 2. 大版本升级

```bash
# 1. 备份数据和配置
./scripts/backup-all.sh

# 2. 创建新服务器
# （在新服务器上部署新版本）

# 3. 迁移数据
./scripts/migrate-data.sh old-server new-server

# 4. 切换 DNS
# （将域名指向新服务器）

# 5. 验证新版本
./scripts/health-check.sh

# 6. 退役旧服务器
```

## 附录

### 部署脚本参数

```bash
# 主部署脚本
./scripts/deploy.sh [选项]

# 选项：
#   --mode=MODE          部署模式: docker, hybrid, system
#   --env=ENV            环境: development, production
#   --domain=DOMAIN      域名 (用于生产环境)
#   --backend-port=PORT  后端端口 (默认: 3000)
#   --db-port=PORT       数据库端口 (默认: 5432)
#   --redis-port=PORT    Redis端口 (默认: 6379)
#   --help               显示帮助信息
```

### 环境变量参考

```bash
# 后端环境变量
export DATABASE_URL="postgresql://coarch:password@localhost:5432/coarch"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-jwt-secret-key"
export JWT_EXPIRES_IN="7d"
export API_PORT=3000
export NODE_ENV=production

# 前端环境变量
export VITE_API_URL="https://coarch.example.com/api"
export VITE_APP_ENV="production"
```

### 联系支持

- **GitHub Issues**：https://github.com/C-Nekopedia/CoArch/issues
- **文档更新**：查看项目 README
- **社区讨论**：GitHub Discussions

---

*最后更新：2026-04-01*