# 贡献指南

感谢您有兴趣为 Co-Arch 项目做出贡献！以下是贡献代码的指南。

## 如何贡献

### 报告问题
- 使用 GitHub Issues 报告 bug 或提出功能建议
- 在提交新 issue 前，请先搜索是否已有类似问题
- 提供清晰的问题描述、复现步骤、预期行为和实际行为

### 开发环境设置
1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/coarch.git
   cd coarch
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 设置环境变量：
   - 复制 `packages/backend/.env.example` 为 `.env` 并配置数据库
   - 复制 `packages/frontend/.env.example` 为 `.env.development`

4. 启动开发环境：
   ```bash
   # 启动后端开发服务器
   cd packages/backend
   npm run start:dev
   
   # 启动前端开发服务器（新终端）
   cd packages/frontend
   npm run dev
   ```

### 提交拉取请求
1. Fork 本仓库并创建新分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 进行更改并确保代码质量：
   - 运行测试：`npm run test`
   - 检查代码风格：`npm run lint`
   - 类型检查：`npm run type-check`

3. 提交更改：
   ```bash
   git add .
   git commit -m "feat: 描述你的功能"
   ```

4. 推送到你的仓库并创建 Pull Request

## 代码规范

### 提交消息
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
- `feat:` 新功能
- `fix:` bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具变更

### 代码风格
- 使用 TypeScript 并启用严格模式
- 遵循 ESLint 和 Prettier 配置
- 重要函数和类添加 JSDoc 注释

### 测试要求
- 新功能应包含单元测试
- 修复 bug 时应添加相应的测试用例
- 确保所有测试通过后再提交

## 项目结构
```
coarch/
├── packages/
│   ├── backend/     # NestJS 后端
│   ├── frontend/    # Vue 3 前端
│   └── shared/      # 共享代码（类型、工具函数）
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

感谢您的贡献！🎉
