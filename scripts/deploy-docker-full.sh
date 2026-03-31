#!/bin/bash

# CoArch 全容器化部署脚本
# 使用 Docker Compose 部署所有服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 默认值
DEFAULT_ENV="development"
DEFAULT_DOMAIN="localhost"
DEFAULT_BACKEND_PORT="3000"
DEFAULT_FRONTEND_PORT="5173"

# 显示使用说明
show_usage() {
    echo "CoArch 全容器化部署脚本"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --env=ENV            环境: development, production (默认: $DEFAULT_ENV)"
    echo "  --domain=DOMAIN      域名 (用于生产环境配置, 默认: $DEFAULT_DOMAIN)"
    echo "  --backend-port=PORT  后端端口 (默认: $DEFAULT_BACKEND_PORT)"
    echo "  --frontend-port=PORT 前端端口 (默认: $DEFAULT_FRONTEND_PORT)"
    echo "  --help               显示此帮助信息"
    echo ""
}

# 解析命令行参数
parse_args() {
    ENV="$DEFAULT_ENV"
    DOMAIN="$DEFAULT_DOMAIN"
    BACKEND_PORT="$DEFAULT_BACKEND_PORT"
    FRONTEND_PORT="$DEFAULT_FRONTEND_PORT"

    for arg in "$@"; do
        case $arg in
            --env=*)
                ENV="${arg#*=}"
                ;;
            --domain=*)
                DOMAIN="${arg#*=}"
                ;;
            --backend-port=*)
                BACKEND_PORT="${arg#*=}"
                ;;
            --frontend-port=*)
                FRONTEND_PORT="${arg#*=}"
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                echo "错误: 未知参数 '$arg'"
                show_usage
                exit 1
                ;;
        esac
    done

    # 验证参数
    if ! [[ "$ENV" =~ ^(development|production)$ ]]; then
        echo "错误: 无效的环境 '$ENV'，必须是 development 或 production"
        exit 1
    fi

    if ! [[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || [[ "$BACKEND_PORT" -lt 1 ]] || [[ "$BACKEND_PORT" -gt 65535 ]]; then
        echo "错误: 无效的后端端口 '$BACKEND_PORT'"
        exit 1
    fi

    if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || [[ "$FRONTEND_PORT" -lt 1 ]] || [[ "$FRONTEND_PORT" -gt 65535 ]]; then
        echo "错误: 无效的前端端口 '$FRONTEND_PORT'"
        exit 1
    fi
}

# 检查Docker环境
check_docker_environment() {
    print_step "检查Docker环境"

    if ! command_exists docker; then
        print_error "Docker 未安装"
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose 未安装"
        exit 1
    fi

    # 检查Docker服务状态
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 服务未运行"
        exit 1
    fi

    DOCKER_VERSION=$(docker --version | awk '{print $3}')
    DOCKER_COMPOSE_VERSION=$(docker-compose --version | awk '{print $3 $4 $5}')

    print_success "Docker: $DOCKER_VERSION"
    print_success "Docker Compose: $DOCKER_COMPOSE_VERSION"
}

# 准备Docker Compose配置
prepare_docker_compose() {
    print_step "准备Docker Compose配置"

    # 创建部署目录
    DEPLOY_DIR="docker-deploy"
    mkdir -p "$DEPLOY_DIR"

    # 生成Docker Compose文件
    DOCKER_COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"

    print_info "生成Docker Compose配置: $DOCKER_COMPOSE_FILE"

    cat > "$DOCKER_COMPOSE_FILE" << EOF
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    container_name: coarch-postgres-\${ENV}
    environment:
      POSTGRES_DB: coarch
      POSTGRES_USER: coarch
      POSTGRES_PASSWORD: \${DB_PASSWORD:-password}
    ports:
      - "\${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data_\${ENV}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U coarch"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - coarch-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: coarch-redis-\${ENV}
    ports:
      - "\${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data_\${ENV}:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - coarch-network

  # 后端服务
  backend:
    build:
      context: ../packages/backend
      dockerfile: Dockerfile
      args:
        NODE_ENV: \${ENV}
    container_name: coarch-backend-\${ENV}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: \${ENV}
      DATABASE_URL: \${DATABASE_URL}
      REDIS_URL: \${REDIS_URL}
      JWT_SECRET: \${JWT_SECRET}
      JWT_EXPIRES_IN: \${JWT_EXPIRES_IN}
      API_PORT: \${BACKEND_PORT}
    ports:
      - "\${BACKEND_PORT}:3000"
    volumes:
      - uploads_volume_\${ENV}:/app/uploads
      - ./logs/backend:/app/logs
    restart: unless-stopped
    networks:
      - coarch-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 前端服务
  frontend:
    build:
      context: ../packages/frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: \${VITE_API_URL}
        VITE_APP_ENV: \${ENV}
    container_name: coarch-frontend-\${ENV}
    depends_on:
      - backend
    environment:
      VITE_API_URL: \${VITE_API_URL}
    ports:
      - "\${FRONTEND_PORT}:80"
    restart: unless-stopped
    networks:
      - coarch-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Nginx反向代理 (仅生产环境)
  nginx:
    image: nginx:alpine
    container_name: coarch-nginx-\${ENV}
    depends_on:
      - backend
      - frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites:/etc/nginx/sites-enabled
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    restart: unless-stopped
    networks:
      - coarch-network
    profiles:
      - production

networks:
  coarch-network:
    driver: bridge
    name: coarch-network-\${ENV}

volumes:
  postgres_data_\${ENV}:
    name: coarch-postgres-data-\${ENV}
  redis_data_\${ENV}:
    name: coarch-redis-data-\${ENV}
  uploads_volume_\${ENV}:
    name: coarch-uploads-\${ENV}
EOF

    print_success "Docker Compose配置生成完成"

    # 生成环境文件
    ENV_FILE="$DEPLOY_DIR/.env"
    print_info "生成环境文件: $ENV_FILE"

    cat > "$ENV_FILE" << EOF
# CoArch 全容器化部署环境变量
ENV=$ENV
DOMAIN=$DOMAIN

# 数据库配置
DB_PASSWORD=$(generate_password 16)
DB_PORT=5432
DATABASE_URL=postgresql://coarch:\${DB_PASSWORD}@postgres:5432/coarch?schema=public

# Redis配置
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# 后端配置
BACKEND_PORT=$BACKEND_PORT
JWT_SECRET=$(generate_password 32)
JWT_EXPIRES_IN=7d

# 前端配置
FRONTEND_PORT=$FRONTEND_PORT
VITE_API_URL=http://localhost:\${BACKEND_PORT}/api

# 生产环境特定配置
$(if [[ "$ENV" == "production" ]]; then
echo "# 生产环境配置"
echo "VITE_API_URL=https://\${DOMAIN}/api"
echo "NGINX_HOST=\${DOMAIN}"
echo "SSL_EMAIL=admin@\${DOMAIN}"
fi)
EOF

    print_success "环境文件生成完成"
    print_info "数据库密码: 已生成随机密码"
    print_info "JWT密钥: 已生成随机密钥"

    # 生成Nginx配置（生产环境）
    if [[ "$ENV" == "production" ]]; then
        prepare_nginx_config
    fi
}

# 准备Nginx配置（生产环境）
prepare_nginx_config() {
    print_info "准备Nginx配置"

    NGINX_DIR="$DEPLOY_DIR/nginx"
    mkdir -p "$NGINX_DIR/sites"
    mkdir -p "$NGINX_DIR/ssl"

    # 生成Nginx主配置
    cat > "$NGINX_DIR/nginx.conf" << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    include /etc/nginx/sites-enabled/*;
}
EOF

    # 生成站点配置
    SITE_CONFIG="$NGINX_DIR/sites/coarch.conf"

    cat > "$SITE_CONFIG" << EOF
# CoArch 生产环境配置
server {
    listen 80;
    server_name $DOMAIN;

    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL证书路径（需要手动放置证书）
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端静态文件
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 缓存静态资源
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://frontend:80;
        }
    }

    # API代理
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # API超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 文件上传大小限制
        client_max_body_size 100M;
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    print_success "Nginx配置生成完成"
    print_warning "注意: 需要手动放置SSL证书到 $NGINX_DIR/ssl/"
    print_warning "      证书文件: cert.pem 和 key.pem"
}

# 构建Docker镜像
build_docker_images() {
    print_step "构建Docker镜像"

    # 检查Dockerfile是否存在
    if [[ ! -f "../packages/backend/Dockerfile" ]]; then
        print_info "创建后端Dockerfile"
        create_backend_dockerfile
    fi

    if [[ ! -f "../packages/frontend/Dockerfile" ]]; then
        print_info "创建前端Dockerfile"
        create_frontend_dockerfile
    fi

    print_info "开始构建Docker镜像..."

    # 进入部署目录
    cd "$DEPLOY_DIR"

    # 构建镜像
    if docker-compose build; then
        print_success "Docker镜像构建完成"
    else
        print_error "Docker镜像构建失败"
        exit 1
    fi

    cd - > /dev/null
}

# 创建后端Dockerfile
create_backend_dockerfile() {
    cat > "../packages/backend/Dockerfile" << EOF
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制包管理文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache curl

# 复制构建产物和依赖
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 创建上传目录
RUN mkdir -p uploads

# 设置非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/main.js"]
EOF

    print_success "后端Dockerfile创建完成"
}

# 创建前端Dockerfile
create_frontend_dockerfile() {
    cat > "../packages/frontend/Dockerfile" << EOF
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制包管理文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
ARG VITE_API_URL
ARG VITE_APP_ENV=production
ENV VITE_API_URL=\${VITE_API_URL}
ENV VITE_APP_ENV=\${VITE_APP_ENV}

RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost || exit 1
EOF

    # 创建Nginx配置文件
    cat > "../packages/frontend/nginx.conf" << EOF
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # 缓存静态资源
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理（开发环境）
    location /api/ {
        proxy_pass \$VITE_API_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    print_success "前端Dockerfile创建完成"
}

# 启动Docker服务
start_docker_services() {
    print_step "启动Docker服务"

    cd "$DEPLOY_DIR"

    print_info "启动服务..."
    if docker-compose up -d; then
        print_success "服务启动命令已发送"
    else
        print_error "服务启动失败"
        exit 1
    fi

    # 等待服务启动
    print_info "等待服务启动..."
    sleep 10

    # 检查服务状态
    check_services_status

    cd - > /dev/null
}

# 检查服务状态
check_services_status() {
    print_info "检查服务状态..."

    local services=("postgres" "redis" "backend" "frontend")
    if [[ "$ENV" == "production" ]]; then
        services+=("nginx")
    fi

    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            print_success "$service: 运行中"
        else
            print_error "$service: 未运行"
            # 显示日志
            print_info "查看 $service 日志:"
            docker-compose logs --tail=20 "$service"
        fi
    done
}

# 执行数据库迁移
run_database_migrations() {
    print_step "执行数据库迁移"

    print_info "等待数据库准备就绪..."
    sleep 10

    print_info "执行Prisma迁移..."
    if docker-compose exec backend npx prisma migrate deploy; then
        print_success "数据库迁移完成"
    else
        print_error "数据库迁移失败"
        exit 1
    fi

    # 可选：运行种子数据（仅开发环境）
    if [[ "$ENV" == "development" ]]; then
        print_info "运行种子数据..."
        if docker-compose exec backend npx prisma db seed; then
            print_success "种子数据已加载"
        else
            print_warning "种子数据加载失败（可能未配置）"
        fi
    fi
}

# 显示部署信息
show_deployment_info() {
    print_step "部署完成"

    echo ""
    print_color "$GREEN" "🎉 CoArch 全容器化部署完成！"
    echo ""
    echo "部署信息:"
    echo "  环境: $ENV"
    echo "  域名: $DOMAIN"
    echo ""
    echo "服务访问:"

    if [[ "$ENV" == "production" ]]; then
        echo "  前端: https://$DOMAIN"
        echo "  API: https://$DOMAIN/api"
        echo "  健康检查: https://$DOMAIN/health"
    else
        echo "  前端: http://localhost:$FRONTEND_PORT"
        echo "  API: http://localhost:$BACKEND_PORT/api"
        echo "  健康检查: http://localhost:$BACKEND_PORT/api/health"
    fi

    echo ""
    echo "管理命令:"
    echo "  查看日志: cd $DEPLOY_DIR && docker-compose logs -f"
    echo "  停止服务: cd $DEPLOY_DIR && docker-compose down"
    echo "  重启服务: cd $DEPLOY_DIR && docker-compose restart"
    echo "  查看状态: cd $DEPLOY_DIR && docker-compose ps"
    echo ""
    echo "环境文件: $DEPLOY_DIR/.env"
    echo "请妥善保管环境文件中的敏感信息！"
    echo ""
}

# 主函数
main() {
    print_header "CoArch 全容器化部署"

    # 解析参数
    parse_args "$@"

    # 显示部署配置
    echo ""
    echo "部署配置:"
    echo "  环境: $ENV"
    echo "  域名: $DOMAIN"
    echo "  后端端口: $BACKEND_PORT"
    echo "  前端端口: $FRONTEND_PORT"
    echo ""

    if ! confirm_action "确认部署配置？"; then
        print_info "部署已取消"
        exit 0
    fi

    # 检查环境
    check_docker_environment

    # 准备配置
    prepare_docker_compose

    # 构建镜像
    build_docker_images

    # 启动服务
    start_docker_services

    # 数据库迁移
    run_database_migrations

    # 显示部署信息
    show_deployment_info

    print_success "部署流程完成"
}

# 运行主函数
main "$@"