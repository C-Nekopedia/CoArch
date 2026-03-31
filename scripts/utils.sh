#!/bin/bash

# CoArch 部署工具函数库

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志级别
LOG_INFO="INFO"
LOG_WARN="WARN"
LOG_ERROR="ERROR"
LOG_SUCCESS="SUCCESS"

# 打印带颜色的消息
print_color() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# 打印信息消息
print_info() {
    print_color "$CYAN" "[INFO] $1"
}

# 打印成功消息
print_success() {
    print_color "$GREEN" "[SUCCESS] $1"
}

# 打印警告消息
print_warning() {
    print_color "$YELLOW" "[WARNING] $1"
}

# 打印错误消息
print_error() {
    print_color "$RED" "[ERROR] $1"
}

# 打印步骤标题
print_step() {
    echo ""
    print_color "$MAGENTA" "=== $1 ==="
    echo ""
}

# 打印头部
print_header() {
    echo ""
    print_color "$BLUE" "========================================"
    print_color "$BLUE" "  $1"
    print_color "$BLUE" "========================================"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否以root运行
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "此操作需要root权限，请使用sudo运行"
        exit 1
    fi
}

# 确认操作
confirm_action() {
    local message="$1"
    local default="${2:-n}"

    local options="[y/N]"
    if [[ "$default" =~ ^[Yy]$ ]]; then
        options="[Y/n]"
    fi

    read -p "$message $options: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z "$REPLY" && "$default" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# 等待服务启动
wait_for_service() {
    local service_name="$1"
    local timeout="${2:-30}"
    local interval="${3:-2}"
    local start_time=$(date +%s)

    print_info "等待 $service_name 启动..."

    while true; do
        if systemctl is-active --quiet "$service_name"; then
            print_success "$service_name 已启动"
            return 0
        fi

        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -ge $timeout ]]; then
            print_error "$service_name 启动超时 ($timeout 秒)"
            return 1
        fi

        sleep "$interval"
    done
}

# 等待端口可用
wait_for_port() {
    local host="$1"
    local port="$2"
    local timeout="${3:-30}"
    local interval="${4:-2}"
    local start_time=$(date +%s)

    print_info "等待 $host:$port 可用..."

    while true; do
        if command_exists nc; then
            if nc -z "$host" "$port" 2>/dev/null; then
                print_success "$host:$port 已可用"
                return 0
            fi
        elif command_exists telnet; then
            if echo -e "\n" | telnet "$host" "$port" 2>&1 | grep -q "Connected"; then
                print_success "$host:$port 已可用"
                return 0
            fi
        else
            # 简单的超时后返回成功（假设服务已启动）
            sleep "$interval"
            print_warning "无法检查端口，假设 $host:$port 已启动"
            return 0
        fi

        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -ge $timeout ]]; then
            print_error "$host:$port 连接超时 ($timeout 秒)"
            return 1
        fi

        sleep "$interval"
    done
}

# 生成随机密码
generate_password() {
    local length="${1:-16}"
    tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' < /dev/urandom | head -c "$length"
}

# 获取系统信息
get_system_info() {
    echo "系统信息:"
    echo "  OS: $(uname -s)"
    echo "  内核: $(uname -r)"
    echo "  架构: $(uname -m)"

    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        echo "  发行版: $NAME $VERSION"
        echo "  ID: $ID"
    fi

    echo "  内存: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "  存储: $(df -h / | awk 'NR==2 {print $4}') 可用"
}

# 检查磁盘空间
check_disk_space() {
    local required_gb="${1:-5}"
    local available_gb=$(df -BG / | awk 'NR==2 {gsub("G","",$4); print $4}')

    if [[ $available_gb -lt $required_gb ]]; then
        print_error "磁盘空间不足: 需要 ${required_gb}GB，当前可用 ${available_gb}GB"
        return 1
    else
        print_success "磁盘空间充足: 可用 ${available_gb}GB"
        return 0
    fi
}

# 备份文件
backup_file() {
    local file_path="$1"
    local backup_dir="${2:-./backups}"

    if [[ ! -f "$file_path" ]]; then
        print_warning "文件不存在: $file_path"
        return 1
    fi

    mkdir -p "$backup_dir"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$backup_dir/$(basename "$file_path").backup.$timestamp"

    cp "$file_path" "$backup_file"

    if [[ $? -eq 0 ]]; then
        print_success "已备份 $file_path 到 $backup_file"
        return 0
    else
        print_error "备份 $file_path 失败"
        return 1
    fi
}

# 恢复文件
restore_file() {
    local file_path="$1"
    local backup_dir="${2:-./backups}"

    if [[ ! -f "$file_path" ]]; then
        print_warning "文件不存在: $file_path"
        return 1
    fi

    local latest_backup=$(ls -t "$backup_dir/$(basename "$file_path").backup."* 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        print_error "找不到备份文件"
        return 1
    fi

    cp "$latest_backup" "$file_path"

    if [[ $? -eq 0 ]]; then
        print_success "已从 $latest_backup 恢复 $file_path"
        return 0
    else
        print_error "恢复 $file_path 失败"
        return 1
    fi
}

# 验证URL格式
validate_url() {
    local url="$1"
    local pattern='^(https?|ftp)://[A-Za-z0-9\-\.]+\.[A-Za-z]{2,}(:[0-9]+)?(/.*)?$'

    if [[ $url =~ $pattern ]]; then
        return 0
    else
        return 1
    fi
}

# 验证邮箱格式
validate_email() {
    local email="$1"
    local pattern='^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if [[ $email =~ $pattern ]]; then
        return 0
    else
        return 1
    fi
}

# 验证端口号
validate_port() {
    local port="$1"

    if [[ $port =~ ^[0-9]+$ ]] && [[ $port -ge 1 ]] && [[ $port -le 65535 ]]; then
        return 0
    else
        return 1
    fi
}

# 获取外部IP地址
get_external_ip() {
    local ip=""

    # 尝试多种方法获取IP
    for cmd in "curl -s ifconfig.me" "curl -s icanhazip.com" "curl -s ipinfo.io/ip"; do
        if command_exists curl; then
            ip=$(eval "$cmd" 2>/dev/null)
            if [[ -n "$ip" ]] && validate_ip "$ip"; then
                echo "$ip"
                return 0
            fi
        fi
    done

    # 如果curl失败，尝试其他方法
    if command_exists dig; then
        ip=$(dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null)
        if [[ -n "$ip" ]] && validate_ip "$ip"; then
            echo "$ip"
            return 0
        fi
    fi

    print_warning "无法获取外部IP地址"
    echo "127.0.0.1"
    return 1
}

# 验证IP地址
validate_ip() {
    local ip="$1"
    local pattern='^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'

    if [[ $ip =~ $pattern ]]; then
        return 0
    else
        return 1
    fi
}

# 设置文件权限
set_permissions() {
    local path="$1"
    local permissions="${2:-644}"
    local owner="${3:-}"

    if [[ ! -e "$path" ]]; then
        print_warning "文件或目录不存在: $path"
        return 1
    fi

    # 设置权限
    chmod "$permissions" "$path" 2>/dev/null

    # 设置所有者
    if [[ -n "$owner" ]]; then
        chown "$owner" "$path" 2>/dev/null
    fi

    if [[ $? -eq 0 ]]; then
        print_success "已设置权限: $path -> $permissions"
        return 0
    else
        print_error "设置权限失败: $path"
        return 1
    fi
}

# 创建目录并设置权限
create_directory() {
    local dir_path="$1"
    local permissions="${2:-755}"
    local owner="${3:-}"

    mkdir -p "$dir_path"

    if [[ $? -eq 0 ]]; then
        print_success "已创建目录: $dir_path"
        set_permissions "$dir_path" "$permissions" "$owner"
        return 0
    else
        print_error "创建目录失败: $dir_path"
        return 1
    fi
}

# 检查服务状态
check_service_status() {
    local service_name="$1"

    if ! command_exists systemctl; then
        print_warning "systemctl 不可用，无法检查服务状态"
        return 2
    fi

    if systemctl is-active --quiet "$service_name"; then
        print_success "$service_name: 运行中"
        return 0
    elif systemctl is-enabled --quiet "$service_name"; then
        print_warning "$service_name: 已启用但未运行"
        return 1
    else
        print_error "$service_name: 未启用"
        return 2
    fi
}

# 启用并启动服务
enable_and_start_service() {
    local service_name="$1"

    if ! command_exists systemctl; then
        print_error "systemctl 不可用，无法管理服务"
        return 1
    fi

    print_info "启用服务: $service_name"
    systemctl enable "$service_name" 2>/dev/null

    print_info "启动服务: $service_name"
    systemctl start "$service_name" 2>/dev/null

    wait_for_service "$service_name"
}

# 停止并禁用服务
stop_and_disable_service() {
    local service_name="$1"

    if ! command_exists systemctl; then
        print_error "systemctl 不可用，无法管理服务"
        return 1
    fi

    print_info "停止服务: $service_name"
    systemctl stop "$service_name" 2>/dev/null

    print_info "禁用服务: $service_name"
    systemctl disable "$service_name" 2>/dev/null

    print_success "已停止并禁用服务: $service_name"
}

# 安全删除文件
safe_delete() {
    local path="$1"
    local backup="${2:-true}"

    if [[ ! -e "$path" ]]; then
        print_warning "文件或目录不存在: $path"
        return 0
    fi

    if [[ "$backup" == "true" ]]; then
        backup_file "$path"
    fi

    print_info "删除: $path"
    rm -rf "$path"

    if [[ $? -eq 0 ]]; then
        print_success "已删除: $path"
        return 0
    else
        print_error "删除失败: $path"
        return 1
    fi
}

# 执行命令并检查结果
run_command() {
    local cmd="$1"
    local error_msg="${2:-命令执行失败}"

    print_info "执行: $cmd"

    if eval "$cmd"; then
        print_success "命令执行成功"
        return 0
    else
        print_error "$error_msg"
        return 1
    fi
}

# 加载环境变量
load_env_file() {
    local env_file="$1"

    if [[ ! -f "$env_file" ]]; then
        print_warning "环境文件不存在: $env_file"
        return 1
    fi

    print_info "加载环境变量: $env_file"

    # 安全地加载环境变量，避免执行恶意代码
    while IFS='=' read -r key value || [[ -n "$key" ]]; do
        # 跳过注释和空行
        if [[ $key =~ ^# ]] || [[ -z "$key" ]]; then
            continue
        fi

        # 移除可能的引号
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"

        # 设置环境变量
        export "$key"="$value"

    done < "$env_file"

    print_success "环境变量加载完成"
    return 0
}