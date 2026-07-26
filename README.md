# 白起SSE — AI 辅助销售管理系统

基于 IBM Signature Selling Method (SSM) 方法论的 AI 辅助销售管理 SaaS 平台。

## 技术栈

- **前端**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI**: TailwindCSS + shadcn/ui + Radix UI
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js v5 (JWT + Credentials Provider)
- **AI 网关**: 服务端统一管理 LLM 调用 (OpenAI / Anthropic / DeepSeek)
- **部署**: Vercel / 自托管

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写数据库连接和 AI API Key：

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/baiqi_sse?schema=public"
NEXTAUTH_SECRET="your-secret-key"  # openssl rand -base64 32
OPENAI_API_KEY="sk-..."
```

### 3. 初始化数据库

```bash
# 创建数据库表结构
npm run db:push

# 生成 Prisma Client
npm run db:generate

# 填充种子数据（创建演示租户和管理员账号）
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 默认账号

- 邮箱: `admin@baiqi.ai`
- 密码: `admin123`

## 项目结构

```
baiqi-sse/
├── prisma/
│   ├── schema.prisma        # 数据库 Schema（20+ 张表）
│   └── seed.ts              # 种子数据
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # 认证页面（登录）
│   │   ├── (dashboard)/     # 主应用（带侧边栏）
│   │   ├── api/             # API Routes
│   │   │   ├── auth/        # NextAuth 认证端点
│   │   │   └── ai/          # AI 网关入口
│   │   ├── globals.css      # 全局样式 + CSS 变量
│   │   └── layout.tsx       # 根布局
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件库（14 个组件）
│   │   ├── layout/          # 布局组件（侧边栏、顶栏）
│   │   ├── providers.tsx    # SessionProvider + ThemeProvider
│   │   └── theme-provider.tsx
│   ├── lib/
│   │   ├── ai/gateway.ts    # AI 网关（多模型路由、审计日志）
│   │   ├── auth.ts          # NextAuth 配置
│   │   ├── constants.ts     # SSM 工具定义、模型配置、36计
│   │   ├── db.ts            # Prisma Client 单例
│   │   └── utils.ts         # 工具函数
│   ├── server/services/     # 服务层（业务逻辑）
│   ├── types/               # TypeScript 类型定义
│   └── middleware.ts        # 路由守卫
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## SSM 十大工具

| 工具 | 说明 | 数据模型 |
|------|------|----------|
| 客户洞察 | 客户业务背景、关键指标 | CustomerInsight |
| 痛点分析 | 表层→业务→根本痛点链 | PainChain |
| 价值主张 | 痛点映射到解决方案 | ValueProposition |
| 竞争分析 | 竞争对手优劣势分析 | CompetitiveAnalysis |
| 决策地图 | 决策链和影响力图谱 | DecisionMap |
| 关系图谱 | 人际关系可视化 | RelationshipMap |
| 销售路径 | 阶段、里程碑、行动 | SalesPath |
| 行动计划 | 任务、时间线、资源 | ActionPlan |
| 九宫图 | SSM 核心 3x3 矩阵 | NineGrid |
| 业绩分析 | 销售指标和预测 | (报表聚合) |

## AI 网关架构

```
浏览器 → API Route /api/ai → AI Gateway
                               ├── 加载 PromptTemplate（租户级 > 全局）
                               ├── 填充变量
                               ├── 路由到 LLM (OpenAI/Anthropic/DeepSeek)
                               ├── 记录 AICall 审计日志
                               └── 更新租户用量计数
```

- API Key 仅在服务端使用，永不暴露给浏览器
- Prompt 模板存数据库，AI 专家通过管理界面配置
- 支持 OpenAI、Anthropic、DeepSeek 三家模型

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查
npm run db:push      # 同步 Schema 到数据库
npm run db:migrate   # 创建数据库迁移
npm run db:studio    # 打开 Prisma Studio
npm run db:seed      # 填充种子数据
npm run db:generate  # 生成 Prisma Client
```

## 开发模式

本项目采用 **2人+WorkBuddy** 协作模式：
- 架构师：写任务规格、Code Review、DevOps
- AI 专家：Prompt 工程、模型选型、SSM 知识库
- WorkBuddy：代码生成、测试、重构、文档
