#!/bin/bash

# CoArch 部署脚本
# 支持多种部署模式：全容器化、混合部署、纯系统部署

set -e

# 导入工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 默认值
DEFAULT_MODE="hybrid"
DEFAULT_ENV="development"
DEFAULT_DOMAIN="localhost"

# 显示使用说明
show_usage() {
    echo "CoArch 部署脚本"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --mode=MODE          部署模式: docker, hybrid, system (默认: $DEFAULT_MODE)"
    echo "  --env=ENV            环境: development, production (默认: $DEFAULT_ENV)"
    echo "  --domain=DOMAIN      域名 (用于生产环境配置, 默认: $DEFAULT_DOMAIN)"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --mode=docker --env=production --domain=coarch.example.com"
    echo "  $0 --mode=hybrid --env=development"
    echo "  $0                    # 使用默认值 (交互式)"
    echo ""
}

# 解析命令行参数
parse_args() {
    MODE="$DEFAULT_MODE"
    ENV="$DEFAULT_ENV"
    DOMAIN="$DEFAULT_DOMAIN"
    INTERACTIVE=true

    for arg in "$@"; do
        case $arg in
            --mode=*)
                MODE="${arg#*=}"
                INTERACTIVE=false
                ;;
            --env=*)
                ENV="${arg#*=}"
                INTERACTIVE=false
                ;;
            --domain=*)
                DOMAIN="${arg#*=}"
                INTERACTIVE=false
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
    if ! [[ "$MODE" =~ ^(docker|hybrid|system)$ ]]; then
        echo "错误: 无效的部署模式 '$MODE'，必须是 docker, hybrid 或 system"
        exit 1
    fi

    if ! [[ "$ENV" =~ ^(development|production)$ ]]; then
        echo "错误: 无效的环境 '$ENV'，必须是 development 或 production"
        exit 1
    fi

    if [[ "$ENV" == "production" && "$DOMAIN" == "localhost" ]]; then
        echo "警告: 生产环境使用 localhost 作为域名可能不合适"
        if $INTERACTIVE; then
            read -p "请输入生产域名 (或按 Enter 继续使用 localhost): " input_domain
            if [[ -n "$input_domain" ]]; then
                DOMAIN="$input_domain"
            fi
        fi
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "================================"
    echo "CoArch 部署配置"
    echo "================================"
    echo "部署模式: $MODE"
    echo "环境: $ENV"
    echo "域名: $DOMAIN"
    echo "工作目录: $(pwd)"
    echo "================================"
    echo ""

    if $INTERACTIVE; then
        read -p "确认部署配置？(y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "部署已取消"
            exit 0
        fi
    fi
}

# 环境检查
check_environment() {
    echo "正在检查环境..."

    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "✓ 操作系统: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "✓ 操作系统: macOS"
    else
        echo "⚠ 操作系统: $OSTYPE (可能不是Linux/macOS)"
    fi

    # 检查Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}')
        echo "✓ Docker: $DOCKER_VERSION"
    else
        echo "✗ Docker: 未安装"
        if [[ "$MODE" == "docker" ]]; then
            echo "错误: 全容器化部署需要 Docker"
            exit 1
        fi
    fi

    # 检查Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(docker-compose --version | awk '{print $3 $4 $5}')
        echo "✓ Docker Compose: $DOCKER_COMPOSE_VERSION"
    else
        echo "✗ Docker Compose: 未安装"
        if [[ "$MODE" == "docker" ]]; then
            echo "错误: 全容器化部署需要 Docker Compose"
            exit 1
        fi
    fi

    # 检查Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo "✓ Node.js: $NODE_VERSION"
    else
        echo "✗ Node.js: 未安装"
        if [[ "$MODE" == "system" ]]; then
            echo "错误: 系统部署需要 Node.js"
            exit 1
        fi
    fi

    # 检查npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo "✓ npm: $NPM_VERSION"
    else
        echo "✗ npm: 未安装"
        if [[ "$MODE" == "system" ]]; then
            echo "错误: 系统部署需要 npm"
            exit 1
        fi
    fi

    echo "环境检查完成"
}

# 选择部署模式（交互式）
select_mode() {
    if ! $INTERACTIVE; then
        return
    fi

    echo ""
    echo "请选择部署模式:"
    echo "1) 全容器化部署 (Docker Compose)"
    echo "   所有服务都运行在Docker容器中，最简单"
    echo "2) 混合部署 (数据库Docker + 应用系统服务)"
    echo "   推荐用于生产环境，易于管理"
    echo "3) 纯系统部署 (所有服务都安装到系统)"
    echo "   最复杂的部署方式，适合高级用户"
    echo ""

    read -p "请输入选择 (1-3, 默认 2): " mode_choice

    case $mode_choice in
        1)
            MODE="docker"
            ;;
        2|"")
            MODE="hybrid"
            ;;
        3)
            MODE="system"
            ;;
        *)
            echo "无效选择，使用默认值: hybrid"
            MODE="hybrid"
            ;;
    esac
}

# 选择环境（交互式）
select_environment() {
    if ! $INTERACTIVE; then
        return
    fi

    echo ""
    echo "请选择环境:"
    echo "1) 开发环境"
    echo "   用于测试和开发"
    echo "2) 生产环境"
    echo "   用于正式部署，需要额外配置"
    echo ""

    read -p "请输入选择 (1-2, 默认 1): " env_choice

    case $env_choice in
        1|"")
            ENV="development"
            ;;
        2)
            ENV="production"
            ;;
        *)
            echo "无效选择，使用默认值: development"
            ENV="development"
            ;;
    esac

    if [[ "$ENV" == "production" ]]; then
        read -p "请输入生产域名 (例如: coarch.example.com): " input_domain
        if [[ -n "$input_domain" ]]; then
            DOMAIN="$input_domain"
        else
            echo "未输入域名，使用默认值: localhost"
            DOMAIN="localhost"
        fi
    fi
}

# 准备部署配置
prepare_deployment() {
    echo ""
    echo "正在准备部署配置..."

    # 创建配置目录
    CONFIG_DIR="deploy-config"
    mkdir -p "$CONFIG_DIR"

    # 复制环境模板
    echo "复制环境配置文件..."
    if [[ -d "config-examples/env-templates" ]]; then
        ENV_TEMPLATE="config-examples/env-templates/.env.$MODE.$ENV.example"
        if [[ -f "$ENV_TEMPLATE" ]]; then
            cp "$ENV_TEMPLATE" "$CONFIG_DIR/.env"
            echo "✓ 已复制环境配置: $ENV_TEMPLATE"

            # 替换域名占位符
            if grep -q "DOMAIN_PLACEHOLDER" "$CONFIG_DIR/.env"; then
                sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$CONFIG_DIR/.env"
                echo "✓ 已替换域名: $DOMAIN"
            fi
        else
            echo "⚠ 环境模板不存在: $ENV_TEMPLATE"
        fi
    else
        echo "⚠ 环境模板目录不存在"
    fi

    echo "部署配置准备完成"
}

# 执行部署
execute_deployment() {
    echo ""
    echo "正在执行 $MODE 模式部署..."

    case $MODE in
        docker)
            echo "执行全容器化部署..."
            if [[ -f "scripts/deploy-docker-full.sh" ]]; then
                bash "scripts/deploy-docker-full.sh" --env="$ENV" --domain="$DOMAIN"
            else
                echo "错误: 部署脚本不存在 scripts/deploy-docker-full.sh"
                exit 1
            fi
            ;;
        hybrid)
            echo "执行混合部署..."
            if [[ -f "scripts/deploy-hybrid.sh" ]]; then
                bash "scripts/deploy-hybrid.sh" --env="$ENV" --domain="$DOMAIN"
            else
                echo "错误: 部署脚本不存在 scripts/deploy-hybrid.sh"
                exit 1
            fi
            ;;
        system)
            echo "执行系统部署..."
            if [[ -f "scripts/deploy-system.sh" ]]; then
                bash "scripts/deploy-system.sh" --env="$ENV" --domain="$DOMAIN"
            else
                echo "错误: 部署脚本不存在 scripts/deploy-system.sh"
                exit 1
            fi
            ;;
    esac

    echo ""
    echo "================================"
    echo "部署完成！"
    echo "================================"
}

# 主函数
main() {
    print_header "CoArch 部署工具"

    # 解析参数
    parse_args "$@"

    # 交互式选择（如果没有通过参数指定）
    if $INTERACTIVE; then
        select_mode
        select_environment
    fi

    # 显示部署信息
    show_deployment_info

    # 检查环境
    check_environment

    # 准备部署
    prepare_deployment

    # 执行部署
    execute_deployment
}

# 运行主函数
main "$@"