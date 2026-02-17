# Electron API 端点映射文档

## 概述

本文档梳理了 Server 端定义的所有 API 端点以及 Electron IPC 层的实现状态。

## Server 端端点清单

### 1. Connection 端点 (`/api/v1/connections`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| POST | `/` | 创建连接 | ❌ 缺失 |
| GET | `/` | 获取所有连接 | ⚠️ 部分实现（返回 mock 数据） |
| GET | `/:id` | 获取单个连接 | ❌ 缺失 |
| PUT | `/:id` | 更新连接 | ❌ 缺失 |
| DELETE | `/:id` | 删除连接 | ❌ 缺失 |
| POST | `/:id/test` | 测试连接 | ⚠️ 部分实现（仅返回成功） |

### 2. Database 端点 (`/api/v1/database`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| GET | `/tables` | 获取表列表 | ✅ 已实现 |
| GET | `/info` | 获取数据库信息 | ✅ 已实现 |

### 3. Table 端点 (`/api/v1/tables`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| GET | `/:name/schema` | 获取表结构 | ✅ 已实现 |
| GET | `/:name/data` | 获取表数据（分页） | ✅ 已实现 |
| POST | `/:name/columns` | 添加列 | ✅ 已实现 |
| DELETE | `/:name/columns/:column` | 删除列 | ✅ 已实现 |
| DELETE | `/:name` | 删除表 | ✅ 已实现 |
| PUT | `/:name/rename` | 重命名表 | ✅ 已实现 |
| DELETE | `/:name/rows` | 批量删除行 | ✅ 已实现 |
| DELETE | `/:name/rows/:id` | 删除单行 | ✅ 已实现 |

### 4. Query 端点 (`/api/v1`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| POST | `/query` | 执行 SQL 查询 | ✅ 已实现 |
| GET | `/query/history` | 获取查询历史 | ⚠️ 部分实现（返回空数组） |

### 5. Auth 端点 (`/api/v1/auth`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| POST | `/register` | 用户注册 | ⚠️ 已废弃（返回错误） |
| POST | `/login` | 用户登录 | ⚠️ 已废弃（返回错误） |
| POST | `/connections/login` | 连接登录 | ⚠️ 已废弃（返回错误） |
| POST | `/connections/refresh` | 刷新 Token | ⚠️ 已废弃（返回错误） |

### 6. User 端点 (`/api/v1/user`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| GET | `/info` | 获取用户信息 | ❌ 缺失 |
| PUT | `/info` | 更新用户信息 | ❌ 缺失 |

### 7. Health 端点 (`/api/v1`)

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| GET | `/health` | 健康检查 | ❌ 缺失 |

### 8. Connection-Auth 端点

| HTTP 方法 | 路径 | 描述 | IPC 状态 |
|-----------|------|------|----------|
| POST | `/api/v1/connection-auth/verify` | 验证连接 | ⚠️ 部分实现（返回 mock） |

## 缺失端点优先级分类

### P0 - 核心功能（必须实现）

1. **POST /api/v1/connections** - 创建连接
2. **GET /api/v1/connections/:id** - 获取单个连接
3. **PUT /api/v1/connections/:id** - 更新连接
4. **DELETE /api/v1/connections/:id** - 删除连接

### P1 - 重要功能（建议实现）

5. **GET /api/v1/health** - 健康检查
6. **GET /api/v1/user/info** - 获取用户信息（返回匿名用户）
7. **PUT /api/v1/user/info** - 更新用户信息（noop）

### P2 - 次要功能（可选实现）

8. **GET /api/v1/connections** - 完善连接列表（从本地存储读取）
9. **POST /api/v1/connections/:id/test** - 完善连接测试
10. **GET /api/v1/query/history** - 查询历史持久化

## 实现建议

### 连接管理
- Electron 模式下使用本地文件存储连接配置（如 `electron-store` 或本地 JSON 文件）
- 复用 `@mancedb/lancedb-core` 中的连接管理逻辑

### 认证相关
- 所有认证端点返回匿名用户或禁用提示（与 Server 保持一致）
- `/api/v1/connection-auth/verify` 始终返回有效

### 错误处理
- 统一使用与 Server 相同的错误码格式
- 保持 `code`, `data`, `message` 的响应结构

## 依赖服务

Electron IPC 层需要以下服务支持：

1. **ConnectionService** - 连接 CRUD 操作（需要新建或使用本地存储）
2. **LanceDBService** - 数据库操作（已存在）
3. **CredentialService** - 凭证管理（已存在）

## 数据结构差异

### Server 模式
- 连接存储在数据库中
- 多用户支持
- 完整的认证流程

### Electron 模式
- 连接存储在本地文件
- 单用户（匿名）
- 认证绕过
