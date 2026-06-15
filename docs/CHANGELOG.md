# CHANGELOG.md — 变化日志

> 记录每次对项目的修改，无论大小。包括新增、修改、删除、修复、重构。
> 格式：日期 + 版本号 + 变更摘要 + 详细说明。

---

## [0.1.0] — 2026-06-15

### 新增 — Phase 1：项目初始化完成

**项目脚手架**
- 创建 Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 项目
- 配置 `@/*` 路径别名 → `./src/*`

**目录结构**
- 按 ARCHITECTURE.md 创建完整目录树：
  - `src/app/` — (public)/(auth)/(main)/(admin) 路由分组
  - `src/components/` — common/layout/form/upload/result/admin/feedback
  - `src/features/` — 13 个功能模块目录
  - `src/server/` — services/repositories/validators/policies/jobs/adapters
  - `src/lib/` — db/auth/ai/ocr/storage/mail/sms/logger/errors
  - `src/types/` — 8 个类型定义文件
  - `src/config/` — 5 个配置文件
  - `src/middleware/` — 预留中间件目录
  - `scripts/` — seed-admin/seed-knowledge/backup
  - `uploads/` — tmp/users/avatars/analysis

**核心依赖**
- `mysql2` — MariaDB/MySQL 连接
- `bcryptjs` — 密码哈希
- `jose` — JWT 签发与验证
- `zod` — 运行时校验（待接入）

**配置文件（5 个）**
- `src/config/app.config.ts` — 全局应用配置
- `src/config/auth.config.ts` — 认证相关配置
- `src/config/upload.config.ts` — 上传限制配置
- `src/config/ai.config.ts` — DeepSeek AI 配置
- `src/config/admin.config.ts` — 管理员配置 + 免责声明核心条款

**核心库文件（8 个）**
- `src/lib/db/index.ts` — 数据库连接池 + query/transaction 工具
- `src/lib/auth/index.ts` — JWT 签发验证 + 密码哈希比对 + 用户名/密码规则校验
- `src/lib/ai/index.ts` — DeepSeek AI Adapter + 多模态支持 + Prompt 构建
- `src/lib/ocr/index.ts` — 基于 DeepSeek 多模态的文字识别
- `src/lib/storage/index.ts` — 本地文件存储适配器（预留对象存储接口）
- `src/lib/mail/index.ts` — Resend 邮件适配器（内测阶段跳过）
- `src/lib/sms/index.ts` — 阿里云短信适配器（内测阶段跳过）
- `src/lib/logger/index.ts` — 结构化日志

**错误处理**
- `src/lib/errors/index.ts` — AppError 基类 + 10 个子类错误
- `src/lib/api-response.ts` — 统一 API 响应格式辅助

**类型定义（8 文件）**
- auth.ts / user.ts / analysis.ts / knowledge.ts / history.ts / note.ts / feedback.ts / admin.ts

**数据库**
- `scripts/schema.sql` — 完整建表脚本（24 张表 + 索引 + 外键）
- `scripts/seed.ts` — 种子数据脚本
  - 8 个知识分类
  - 61 条知识条目（含标签、适用场景、来源说明）
  - 12 条首页名言
  - 5 首好歌推荐
  - 5 条系统文案（免责声明/产品说明/新手教程/问候语/Coming Soon）

**中间件**
- `src/middleware.ts` — 统一鉴权中间件
  - 公开路径白名单
  - JWT Token 验证
  - 管理员路由守卫
  - 用户信息注入请求头

**通用 UI 组件（9 个）**
- `Loading` + `Skeleton` + `PageSkeleton` — 加载状态
- `ErrorState` — 错误状态（支持重试/返回首页）
- `EmptyState` — 空状态（支持操作按钮）
- `ConfirmModal` — 通用确认弹层（支持危险模式）
- `Toast` + `ToastProvider` + `useToast` — 轻提示系统
- `BottomNav` — 底部导航栏（含中间突出相机按钮）
- `MobileLayout` — 移动端容器布局

**全局样式**
- `src/app/globals.css` — 琥珀色调柔和配色 + 自定义 CSS 类（card/btn/input/tag 等）
- `src/app/layout.tsx` — 根布局（ToastProvider + viewport 配置）
- `src/app/page.tsx` — 入口页

### 修改
- 文档迁移至 `docs/` 目录

### 项目状态
- 当前阶段：Phase 1 ✅ 完成
- 下一阶段：Phase 2（账号与合规系统）
- 编译状态：✅ `next build` 通过
- 代码文件：40+ 文件
- 任务完成：Phase 1 全部 26 个任务

---

## [0.0.0] — 2026-06-15

---

## 版本号规则

格式：`[主版本.次版本.修订号]`

| 层级 | 何时递增 |
|------|----------|
| 主版本 | 大功能上线、架构变更、对外发布 |
| 次版本 | Phase 完成、模块上线、功能新增 |
| 修订号 | Bug 修复、文案调整、样式微调、文档更新 |

当前版本 **0.0.0** 表示项目处于文档与准备阶段，尚未进入编码。

---

## 变更模板（复制使用）

```markdown
## [X.Y.Z] — YYYY-MM-DD

### 新增
- 

### 修改
- 

### 修复
- 

### 删除
- 

### 备注
- 
```
