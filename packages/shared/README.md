# @coarch/shared

CoArch项目共享代码库，包含前后端通用的类型定义、工具函数和常量。

## 功能

- **类型定义**: 统一的API响应类型、实体类型、DTO类型
- **工具函数**: 验证、格式化、错误处理等通用工具
- **常量定义**: 错误代码、API端点、验证规则等常量
- **配置**: 前后端共享的配置定义

## 安装

在项目根目录运行：

```bash
npm install @coarch/shared
```

或在monorepo中直接引用：

```json
{
  "dependencies": {
    "@coarch/shared": "workspace:*"
  }
}
```

## 使用示例

### 导入类型定义

```typescript
import type { User, Article, ApiResponse } from '@coarch/shared';
```

### 使用工具函数

```typescript
import { isValidEmail, formatDate } from '@coarch/shared';
```

### 使用常量

```typescript
import { ErrorCode, API_ENDPOINTS } from '@coarch/shared';
```

## 开发

### 构建

```bash
npm run build
```

### 开发模式（监听变化）

```bash
npm run dev
```

### 清理构建产物

```bash
npm run clean
```

## 项目结构

```
src/
├── index.ts          # 主入口
├── types/            # 类型定义
├── constants/        # 常量定义
├── utils/            # 工具函数
└── config/           # 配置定义
```

## 贡献

1. 确保类型定义与前后端实际使用保持一致
2. 添加新的共享代码前确认前后端都需要
3. 保持向后兼容性
4. 更新相关文档

## 许可证

MIT