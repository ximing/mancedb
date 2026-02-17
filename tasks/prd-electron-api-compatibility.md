# PRD: Electron API 兼容性完善

## 概述

当前 web 应用在 Electron 客户端模式下运行时，部分 API 端点报 "Endpoint not implemented in local mode" 错误。这是因为 Electron 的 IPC 路由层只实现了部分端点，导致功能不完整。本 PRD 旨在完善 Electron 环境下的 API 兼容性，确保 web 代码可以无缝运行在 server 和 client 两种模式下。

## 目标

- 在 Electron IPC 层实现所有缺失的 API 端点
- 保持 web 层代码无需修改（统一使用 HTTP 风格的 API 调用）
- 确保功能在 server 和 Electron 模式下行为一致
- 提供清晰的错误处理和日志记录

## 用户故事

### US-001: 梳理已实现和缺失的端点
**描述:** 作为开发者，我需要清楚了解哪些 API 端点已在 Electron IPC 层实现，哪些缺失，以便制定实现计划。

**验收标准:**
- [ ] 列出 `apps/server/src/controllers/` 中定义的所有端点
- [ ] 列出 `apps/client/src/main/ipc-router.ts` 中已实现的所有 IPC 处理器
- [ ] 生成缺失端点清单（包含 HTTP 方法和路径）
- [ ] 分类端点优先级（核心功能 vs 次要功能）

### US-002: 实现连接管理端点
**描述:** 作为 Electron 用户，我需要能够创建、读取、更新和删除连接，以便管理 LanceDB 数据库连接。

**验收标准:**
- [ ] 实现 `POST /api/v1/connections` - 创建连接
- [ ] 实现 `GET /api/v1/connections` - 获取所有连接
- [ ] 实现 `GET /api/v1/connections/:id` - 获取单个连接
- [ ] 实现 `PUT /api/v1/connections/:id` - 更新连接
- [ ] 实现 `DELETE /api/v1/connections/:id` - 删除连接
- [ ] 实现 `POST /api/v1/connections/:id/test` - 测试连接
- [ ] Typecheck/lint 通过
- [ ] 在 Electron 客户端验证功能正常

### US-003: 实现数据库/表管理端点
**描述:** 作为 Electron 用户，我需要能够查看和管理数据库表，以便浏览数据结构。

**验收标准:**
- [ ] 实现 `GET /api/v1/database/tables` - 获取表列表
- [ ] 实现 `GET /api/v1/database/tables/:name/schema` - 获取表结构
- [ ] 实现 `POST /api/v1/database/tables` - 创建表
- [ ] 实现 `DELETE /api/v1/database/tables/:name` - 删除表
- [ ] 实现 `GET /api/v1/database/tables/:name/count` - 获取记录数
- [ ] Typecheck/lint 通过
- [ ] 在 Electron 客户端验证功能正常

### US-004: 实现数据查询端点
**描述:** 作为 Electron 用户，我需要能够执行 SQL 查询和向量搜索，以便检索和操作数据。

**验收标准:**
- [ ] 实现 `POST /api/v1/query` - 执行 SQL 查询
- [ ] 实现 `POST /api/v1/search` - 向量搜索
- [ ] 实现 `GET /api/v1/tables/:name/data` - 分页获取数据
- [ ] 实现 `POST /api/v1/tables/:name/data` - 插入数据
- [ ] 实现 `PUT /api/v1/tables/:name/data/:id` - 更新数据
- [ ] 实现 `DELETE /api/v1/tables/:name/data/:id` - 删除数据
- [ ] Typecheck/lint 通过
- [ ] 在 Electron 客户端验证功能正常

### US-005: 实现认证相关端点
**描述:** 作为 Electron 用户，我需要能够登录和认证，以便访问受保护的功能。

**验收标准:**
- [ ] 实现 `POST /api/v1/auth/login` - 用户登录
- [ ] 实现 `POST /api/v1/auth/logout` - 用户登出
- [ ] 实现 `GET /api/v1/auth/profile` - 获取用户信息
- [ ] 处理 JWT token 的存储和刷新
- [ ] Typecheck/lint 通过
- [ ] 在 Electron 客户端验证功能正常

### US-006: 统一错误处理和响应格式
**描述:** 作为开发者，我需要 Electron 模式的错误响应与 server 模式保持一致，以便前端统一处理。

**验收标准:**
- [ ] 定义统一的错误响应格式（HTTP 状态码 + 错误消息）
- [ ] 所有 IPC 处理器返回与 server 相同的响应结构
- [ ] 错误日志记录到 Electron 主进程控制台
- [ ] 网络错误、业务错误、系统错误分类处理
- [ ] Typecheck/lint 通过

## 功能需求

- FR-1: IPC 路由层必须实现所有在 `apps/server/src/controllers/` 中定义的 REST 端点
- FR-2: IPC 处理器必须复用 `@mancedb/lancedb-core` 中的服务层逻辑
- FR-3: 请求/响应格式必须与 server 的 REST API 保持一致
- FR-4: 必须支持异步操作和错误传播
- FR-5: 文件上传/下载等特殊端点需要特别处理（使用 Electron 的 dialog API）
- FR-6: 所有端点必须支持取消操作（AbortSignal）

## 非目标

- 不修改 web 层的 API 调用代码（保持使用 HTTP 风格）
- 不引入新的通信协议（继续使用现有的 IPC 机制）
- 不实现 server 特有的功能（如多用户并发、集群模式）
- 不修改数据库核心逻辑（复用现有服务层）

## 技术考量

### 当前架构
- `apps/client/src/main/ipc-router.ts` - IPC 路由主文件
- `apps/client/src/preload/` - 预加载脚本，暴露 API 给渲染进程
- `apps/web/src/services/` - web 层服务，检测环境使用 HTTP 或 IPC

### 实现策略
1. 在 `ipc-router.ts` 中补充缺失的处理器
2. 复用 server 层的 controller 逻辑（通过 `@mancedb/lancedb-core`）
3. 使用 `routing-controllers` 的装饰器元数据自动生成路由映射（可选优化）

### 依赖关系
- `@mancedb/lancedb-core` - 数据库服务
- `@mancedb/dto` - DTO 类型定义
- `electron` - IPC 通信

## 成功指标

- Electron 客户端不再出现 "Endpoint not implemented" 错误
- 所有连接管理功能在 Electron 模式下正常工作
- 所有表管理功能在 Electron 模式下正常工作
- 所有查询功能在 Electron 模式下正常工作
- 单元测试覆盖率达到 80% 以上（针对新增 IPC 处理器）

## 待解决问题

1. 是否需要为 IPC 层编写独立的测试？还是复用 server 的集成测试？
2. 大型结果集的分页/流式传输如何处理？
3. 长时间运行的查询（如大规模向量搜索）的进度反馈机制？
4. 本地文件系统访问权限（S3 vs 本地路径）的处理策略？

## 端点清单（调研后填写）

| 类别 | HTTP 方法 | 路径 | 状态 | 优先级 |
|------|-----------|------|------|--------|
| 连接 | POST | /api/v1/connections | ❌ 缺失 | P0 |
| 连接 | GET | /api/v1/connections | ❌ 缺失 | P0 |
| 连接 | GET | /api/v1/connections/:id | ❌ 缺失 | P0 |
| 连接 | PUT | /api/v1/connections/:id | ❌ 缺失 | P0 |
| 连接 | DELETE | /api/v1/connections/:id | ❌ 缺失 | P0 |
| 连接 | POST | /api/v1/connections/:id/test | ❌ 缺失 | P0 |
| 数据库 | GET | /api/v1/database/tables | ❌ 缺失 | P0 |
| 数据库 | GET | /api/v1/database/tables/:name/schema | ❌ 缺失 | P0 |
| ... | ... | ... | ... | ... |

*注：此清单需要在 US-001 完成后补充完整*
