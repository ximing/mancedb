# PRD: LanceDB 代码重构与共享核心包

## Introduction

当前项目中 `apps/client` 使用已弃用的 `vectordb` 包，而 `apps/server` 使用新的 `@lancedb/lancedb` 包。两个应用中存在大量重复的数据库操作代码（类型定义、过滤构建、Arrow 类型映射等）。本 PRD 旨在通过创建共享的 `packages/lancedb-core` 包来统一代码，升级 client 到新的 LanceDB 包，并支持 S3 远程存储。

## Goals

- 创建 `packages/lancedb-core` 共享包，封装所有 LanceDB 核心操作
- 将 `apps/client` 从 `vectordb` 迁移到 `@lancedb/lancedb`
- 统一 client 和 server 的数据库服务架构（都采用 DI 模式）
- 为 Electron client 添加 S3 远程存储支持
- 消除代码重复，统一类型定义和工具函数
- 简化项目结构，使 client/server 只保留载体相关的差异化代码

## User Stories

### US-001: 创建 lancedb-core 共享包

**Description:** 作为开发者，我需要一个共享的 LanceDB 核心包，这样 client 和 server 可以复用相同的数据库操作逻辑。

**Acceptance Criteria:**
- [ ] 创建 `packages/lancedb-core` 目录结构
- [ ] 配置 package.json，导出核心模块
- [ ] 配置 TypeScript 编译和构建流程
- [ ] 添加 `@lancedb/lancedb` 作为依赖
- [ ] 配置 workspace 引用，使 client/server 可以导入
- [ ] Typecheck/lint passes

### US-002: 迁移共享类型定义到 dto 包

**Description:** 作为开发者，我需要统一类型定义，避免在多个地方重复定义相同的接口。

**Acceptance Criteria:**
- [ ] 将 `TableInfo`, `ColumnInfo`, `DatabaseInfo`, `TableSchema` 迁移到 `packages/dto`
- [ ] 将 `FilterCondition`, `TableDataResult` 迁移到 `packages/dto`
- [ ] 统一并标准化所有 DTO 命名和结构
- [ ] 更新 server 导入路径，使用 `packages/dto`
- [ ] 更新 client 导入路径，使用 `packages/dto`
- [ ] 更新 web 导入路径，使用 `packages/dto`
- [ ] Typecheck passes

### US-003: 提取共享工具函数到 lancedb-core

**Description:** 作为开发者，我需要复用过滤构建、Arrow 类型映射等工具函数。

**Acceptance Criteria:**
- [ ] 提取 `buildFilterString()` / `buildWhereClause()` 工具函数
- [ ] 提取 Arrow 类型到显示类型的映射函数
- [ ] 提取向量检测函数 `isVector()`
- [ ] 提取行处理函数 `processRow()`（向量/二进制截断）
- [ ] 提取表大小估算函数 `estimateTableSize()`
- [ ] 添加完整的单元测试覆盖
- [ ] Typecheck passes

### US-004: 在 lancedb-core 中实现核心 LanceDB 服务

**Description:** 作为开发者，我需要一个抽象的核心 LanceDB 服务，支持本地和 S3 存储。

**Acceptance Criteria:**
- [ ] 实现 `ConnectionManager` 类，管理数据库连接（单例模式）
- [ ] 实现 `TableManager` 类，封装表操作（CRUD、查询）
- [ ] 实现 `SchemaManager` 类，处理 Arrow schema 解析
- [ ] 实现 `QueryEngine` 类，支持 SQL 执行和过滤查询
- [ ] 支持本地文件系统存储
- [ ] 支持 S3 远程存储（使用 AWS 凭证）
- [ ] 实现连接配置加密/解密（复用 server 现有逻辑）
- [ ] 所有类使用 TypeDI 装饰器支持依赖注入
- [ ] Typecheck passes

### US-005: 重构 server 使用 lancedb-core

**Description:** 作为开发者，我需要让 server 使用共享的 lancedb-core 包，移除重复代码。

**Acceptance Criteria:**
- [ ] 重构 `apps/server/src/sources/lancedb.ts` 使用 `ConnectionManager`
- [ ] 重构 `apps/server/src/services/database.service.ts` 使用 `TableManager`
- [ ] 重构 `apps/server/src/services/table.service.ts` 使用 `SchemaManager` 和 `QueryEngine`
- [ ] 重构 `apps/server/src/services/query.service.ts` 使用 `QueryEngine`
- [ ] 删除重复的工具函数，改为从 `lancedb-core` 导入
- [ ] 更新类型导入，从 `packages/dto` 导入
- [ ] Server 所有 API 正常工作（功能无回归）
- [ ] Typecheck passes

### US-006: 重构 client 使用 lancedb-core 并升级 @lancedb/lancedb

**Description:** 作为开发者，我需要将 client 从 `vectordb` 升级到 `@lancedb/lancedb`，并使用共享包。

**Acceptance Criteria:**
- [ ] 从 client 移除 `vectordb` 依赖
- [ ] 在 client 添加 `@lancedb/lancedb` 和 `lancedb-core` 依赖
- [ ] 重构 `apps/client/src/main/services/lancedb.service.ts` 使用 `lancedb-core`
- [ ] 重构 `apps/client/src/main/ipc-router.ts` 适配新的服务调用方式
- [ ] 更新类型导入，从 `packages/dto` 导入
- [ ] Client 所有功能正常工作（本地数据库连接、查询、表操作）
- [ ] Typecheck passes

### US-007: 为 client 添加 S3 存储支持

**Description:** 作为用户，我希望 Electron 客户端也能连接 S3 上的远程 LanceDB 数据库。

**Acceptance Criteria:**
- [ ] 在 client 添加 AWS SDK 依赖
- [ ] 实现连接配置对话框（支持输入 S3 bucket、region、access key 等）
- [ ] 实现凭证安全存储（使用 Electron safeStorage）
- [ ] 更新 IPC 接口支持远程连接配置
- [ ] UI 支持切换本地文件和 S3 连接模式
- [ ] 连接 S3 数据库后，所有功能与本地一致
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: 统一 client 的 DI 架构

**Description:** 作为开发者，我需要 client 使用与 server 一致的依赖注入架构。

**Acceptance Criteria:**
- [ ] 在 client 添加 `typedi` 依赖
- [ ] 创建 `apps/client/src/main/container.ts` 配置 DI 容器
- [ ] 将 `lancedb.service.ts` 改为 TypeDI Service 类
- [ ] 更新 `ipc-router.ts` 从 DI 容器获取服务实例
- [ ] 更新 `main.ts` 初始化 DI 容器
- [ ] 确保 DI 生命周期管理正确（单例/请求级）
- [ ] Typecheck passes

### US-009: 验证 client 和 server 功能一致性

**Description:** 作为开发者，我需要确保重构后 client 和 server 功能完全一致。

**Acceptance Criteria:**
- [ ] 对比 client 和 server 的 API 端点，确保功能覆盖一致
- [ ] 测试 client 本地数据库的所有操作（连接、查询、CRUD）
- [ ] 测试 server 本地和 S3 数据库的所有操作
- [ ] 确保错误处理和响应格式一致
- [ ] 确保性能无显著下降
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

### Core Package (packages/lancedb-core)

- **FR-1:** `ConnectionManager` 必须支持本地文件路径和 S3 URI 两种连接方式
- **FR-2:** `ConnectionManager` 必须使用单例模式，避免重复创建连接
- **FR-3:** `TableManager` 必须提供完整的 CRUD 操作（create, read, update, delete）
- **FR-4:** `TableManager` 必须支持表重命名、添加/删除列
- **FR-5:** `SchemaManager` 必须正确解析 Arrow schema，返回标准化的 `ColumnInfo[]`
- **FR-6:** `QueryEngine` 必须支持过滤查询（使用 `table.query().where()` API）
- **FR-7:** `QueryEngine` 必须支持基本的 SQL SELECT 执行
- **FR-8:** 所有核心类必须兼容 TypeDI，支持依赖注入

### Server (apps/server)

- **FR-9:** Server 必须使用 `lancedb-core` 进行所有 LanceDB 操作
- **FR-10:** Server 必须保留 HTTP API 层（路由、认证、请求处理）
- **FR-11:** Server 必须保留多连接管理（支持配置多个数据库连接）
- **FR-12:** Server 必须保留迁移系统（如果存在）

### Client (apps/client)

- **FR-13:** Client 必须完全移除 `vectordb` 依赖
- **FR-14:** Client 必须使用 `@lancedb/lancedb` 和 `lancedb-core`
- **FR-15:** Client 必须支持本地文件数据库（保持现有功能）
- **FR-16:** Client 必须支持 S3 远程数据库（新增功能）
- **FR-17:** Client 必须使用 TypeDI 进行依赖管理
- **FR-18:** Client 必须保留 IPC 桥接层（renderer 到 main 的通信）
- **FR-19:** Client 必须实现凭证的安全存储（使用 Electron safeStorage）

### Shared DTOs (packages/dto)

- **FR-20:** 所有共享类型必须定义在 `packages/dto`
- **FR-21:** DTO 必须包含完整的 TypeScript 类型定义
- **FR-22:** DTO 结构必须兼容 JSON 序列化（用于 IPC 和 HTTP）

## Non-Goals (Out of Scope)

- 不修改 `apps/web` 的 UI 组件逻辑（除非必要的类型导入更新）
- 不添加新的查询功能（如复杂 JOIN、聚合查询等），保持现有功能范围
- 不修改数据库底层存储格式或数据模型
- 不改变现有的 API 路由结构（server）和 IPC 接口（client）
- 不实现自动迁移工具（手动迁移代码依赖）
- 不支持除 S3 以外的其他云存储（如 GCS、Azure Blob）

## Design Considerations

### 架构图

```
┌─────────────────┐     ┌─────────────────┐
│   apps/client   │     │   apps/server   │
│   (Electron)    │     │   (Express)     │
├─────────────────┤     ├─────────────────┤
│  IPC Router     │     │  HTTP Routes    │
│  DI Container   │     │  DI Container   │
│  SafeStorage    │     │  Auth/Middleware│
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌─────────────────┐│
         └────┤ packages/dto    │┘
              │ (Shared Types)  │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │lancedb- │   │lancedb- │   │lancedb- │
    │  core   │   │  core   │   │  core   │
    │Connection│   │  Table  │   │  Query  │
    │ Manager │   │ Manager │   │ Engine  │
    └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
              ┌────────┴────────┐
              │ @lancedb/lancedb │
              └─────────────────┘
```

### 依赖关系

```
packages/dto (基础类型)
    ↑
packages/lancedb-core (核心实现) → @lancedb/lancedb
    ↑
apps/client, apps/server (应用层)
```

### 文件结构

```
packages/
├── dto/
│   └── src/
│       ├── database.dto.ts      # DatabaseInfo, TableInfo
│       ├── table.dto.ts         # ColumnInfo, TableSchema
│       ├── query.dto.ts         # FilterCondition, TableDataResult
│       └── index.ts
└── lancedb-core/
    └── src/
        ├── connection/
        │   └── connection-manager.ts
        ├── table/
        │   └── table-manager.ts
        ├── schema/
        │   └── schema-manager.ts
        ├── query/
        │   └── query-engine.ts
        ├── utils/
        │   ├── filter-builder.ts
        │   ├── arrow-mapper.ts
        │   └── row-processor.ts
        └── index.ts
```

## Technical Considerations

### 依赖版本

- `@lancedb/lancedb`: ^0.26.2（与 server 当前版本一致）
- `typedi`: ^0.10.0（server 当前版本）
- `reflect-metadata`: ^0.1.13（DI 所需）

### Electron 安全考虑

- AWS 凭证必须使用 Electron 的 `safeStorage` API 加密存储
- 凭证只在主进程解密，不传递到渲染进程
- S3 连接配置需要用户确认，防止意外连接

### 兼容性

- `vectordb` 和 `@lancedb/lancedb` 的 API 有差异，需要适配：
  - `vectordb.connect(path)` → `@lancedb/lancedb.connect(path)`
  - `table.search()` 非向量查询方式改变
  - Arrow 类型处理方式可能不同

### 性能

- `lancedb-core` 中的 `ConnectionManager` 需要实现表级别的缓存
- S3 连接需要考虑延迟，可能需要增加超时配置

## Success Metrics

- 代码重复率降低：client 和 server 中不再有重复的工具函数
- 包大小：`vectordb` 被移除，`@lancedb/lancedb` 在两个应用中共享
- 构建时间：无显著增加
- 功能一致性：client 和 server 的 API 覆盖率达到 100% 一致
- 类型安全：所有 DTO 都有完整 TypeScript 类型定义

## Open Questions

1. Server 中的数据库迁移系统是否需要保留在 server 中，还是也移到 `lancedb-core`？
2. Client 的 S3 连接配置是否需要同步到 server 的连接管理系统？
3. `packages/dto` 和 `packages/lancedb-core` 是否应该合并为一个包？
4. 是否需要保持向后兼容，即重构期间是否可以保持部分功能先用旧代码运行？
