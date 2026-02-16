# PRD: 移除账号认证系统

## Introduction

ManceDB 目前要求用户注册/登录账号才能使用数据库管理功能。对于单人本地使用的桌面客户端场景，这种强制认证增加了不必要的使用门槛。本功能将完全移除账号认证系统，让用户打开应用后直接进入数据库连接界面，连接后即可操作数据库。

## Goals

- 移除登录/注册流程，减少用户使用门槛
- 简化应用启动流程：打开即使用
- 保留数据库层面的权限控制（通过 LanceDB 自身）
- 清理认证相关的代码、数据库表和配置
- 保持现有数据库操作功能不变

## User Stories

### US-001: 移除 Server 端 JWT 认证中间件
**Description:** 作为开发者，我需要移除或可选化 JWT 认证，使得 API 可以在无认证状态下访问。

**Acceptance Criteria:**
- [ ] 移除 `AuthMiddleware` 或将其改为可配置开关
- [ ] 移除 `CurrentUser` 装饰器及相关注入
- [ ] 更新 `routing-controllers` 配置，移除全局认证中间件
- [ ] 移除 `JWT_SECRET` 环境变量的强制要求
- [ ] 所有 API 端点可在无 token 状态下正常访问
- [ ] Typecheck passes

### US-002: 移除 Server 端用户相关数据库表
**Description:** 作为开发者，我需要移除用户相关的数据库表和迁移脚本。

**Acceptance Criteria:**
- [ ] 移除 `users` 表及相关索引
- [ ] 移除用户相关的迁移脚本（`003-admin-tables.ts` 中的用户部分）
- [ ] 确保数据库启动时不报错
- [ ] 保留其他必要的系统表（如连接配置表）
- [ ] Typecheck passes

### US-003: 移除 Server 端用户服务和控制器
**Description:** 作为开发者，我需要移除用户相关的服务和控制器代码。

**Acceptance Criteria:**
- [ ] 删除 `UserService` 及相关 DTO
- [ ] 删除 `AuthController` 中的登录/注册/登出接口
- [ ] 从 `Container` 中移除用户服务注册
- [ ] 清理 `AuthService` 中 JWT 相关逻辑
- [ ] 确保其他控制器不依赖用户上下文
- [ ] Typecheck passes

### US-004: 调整 Web 端路由和路由守卫
**Description:** 作为用户，我打开 Web 应用后应该直接进入连接管理页面，不需要登录。

**Acceptance Criteria:**
- [ ] 移除 `AuthGuard` 组件或使其自动通过
- [ ] 更新路由配置：默认路由改为 `/connections`
- [ ] 移除 `/auth` 路由及相关页面
- [ ] 移除 `useAuth` hook 或简化其实现
- [ ] 确保无需登录即可访问所有功能页面
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: 移除 Web 端登录/注册页面
**Description:** 作为用户，我不需要看到登录和注册界面。

**Acceptance Criteria:**
- [ ] 删除 `auth.tsx` 登录页面
- [ ] 删除 `startup-mode.tsx` 中的登录相关 UI
- [ ] 移除登录表单组件
- [ ] 清理相关样式和国际化文案
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: 清理 Web 端认证状态管理
**Description:** 作为开发者，我需要清理前端认证相关的状态管理代码。

**Acceptance Criteria:**
- [ ] 移除 `authStore` 或简化其为空实现
- [ ] 移除 `localStorage` 中的 token 存储逻辑
- [ ] 更新 API client，移除 token 注入逻辑
- [ ] 清理 `Authorization` header 相关代码
- [ ] 确保 API 调用正常工作
- [ ] Typecheck passes

### US-007: 调整 Client (Electron) 启动流程
**Description:** 作为桌面应用用户，我打开应用后应该直接看到连接管理界面。

**Acceptance Criteria:**
- [ ] 移除主进程中登录窗口相关代码
- [ ] 调整启动窗口逻辑：直接加载连接页面
- [ ] 移除 IPC 中认证相关的通道
- [ ] 确保应用启动时无需等待认证
- [ ] Typecheck passes

### US-008: 更新环境变量配置文档
**Description:** 作为部署者，我需要了解新的环境变量要求。

**Acceptance Criteria:**
- [ ] 更新 `ENVIRONMENT.md`，移除 `JWT_SECRET` 必需标记
- [ ] 更新 `.env.example` 文件
- [ ] 更新 README 中的快速开始指南
- [ ] 文档说明应用现在无需认证即可使用

## Functional Requirements

- FR-1: 用户打开应用后直接进入数据库连接管理界面，无需登录
- FR-2: 所有 API 端点无需 JWT token 即可访问
- FR-3: 移除 `users` 数据库表及相关索引
- FR-4: 删除登录/注册页面和路由
- FR-5: 删除前端认证状态管理和 token 存储
- FR-6: 保留连接配置持久化（连接信息需要保存）
- FR-7: 数据库操作权限由 LanceDB 自身控制（如 S3 凭证、本地文件权限）
- FR-8: 清理后的代码通过所有 lint 和 typecheck

## Non-Goals

- 不移除连接配置管理（连接信息仍然需要保存）
- 不添加新的认证方式（如 Basic Auth、API Key）
- 不改变 LanceDB 数据库本身的权限控制
- 不实现多用户切换功能
- 不保留可选认证开关（完全移除）

## Design Considerations

- 移除登录页面后，首屏直接显示连接列表
- 如果连接列表为空，显示空状态引导用户创建连接
- 移除导航栏中的用户头像/登出按钮
- 保持现有连接管理 UI 不变

## Technical Considerations

### Server 端改动点
- `apps/server/src/middleware/auth.middleware.ts` - 移除或修改
- `apps/server/src/controllers/auth.controller.ts` - 移除登录接口
- `apps/server/src/services/auth.service.ts` - 移除 JWT 逻辑
- `apps/server/src/migrations/scripts/003-admin-tables.ts` - 移除用户表
- `apps/server/src/index.ts` - 移除 JWT 中间件注册

### Web 端改动点
- `apps/web/src/pages/auth/` - 删除整个目录
- `apps/web/src/pages/startup/startup-mode.tsx` - 移除登录相关 UI
- `apps/web/src/guards/auth-guard.tsx` - 移除或简化
- `apps/web/src/store/auth-store.ts` - 移除
- `apps/web/src/api/client.ts` - 移除 token 注入
- `apps/web/src/router.tsx` - 更新路由配置

### Client 端改动点
- `apps/client/src/main/windows/` - 移除登录窗口相关代码
- `apps/client/src/preload/` - 移除认证相关 IPC 通道

### 依赖清理
- 考虑是否移除 `jsonwebtoken` 依赖
- 考虑是否移除 `bcrypt` 依赖

## Success Metrics

- 应用启动时间减少（无需验证 token）
- 用户首次使用无需注册账号
- 代码量减少（移除认证相关代码）
- 所有现有数据库操作功能正常工作

## Open Questions

1. 是否需要保留用户偏好设置（如主题、语言）的存储？如果不需要关联到用户，可能需要一个简单的本地存储方案。
2. Web 版本是否需要考虑未来重新添加认证的可能性？代码应该如何组织以方便未来扩展？
3. 是否需要为 Web 版本添加一个简单的访问密码来保护管理界面（类似 Redis 的 requirepass）？
