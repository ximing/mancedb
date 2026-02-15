# PRD: LanceDB 数据库管理工具 (Navicat-like)

## 1. Introduction

一个基于 Web 的 LanceDB 数据库管理工具，类似于 Navicat，允许用户通过浏览器连接、管理和查询 LanceDB 数据库。支持本地文件和远程存储（S3）的 LanceDB 实例，提供表结构查看、数据浏览、SQL 查询执行等核心数据库管理功能。

## 2. Goals

- 支持多种 LanceDB 连接方式（本地路径、S3 存储）
- 提供直观的表结构可视化界面
- 支持 LanceDB SQL 子集的查询执行
- 允许表结构修改（增删列、修改类型、删除/重命名表）
- 支持保存和管理多个数据库连接配置
- 以单 Docker 镜像形式交付，便于部署

## 3. User Stories

### US-001: 数据库连接管理（多连接支持）
**Description:** 作为用户，我希望保存多个 LanceDB 数据库连接配置，方便快速切换不同的数据库。

**Acceptance Criteria:**
- [ ] 连接列表页面显示所有已保存的连接（名称、类型、最后连接时间）
- [ ] 支持添加新连接：本地路径 或 S3 配置（bucket、region、accessKey、secretKey）
- [ ] 每个连接可配置认证信息（用户名、密码）
- [ ] 支持编辑和删除已保存的连接
- [ ] 支持测试连接（验证配置是否正确）
- [ ] 点击连接直接进入该数据库的管理界面
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: 登录认证页面
**Description:** 作为用户，当我选择一个已保存的连接时，需要输入该数据库的用户名密码进行认证。

**Acceptance Criteria:**
- [ ] 连接选择后显示登录表单（用户名、密码）
- [ ] 密码输入框支持显示/隐藏切换
- [ ] 登录失败显示错误提示
- [ ] 登录成功后进入主管理界面
- [ ] JWT Token 存储在内存中（刷新页面需重新登录）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: 数据库概览仪表盘
**Description:** 作为用户，我希望登录后看到一个概览页面，了解数据库的基本信息和所有表。

**Acceptance Criteria:**
- [ ] 左侧导航栏显示数据库名称和表列表
- [ ] 主区域显示数据库统计信息（表数量、总记录数、存储大小）
- [ ] 点击表名可直接查看该表数据
- [ ] 支持刷新按钮重新加载表列表
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: 表结构查看（Schema Viewer）
**Description:** 作为用户，我希望查看表的详细结构，包括列名、数据类型、是否可为空等信息。

**Acceptance Criteria:**
- [ ] Schema 页面显示所有列的详细信息：名称、Arrow 数据类型、是否可为空
- [ ] 显示向量的维度信息（如果是向量列）
- [ ] 显示表的元数据（创建时间、行数、文件大小）
- [ ] 支持切换到数据浏览标签页
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: 表数据浏览（Data Browser）
**Description:** 作为用户，我希望以表格形式浏览表中的数据，支持分页和排序。

**Acceptance Criteria:**
- [ ] 以表格形式显示数据，支持横向滚动
- [ ] 向量列显示为维度摘要（如 "[1536-dim vector]"）
- [ ] 支持分页（每页 50/100/200 条可选）
- [ ] 支持按任意列排序（升序/降序）
- [ ] 支持简单的列过滤（文本包含、数值范围）
- [ ] 点击行可查看完整详情（JSON 格式弹窗）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: SQL 查询执行
**Description:** 作为用户，我希望输入 LanceDB SQL 查询语句并执行，查看结果。

**Acceptance Criteria:**
- [ ] SQL 编辑器支持语法高亮
- [ ] 支持执行 SELECT 查询并显示结果表格
- [ ] 显示查询执行时间和返回行数
- [ ] 执行错误时显示友好错误信息
- [ ] 支持查询历史（保存最近执行的 20 条 SQL）
- [ ] 支持将查询结果导出为 CSV/JSON
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: 表结构修改 - 添加/删除列
**Description:** 作为用户，我希望在不删除表的情况下添加新列或删除现有列。

**Acceptance Criteria:**
- [ ] Schema 页面有 "添加列" 按钮
- [ ] 添加列支持选择 Arrow 数据类型（int64, float64, string, binary, fixed_size_list 等）
- [ ] 对于向量列，需要指定维度
- [ ] 删除列需要确认弹窗防止误操作
- [ ] 操作成功/失败都有 Toast 提示
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: 表管理 - 删除/重命名表
**Description:** 作为用户，我希望删除不再需要的表或重命名表。

**Acceptance Criteria:**
- [ ] 表列表支持右键菜单或操作按钮
- [ ] 删除表需要二次确认（输入表名确认）
- [ ] 支持重命名表（检查新名称是否已存在）
- [ ] 操作后自动刷新表列表
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: 数据操作 - 删除记录
**Description:** 作为用户，我希望在数据浏览页面删除单条或多条记录。

**Acceptance Criteria:**
- [ ] 数据表格每行有复选框支持多选
- [ ] 支持按 WHERE 条件批量删除
- [ ] 删除前有确认弹窗
- [ ] 显示删除操作影响的行数
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Docker 镜像构建与部署
**Description:** 作为运维人员，我希望通过单个 Docker 镜像部署整个管理工具。

**Acceptance Criteria:**
- [ ] Dockerfile 多阶段构建，最终镜像体积小
- [ ] 支持环境变量配置（端口、日志级别等）
- [ ] 默认暴露 3000 端口提供服务
- [ ] 包含健康检查端点
- [ ] 镜像可直接通过 docker run 启动
- [ ] 支持 docker-compose 部署

## 4. Functional Requirements

### 连接管理
- **FR-1:** 系统必须支持保存多个数据库连接配置
- **FR-2:** 每个连接配置包含：名称、类型（local/s3）、路径/bucket、认证信息
- **FR-3:** 连接信息必须加密存储（数据库级加密）
- **FR-4:** 系统必须支持测试连接功能，验证配置有效性

### 认证与安全
- **FR-5:** 每个 LanceDB 数据库必须有独立的用户名密码认证
- **FR-6:** 认证成功后返回 JWT Token，后续请求需携带 Token
- **FR-7:** Token 有效期为 24 小时，支持刷新机制
- **FR-8:** 密码必须使用 bcrypt 加密存储

### 表结构管理
- **FR-9:** 系统必须显示所有表的列表，包括行数和大小
- **FR-10:** Schema 视图必须显示：列名、Arrow 类型、nullable、向量维度
- **FR-11:** 支持添加新列，指定类型和属性
- **FR-12:** 支持删除列（LanceDB 限制：只能添加 nullable 列）
- **FR-13:** 支持删除整个表
- **FR-14:** 支持重命名表

### 数据查询
- **FR-15:** SQL 查询编辑器必须支持 LanceDB 的 SQL 子集
- **FR-16:** 支持 SELECT、WHERE、ORDER BY、LIMIT 语法
- **FR-17:** 支持向量搜索查询（通过 SQL 或专用接口）
- **FR-18:** 查询结果以表格形式展示，支持分页
- **FR-19:** 支持导出查询结果为 CSV 或 JSON

### 数据浏览
- **FR-20:** 数据表格支持分页（50/100/200/500 条每页）
- **FR-21:** 支持按列排序
- **FR-22:** 支持简单的过滤条件
- **FR-23:** 向量列显示为摘要而非完整数据
- **FR-24:** 支持查看完整行数据的详情弹窗

### 数据操作
- **FR-25:** 支持按 ID 删除单条记录
- **FR-26:** 支持 WHERE 条件批量删除
- **FR-27:** 删除操作必须有确认机制

## 5. Non-Goals (Out of Scope)

- 不支持创建新的 LanceDB 数据库（只管理现有数据库）
- 不支持插入新记录（LanceDB 主要用于向量检索，插入通常通过程序完成）
- 不支持修改现有记录的数据（同上）
- 不支持复杂的 JOIN 查询（LanceDB 限制）
- 不支持事务管理（LanceDB 不支持传统事务）
- 不支持用户管理（多个登录用户管理同一数据库，只有数据库级认证）
- 不支持数据可视化图表（如 BI 功能）
- 不支持实时数据同步或变更监听

## 6. Design Considerations

### UI 布局
- 左侧固定侧边栏：连接切换、表列表、功能导航
- 顶部工具栏：当前连接信息、刷新按钮、设置
- 主内容区：根据功能显示不同视图

### 视觉风格
- 采用深色主题（适合开发工具）
- 代码/查询编辑器使用等宽字体
- 表格数据使用斑马纹提高可读性
- 状态提示使用颜色编码（成功绿、错误红、警告黄）

### 组件复用
- 复用项目现有的 Table、Modal、Button、Input 组件
- 复用 Toast 通知系统
- 复用 Loading 骨架屏

## 7. Technical Considerations

### 后端架构
- 复用现有的 Express + routing-controllers 架构
- 复用 TypeDI 依赖注入
- 复用现有的 LanceDB 连接层（`sources/lancedb.ts`）

### 数据库设计（管理端自身）
新建表存储管理元数据：

```typescript
// connections 表
interface Connection {
  id: string;
  name: string;
  type: 'local' | 's3';
  // local
  localPath?: string;
  // s3
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;      // 加密存储
  s3SecretKey?: string;      // 加密存储
  s3Endpoint?: string;       // 自定义 S3 端点
  // auth
  dbUsername: string;        // 该数据库的用户名
  dbPasswordHash: string;    // bcrypt 哈希
  // meta
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt?: Date;
}

// query_history 表
interface QueryHistory {
  id: string;
  connectionId: string;
  sql: string;
  executedAt: Date;
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}
```

### API 端点设计

```
POST   /api/v1/auth/login              # 登录获取 JWT
POST   /api/v1/auth/refresh            # 刷新 Token

GET    /api/v1/connections             # 获取连接列表
POST   /api/v1/connections             # 创建连接
GET    /api/v1/connections/:id         # 获取连接详情
PUT    /api/v1/connections/:id         # 更新连接
DELETE /api/v1/connections/:id         # 删除连接
POST   /api/v1/connections/:id/test    # 测试连接

GET    /api/v1/database/info           # 获取当前数据库信息
GET    /api/v1/database/tables         # 获取表列表

GET    /api/v1/tables/:name/schema     # 获取表结构
GET    /api/v1/tables/:name/data       # 获取表数据（分页）
POST   /api/v1/tables/:name/columns    # 添加列
DELETE /api/v1/tables/:name/columns/:col  # 删除列
DELETE /api/v1/tables/:name            # 删除表
PUT    /api/v1/tables/:name/rename     # 重命名表

POST   /api/v1/query                   # 执行 SQL 查询
GET    /api/v1/query/history           # 查询历史
```

### 关键依赖
- 后端复用现有 lancedb 包
- 前端 SQL 编辑器可使用 `@codemirror/lang-sql` 或类似库
- 表格组件可使用 `@tanstack/react-table`

### 安全考虑
- 所有 API 需要 JWT 认证
- 连接配置的敏感字段加密存储
- SQL 查询需要防止注入（使用 LanceDB 的参数化查询）
- 限制查询结果集大小（防止内存溢出）

## 8. Success Metrics

- 用户可以成功添加并测试 LanceDB 连接（本地和 S3）
- 表列表加载时间 < 2 秒（正常规模数据库）
- 数据浏览页面加载 < 3 秒（1000 条以内）
- SQL 查询执行结果正确返回
- Docker 镜像大小 < 500MB
- 单容器部署即可运行，无需额外依赖

## 9. Open Questions

1. 是否需要支持 LanceDB 的向量搜索可视化（如相似度搜索结果的图表展示）？
2. 是否需要支持 LanceDB 的索引管理（查看/创建向量索引）？
3. 对于大型表（百万行以上），是否需要虚拟滚动而非分页？
4. 是否需要支持 LanceDB 的合并操作（compact）？
5. 是否需要深色/浅色主题切换？

## 10. 开发路线图

### Phase 1: 基础框架（Week 1）
- 删除现有项目中不需要的代码（memo、category、attachment 相关）
- 创建管理端数据库表（connections、query_history）
- 搭建新的路由结构和页面框架

### Phase 2: 连接管理（Week 1-2）
- 实现连接 CRUD API
- 实现连接管理前端页面
- 实现登录认证流程

### Phase 3: 表浏览（Week 2）
- 实现表列表和 Schema 查看
- 实现数据浏览（分页表格）
- 实现表结构修改功能

### Phase 4: SQL 查询（Week 3）
- 实现 SQL 编辑器
- 实现查询执行 API
- 实现查询历史和导出

### Phase 5: 表管理（Week 3）
- 实现删除/重命名表
- 实现记录删除功能

### Phase 6: 部署优化（Week 4）
- 完善 Dockerfile
- 优化镜像大小
- 编写部署文档

---

**注意：** 在开始开发前，需要先删除现有项目中与 memo、category、attachment、backup 等相关的代码，只保留基础框架和 LanceDB 连接层。
