#!/bin/bash

# CoArch 纯系统部署脚本
# 所有服务都安装到系统

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 默认值
DEFAULT_ENV="development"
DEFAULT_DOMAIN="localhost"
DEFAULT_BACKEND_PORT="3001"
DEFAULT_DB_PORT="5432"
DEFAULT_REDIS_PORT="6379"

# 显示使用说明
show_usage() {
    echo "CoArch 纯系统部署脚本"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --env=ENV            环境: development, production (默认: $DEFAULT_ENV)"
    echo "  --domain=DOMAIN      域名 (用于生产环境配置, 默认: $DEFAULT_DOMAIN)"
    echo "  --backend-port=PORT  后端端口 (默认: $DEFAULT_BACKEND_PORT)"
    echo "  --db-port=PORT       数据库端口 (默认: $DEFAULT_DB_PORT)"
    echo "  --redis-port=PORT    Redis端口 (默认: $DEFAULT_REDIS_PORT)"
    echo "  --help               显示此帮助信息"
    echo ""
}

# 解析命令行参数
parse_args() {
    ENV="$DEFAULT_ENV"
    DOMAIN="$DEFAULT_DOMAIN"
    BACKEND_PORT="$DEFAULT_BACKEND_PORT"
    DB_PORT="$DEFAULT_DB_PORT"
    REDIS_PORT="$DEFAULT_REDIS_PORT"

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
            --db-port=*)
                DB_PORT="${arg#*=}"
                ;;
            --redis-port=*)
                REDIS_PORT="${arg#*=}"
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

    if ! validate_port "$BACKEND_PORT"; then
        echo "错误: 无效的后端端口 '$BACKEND_PORT'"
        exit 1
    fi

    if ! validate_port "$DB_PORT"; then
        echo "错误: 无效的数据库端口 '$DB_PORT'"
        exit 1
    fi

    if ! validate_port "$REDIS_PORT"; then
        echo "错误: 无效的Redis端口 '$REDIS_PORT'"
        exit 1
    fi
}

# 检查环境
check_environment() {
    print_step "检查环境"

    # 检查操作系统（必须是Linux）
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "系统部署仅支持Linux系统"
        exit 1
    fi

    # 检查root权限
    if [[ $EUID -ne 0 ]]; then
        print_error "系统部署需要root权限，请使用sudo运行"
        exit 1
    fi

    # 检查systemd
    if ! command_exists systemctl; then
        print_error "systemd 未安装，系统部署需要systemd"
        exit 1
    fi

    # 显示系统信息
    get_system_info

    # 检查磁盘空间
    check_disk_space 10
}

# 安装系统依赖
install_system_dependencies() {
    print_step "安装系统依赖"

    # 检测包管理器
    if command_exists apt-get; then
        print_info "检测到APT包管理器 (Debian/Ubuntu)"
        apt-get update
        apt-get install -y curl wget git build-essential

        # 安装数据库
        if ! command_exists psql; then
            print_info "安装PostgreSQL"
            apt-get install -y postgresql postgresql-contrib
        fi

        if ! command_exists redis-server; then
            print_info "安装Redis"
            apt-get install -y redis-server
        fi

        # 安装Nginx
        if ! command_exists nginx; then
            print_info "安装Nginx"
            apt-get install -y nginx
        fi

        # 安装Node.js（如果未安装）
        if ! command_exists node; then
            print_info "安装Node.js"
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        fi

    elif command_exists yum; then
        print_info "检测到YUM包管理器 (RHEL/CentOS)"
        yum install -y curl wget git gcc-c++ make

        # 安装数据库
        if ! command_exists psql; then
            print_info "安装PostgreSQL"
            yum install -y postgresql-server postgresql-contrib
        fi

        if ! command_exists redis-server; then
            print_info "安装Redis"
            yum install -y redis
        fi

        # 安装Nginx
        if ! command_exists nginx; then
            print_info "安装Nginx"
            yum install -y nginx
        fi

        # 安装Node.js
        if ! command_exists node; then
            print_info "安装Node.js"
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        fi

    elif command_exists dnf; then
        print_info "检测到DNF包管理器 (Fedora)"
        dnf install -y curl wget git gcc-c++ make

        # 安装数据库
        if ! command_exists psql; then
            print_info "安装PostgreSQL"
            dnf install -y postgresql-server postgresql-contrib
        fi

        if ! command_exists redis-server; then
            print_info "安装Redis"
            dnf install -y redis
        fi

        # 安装Nginx
        if ! command_exists nginx; then
            print_info "安装Nginx"
            dnf install -y nginx
        fi

        # 安装Node.js
        if ! command_exists node; then
            print_info "安装Node.js"
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            dnf install -y nodejs
        fi

    else
        print_error "未知的包管理器，请手动安装依赖"
        exit 1
    fi

    # 验证安装
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js 安装失败"
        exit 1
    fi

    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm 安装失败"
        exit 1
    fi

    if command_exists psql; then
        POSTGRES_VERSION=$(psql --version | awk '{print $3}')
        print_success "PostgreSQL: $POSTGRES_VERSION"
    else
        print_error "PostgreSQL 安装失败"
        exit 1
    fi

    if command_exists redis-server; then
        REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
        print_success "Redis: $REDIS_VERSION"
    else
        print_error "Redis 安装失败"
        exit 1
    fi

    if command_exists nginx; then
        NGINX_VERSION=$(nginx -v 2>&1 | awk '{print $3}' | cut -d'/' -f2)
        print_success "Nginx: $NGINX_VERSION"
    else
        print_error "Nginx 安装失败"
        exit 1
    fi
}

# 配置数据库
setup_database() {
    print_step "配置PostgreSQL数据库"

    # 初始化数据库（如果未初始化）
    if [[ ! -d "/var/lib/pgsql/data" ]] && [[ ! -d "/var/lib/postgresql" ]]; then
        print_info "初始化PostgreSQL数据库..."

        if command_exists postgresql-setup; then
            postgresql-setup --initdb
        elif command_exists pg_createcluster; then
            pg_createcluster 15 main --start
        fi
    fi

    # 启动数据库服务
    print_info "启动PostgreSQL服务..."
    systemctl enable postgresql
    systemctl start postgresql

    wait_for_service "postgresql"

    # 创建数据库和用户
    print_info "创建CoArch数据库和用户..."

    # 生成数据库密码
    DB_PASSWORD=$(generate_password 16)

    # 使用postgres用户执行SQL
    sudo -u postgres psql <<EOF
CREATE USER coarch WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE coarch OWNER coarch;
GRANT ALL PRIVILEGES ON DATABASE coarch TO coarch;
\c coarch;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

    if [[ $? -eq 0 ]]; then
        print_success "数据库配置完成"
        print_info "数据库用户: coarch"
        print_info "数据库密码: $DB_PASSWORD"
        print_info "数据库名称: coarch"
        print_info "数据库端口: $DB_PORT"
    else
        print_error "数据库配置失败"
        exit 1
    fi

    # 配置PostgreSQL监听地址
    print_info "配置PostgreSQL监听地址..."

    # 找到pg_hba.conf和postgresql.conf
    PG_HBA_CONF=$(find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)
    PG_CONF=$(find /etc/postgresql -name "postgresql.conf" 2>/dev/null | head -1)

    if [[ -z "$PG_HBA_CONF" ]]; then
        PG_HBA_CONF=$(find /var/lib/pgsql -name "pg_hba.conf" 2>/dev/null | head -1)
        PG_CONF=$(find /var/lib/pgsql -name "postgresql.conf" 2>/dev/null | head -1)
    fi

    if [[ -n "$PG_CONF" ]]; then
        # 允许所有IP连接（仅开发环境，生产环境应该限制）
        if [[ "$ENV" == "development" ]]; then
            sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
            sed -i "s/port = 5432/port = $DB_PORT/" "$PG_CONF"
        fi

        # 重启PostgreSQL
        systemctl restart postgresql
        print_success "PostgreSQL配置更新完成"
    else
        print_warning "未找到PostgreSQL配置文件，可能需要手动配置"
    fi
}

# 配置Redis
setup_redis() {
    print_step "配置Redis"

    # 启动Redis服务
    print_info "启动Redis服务..."
    systemctl enable redis
    systemctl start redis

    wait_for_service "redis"

    # 配置Redis监听地址
    print_info "配置Redis..."

    REDIS_CONF=$(find /etc -name "redis.conf" 2>/dev/null | head -1)

    if [[ -n "$REDIS_CONF" ]]; then
        # 备份配置文件
        backup_file "$REDIS_CONF"

        # 允许远程连接（仅开发环境）
        if [[ "$ENV" == "development" ]]; then
            sed -i "s/bind 127.0.0.1/bind 0.0.0.0/" "$REDIS_CONF"
            sed -i "s/port 6379/port $REDIS_PORT/" "$REDIS_CONF"
            sed -i "s/protected-mode yes/protected-mode no/" "$REDIS_CONF"
        fi

        # 重启Redis
        systemctl restart redis
        print_success "Redis配置更新完成"
    else
        print_warning "未找到Redis配置文件，使用默认配置"
    fi

    # 测试Redis连接
    if redis-cli ping | grep -q "PONG"; then
        print_success "Redis连接测试通过"
    else
        print_error "Redis连接测试失败"
        exit 1
    fi
}

# 配置后端服务
setup_backend_service() {
    print_step "配置后端服务"

    # 进入后端目录
    BACKEND_DIR="packages/backend"

    if [[ ! -d "$BACKEND_DIR" ]]; then
        print_error "后端目录不存在: $BACKEND_DIR"
        exit 1
    fi

    cd "$BACKEND_DIR"

    # 安装依赖
    print_info "安装后端依赖..."
    if npm ci --only=production; then
        print_success "后端依赖安装完成"
    else
        print_error "后端依赖安装失败"
        exit 1
    fi

    # 生成Prisma客户端
    print_info "生成Prisma客户端..."
    if npx prisma generate; then
        print_success "Prisma客户端生成完成"
    else
        print_error "Prisma客户端生成失败"
        exit 1
    fi

    # 构建后端
    print_info "构建后端..."
    if npm run build; then
        print_success "后端构建完成"
    else
        print_error "后端构建失败"
        exit 1
    fi

    # 创建上传目录
    print_info "创建上传目录..."
    mkdir -p uploads
    chmod 755 uploads

    # 创建日志目录
    mkdir -p logs
    chmod 755 logs

    cd - > /dev/null
}

# 创建后端systemd服务
create_backend_systemd_service() {
    print_step "创建后端systemd服务"

    # 创建服务文件
    SERVICE_FILE="/etc/systemd/system/coarch-backend.service"

    # 备份现有服务文件
    if [[ -f "$SERVICE_FILE" ]]; then
        backup_file "$SERVICE_FILE"
    fi

    # 获取Node.js路径
    NODE_PATH=$(which node)

    # 创建服务文件
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=CoArch Backend Service
After=network.target postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=simple
User=coarch
Group=coarch
WorkingDirectory=$(pwd)/packages/backend
Environment=NODE_ENV=$ENV
Environment=DATABASE_URL=postgresql://coarch:${DB_PASSWORD}@localhost:$DB_PORT/coarch?schema=public
Environment=REDIS_URL=redis://localhost:$REDIS_PORT
Environment=JWT_SECRET=$(generate_password 32)
Environment=JWT_EXPIRES_IN=7d
Environment=API_PORT=$BACKEND_PORT
ExecStart=$NODE_PATH dist/main.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=coarch-backend

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

    # 创建系统用户
    if ! id "coarch" &>/dev/null; then
        useradd -r -s /bin/false coarch
        print_success "创建系统用户: coarch"
    fi

    # 设置目录权限
    chown -R coarch:coarch packages/backend
    chmod 755 packages/backend

    # 设置服务文件权限
    chmod 644 "$SERVICE_FILE"

    print_success "后端systemd服务文件创建完成: $SERVICE_FILE"

    # 重新加载systemd
    print_info "重新加载systemd配置..."
    systemctl daemon-reload

    # 启用并启动服务
    enable_and_start_service "coarch-backend"
}

# 配置前端服务
setup_frontend_service() {
    print_step "配置前端服务"

    # 进入前端目录
    FRONTEND_DIR="packages/frontend"

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_error "前端目录不存在: $FRONTEND_DIR"
        exit 1
    fi

    cd "$FRONTEND_DIR"

    # 安装依赖
    print_info "安装前端依赖..."
    if npm ci; then
        print_success "前端依赖安装完成"
    else
        print_error "前端依赖安装失败"
        exit 1
    fi

    # 构建前端
    print_info "构建前端..."

    # 设置构建环境变量
    if [[ "$ENV" == "production" ]]; then
        export VITE_API_URL="https://$DOMAIN/api"
    else
        export VITE_API_URL="http://localhost:$BACKEND_PORT/api"
    fi

    export VITE_APP_ENV="$ENV"

    if npm run build; then
        print_success "前端构建完成"
    else
        print_error "前端构建失败"
        exit 1
    fi

    # 创建构建产物目录
    BUILD_DIR="/var/www/coarch"
    print_info "部署前端构建产物到: $BUILD_DIR"

    mkdir -p "$BUILD_DIR"
    cp -r dist/* "$BUILD_DIR/"
    chown -R www-data:www-data "$BUILD_DIR" 2>/dev/null || true
    chmod -R 755 "$BUILD_DIR"

    print_success "前端构建产物部署完成"

    cd - > /dev/null
}

# 配置Nginx
setup_nginx() {
    print_step "配置Nginx"

    # 创建Nginx配置目录
    NGINX_SITES_DIR="/etc/nginx/sites-available"
    NGINX_SITES_ENABLED_DIR="/etc/nginx/sites-enabled"
    mkdir -p "$NGINX_SITES_DIR" "$NGINX_SITES_ENABLED_DIR"

    # 创建SSL证书目录
    SSL_DIR="/etc/nginx/ssl"
    mkdir -p "$SSL_DIR"

    # 创建Nginx配置
    NGINX_CONFIG="$NGINX_SITES_DIR/coarch"

    cat > "$NGINX_CONFIG" << EOF
# CoArch 配置
server {
    listen 80;
    server_name $DOMAIN;

    # 重定向到HTTPS（生产环境）
    $(if [[ "$ENV" == "production" ]]; then
    echo "    # 重定向到HTTPS"
    echo "    return 301 https://\$server_name\$request_uri;"
    else
    echo "    # 开发环境直接服务"
    fi)

    $(if [[ "$ENV" == "development" ]]; then
    echo "    # 前端静态文件"
    echo "    location / {"
    echo "        root /var/www/coarch;"
    echo "        index index.html index.htm;"
    echo "        try_files \$uri \$uri/ /index.html;"
    echo ""
    echo "        # 缓存静态资源"
    echo "        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)\$ {"
    echo "            expires 1y;"
    echo "            add_header Cache-Control \"public, immutable\";"
    echo "        }"
    echo "    }"
    echo ""
    echo "    # API代理"
    echo "    location /api/ {"
    echo "        proxy_pass http://localhost:$BACKEND_PORT;"
    echo "        proxy_set_header Host \$host;"
    echo "        proxy_set_header X-Real-IP \$remote_addr;"
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
    echo ""
    echo "        # API超时设置"
    echo "        proxy_connect_timeout 60s;"
    echo "        proxy_send_timeout 60s;"
    echo "        proxy_read_timeout 60s;"
    echo "    }"
    fi)
}

$(if [[ "$ENV" == "production" ]]; then
echo "server {"
echo "    listen 443 ssl http2;"
echo "    server_name $DOMAIN;"
echo ""
echo "    # SSL证书路径（需要手动放置证书）"
echo "    ssl_certificate $SSL_DIR/cert.pem;"
echo "    ssl_certificate_key $SSL_DIR/key.pem;"
echo ""
echo "    # SSL优化"
echo "    ssl_protocols TLSv1.2 TLSv1.3;"
echo "    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;"
echo "    ssl_prefer_server_ciphers off;"
echo "    ssl_session_cache shared:SSL:10m;"
echo "    ssl_session_timeout 10m;"
echo ""
echo "    # 安全头部"
echo "    add_header X-Frame-Options DENY always;"
echo "    add_header X-Content-Type-Options nosniff always;"
echo "    add_header X-XSS-Protection \"1; mode=block\" always;"
echo ""
echo "    # 前端静态文件"
echo "    location / {"
echo "        root /var/www/coarch;"
echo "        index index.html index.htm;"
echo "        try_files \$uri \$uri/ /index.html;"
echo ""
echo "        # 缓存静态资源"
echo "        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)\$ {"
echo "            expires 1y;"
echo "            add_header Cache-Control \"public, immutable\";"
echo "        }"
echo "    }"
echo ""
echo "    # API代理"
echo "    location /api/ {"
echo "        proxy_pass http://localhost:$BACKEND_PORT;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo ""
echo "        # API超时设置"
echo "        proxy_connect_timeout 60s;"
echo "        proxy_send_timeout 60s;"
echo "        proxy_read_timeout 60s;"
echo "    }"
echo ""
echo "    # 上传文件"
echo "    location /uploads/ {"
echo "        proxy_pass http://localhost:$BACKEND_PORT;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo ""
echo "        # 文件上传大小限制"
echo "        client_max_body_size 100M;"
echo "    }"
echo ""
echo "    # 健康检查"
echo "    location /health {"
echo "        access_log off;"
echo "        return 200 \"healthy\\n\";"
echo "        add_header Content-Type text/plain;"
echo "    }"
echo "}"
fi)
EOF

    print_success "Nginx配置生成完成: $NGINX_CONFIG"

    # 启用站点
    ln -sf "$NGINX_CONFIG" "$NGINX_SITES_ENABLED_DIR/coarch"

    # 移除默认站点
    if [[ -f "$NGINX_SITES_ENABLED_DIR/default" ]]; then
        rm -f "$NGINX_SITES_ENABLED_DIR/default"
    fi

    # 测试Nginx配置
    print_info "测试Nginx配置..."
    if nginx -t; then
        print_success "Nginx配置测试通过"
    else
        print_error "Nginx配置测试失败"
        exit 1
    fi

    # 重启Nginx
    print_info "重启Nginx..."
    systemctl restart nginx

    print_success "Nginx配置完成"

    if [[ "$ENV" == "production" ]]; then
        print_warning "注意: 需要手动放置SSL证书到 $SSL_DIR/"
        print_warning "      证书文件: cert.pem 和 key.pem"
    fi
}

# 执行数据库迁移
run_database_migrations() {
    print_step "执行数据库迁移"

    # 等待数据库完全就绪
    print_info "等待数据库就绪..."
    sleep 15

    # 进入后端目录
    cd packages/backend

    # 设置环境变量
    export DATABASE_URL="postgresql://coarch:${DB_PASSWORD}@localhost:$DB_PORT/coarch?schema=public"

    print_info "执行Prisma迁移..."
    if npx prisma migrate deploy; then
        print_success "数据库迁移完成"
    else
        print_error "数据库迁移失败"
        exit 1
    fi

    # 可选：运行种子数据（仅开发环境）
    if [[ "$ENV" == "development" ]]; then
        print_info "运行种子数据..."
        if npx prisma db seed; then
            print_success "种子数据已加载"
        else
            print_warning "种子数据加载失败（可能未配置）"
        fi
    fi

    cd - > /dev/null
}

# 配置防火墙
setup_firewall() {
    print_step "配置防火墙"

    # 检查防火墙工具
    if command_exists ufw; then
        print_info "配置UFW防火墙"

        # 允许SSH
        ufw allow ssh

        # 允许HTTP/HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp

        # 允许后端端口（开发环境）
        if [[ "$ENV" == "development" ]]; then
            ufw allow "$BACKEND_PORT/tcp"
        fi

        # 允许数据库端口（仅本地访问）
        ufw allow from 127.0.0.1 to any port "$DB_PORT"
        ufw allow from 127.0.0.1 to any port "$REDIS_PORT"

        # 启用防火墙
        if ufw --force enable; then
            print_success "UFW防火墙已启用"
        fi

    elif command_exists firewall-cmd; then
        print_info "配置firewalld防火墙"

        # 允许HTTP/HTTPS
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https

        # 允许后端端口（开发环境）
        if [[ "$ENV" == "development" ]]; then
            firewall-cmd --permanent --add-port="$BACKEND_PORT/tcp"
        fi

        # 重新加载防火墙
        firewall-cmd --reload
        print_success "firewalld配置完成"

    else
        print_warning "未检测到支持的防火墙工具，请手动配置防火墙"
    fi
}

# 验证部署
verify_deployment() {
    print_step "验证部署"

    # 检查服务状态
    print_info "检查服务状态..."

    local services=("postgresql" "redis" "coarch-backend" "nginx")
    for service in "${services[@]}"; do
        check_service_status "$service"
    done

    # 测试API连接
    print_info "测试API连接..."
    sleep 5

    if curl -f "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
        print_success "API服务响应正常"
    else
        print_error "API服务无法访问"
        print_info "查看后端日志: journalctl -u coarch-backend -n 20"
    fi

    # 测试前端访问
    print_info "测试前端访问..."
    sleep 3

    if curl -f "http://localhost" > /dev/null 2>&1; then
        print_success "前端服务响应正常"
    else
        print_error "前端服务无法访问"
        print_info "查看Nginx日志: tail -f /var/log/nginx/error.log"
    fi

    # 测试数据库连接
    print_info "测试数据库连接..."
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$DB_PORT" -U coarch -d coarch -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "数据库连接正常"
    else
        print_error "数据库连接失败"
    fi
}

# 显示部署信息
show_deployment_info() {
    print_step "部署完成"

    echo ""
    print_color "$GREEN" "🎉 CoArch 纯系统部署完成！"
    echo ""
    echo "部署信息:"
    echo "  环境: $ENV"
    echo "  域名: $DOMAIN"
    echo "  后端端口: $BACKEND_PORT"
    echo "  数据库端口: $DB_PORT"
    echo "  Redis端口: $REDIS_PORT"
    echo ""
    echo "服务访问:"

    if [[ "$ENV" == "production" ]]; then
        echo "  前端: https://$DOMAIN"
        echo "  API: https://$DOMAIN/api"
        echo "  健康检查: https://$DOMAIN/health"
    else
        echo "  前端: http://localhost"
        echo "  API: http://localhost:$BACKEND_PORT/api"
        echo "  健康检查: http://localhost:$BACKEND_PORT/api/health"
    fi

    echo ""
    echo "管理命令:"
    echo "  后端服务: systemctl status coarch-backend"
    echo "  后端日志: journalctl -u coarch-backend -f"
    echo "  数据库: systemctl status postgresql"
    echo "  Redis: systemctl status redis"
    echo "  Nginx: systemctl status nginx"
    echo ""
    echo "重要信息:"
    echo "  数据库密码: $DB_PASSWORD"
    echo "  JWT密钥: 已生成随机密钥"
    echo "  请妥善保管以上敏感信息！"
    echo ""
    echo "配置文件位置:"
    echo "  后端服务: /etc/systemd/system/coarch-backend.service"
    echo "  PostgreSQL配置: /etc/postgresql/ 或 /var/lib/pgsql/"
    echo "  Redis配置: /etc/redis/redis.conf"
    echo "  Nginx配置: /etc/nginx/sites-available/coarch"
    echo ""

    if [[ "$ENV" == "production" ]]; then
        print_warning "重要提醒:"
        echo "  1. 需要手动放置SSL证书到 /etc/nginx/ssl/"
        echo "  2. 建议设置定期备份数据库"
        echo "  3. 监控系统资源使用情况"
        echo "  4. 定期更新系统和软件包"
        echo ""
    fi
}

# 主函数
main() {
    print_header "CoArch 纯系统部署"

    # 解析参数
    parse_args "$@"

    # 显示部署配置
    echo ""
    echo "部署配置:"
    echo "  环境: $ENV"
    echo "  域名: $DOMAIN"
    echo "  后端端口: $BACKEND_PORT"
    echo "  数据库端口: $DB_PORT"
    echo "  Redis端口: $REDIS_PORT"
    echo ""

    if ! confirm_action "确认部署配置？"; then
        print_info "部署已取消"
        exit 0
    fi

    # 检查环境
    check_environment

    # 安装系统依赖
    install_system_dependencies

    # 配置数据库
    setup_database

    # 配置Redis
    setup_redis

    # 配置后端服务
    setup_backend_service

    # 创建后端systemd服务
    create_backend_systemd_service

    # 配置前端服务
    setup_frontend_service

    # 配置Nginx
    setup_nginx

    # 执行数据库迁移
    run_database_migrations

    # 配置防火墙
    setup_firewall

    # 验证部署
    verify_deployment

    # 显示部署信息
    show_deployment_info

    print_success "纯系统部署流程完成"
}

# 运行主函数
main "$@"