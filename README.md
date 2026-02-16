# 🚀 LanceDB Admin - LanceDB 数据库管理工具

[![CI](https://github.com/ximing/mancedb/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ximing/mancedb/actions/workflows/ci.yml)
[![Docker Build and Publish](https://github.com/ximing/mancedb/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/ximing/mancedb/actions/workflows/docker-publish.yml)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-BSL%201.1-blue)
![GitHub repo size](https://img.shields.io/github/repo-size/ximing/mancedb?color=green)
![GitHub last commit](https://img.shields.io/github/last-commit/ximing/mancedb?color=blue)

一个现代化的 LanceDB 数据库管理工具，提供类似 Navicat 的 Web 管理界面，支持连接管理、表浏览、SQL 查询等功能。

## 📋 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [配置指南](#配置指南)
- [API 文档](#api-文档)
- [常见问题](#常见问题)
- [许可证](#许可证)

## 项目简介

**LanceDB Admin** 是一个全栈 Web 应用，为 LanceDB 向量数据库提供直观的管理界面。它支持多种连接方式（本地/S3）、表结构管理、数据浏览、SQL 查询等功能。

### 🎯 使用场景

- 🗄️ **数据库管理**：管理多个 LanceDB 数据库连接
- 📊 **表结构查看**：查看表 Schema、列信息、向量维度
- 🔍 **数据浏览**：分页浏览表数据，支持过滤和排序
- 📝 **SQL 查询**：执行 LanceDB SQL 查询，查看历史记录
- 🔧 **表结构修改**：添加/删除列，重命名/删除表
- ⚡ **数据操作**：删除单条或多条记录

## 核心功能

### ✨ 连接管理

- ✅ **多连接支持** - 保存和管理多个数据库连接
- ✅ **连接类型** - 支持本地路径和 S3 存储
- ✅ **安全认证** - 每个连接独立的用户名密码认证
- ✅ **连接测试** - 测试连接是否可用
- ✅ **S3 支持** - 支持 AWS S3、MinIO、阿里云 OSS 等

### 📊 表管理

- ✅ **表列表** - 查看所有表及其行数、大小
- ✅ **表结构** - 查看详细 Schema，包括列类型、向量维度
- ✅ **创建表** - 通过 SQL 创建新表
- ✅ **重命名表** - 修改表名称
- ✅ **删除表** - 安全删除表（需确认）

### 🔍 数据浏览

- ✅ **分页浏览** - 支持 50/100/200 条每页
- ✅ **列过滤** - 按条件过滤数据
- ✅ **列排序** - 点击表头排序
- ✅ **向量显示** - 向量列显示维度摘要
- ✅ **JSON 详情** - 点击查看完整行数据
- ✅ **数据删除** - 支持单条和批量删除

### 📝 SQL 查询

- ✅ **SQL 编辑器** - 支持语法高亮和格式化
- ✅ **查询执行** - 执行 SELECT 查询
- ✅ **结果展示** - 表格形式展示查询结果
- ✅ **查询历史** - 保存最近 20 条查询记录
- ✅ **数据导出** - 导出结果为 CSV 或 JSON
- ✅ **快捷操作** - Cmd/Ctrl+Enter 快速执行

### 🔧 结构修改

- ✅ **添加列** - 支持多种 Arrow 类型（int64, float64, string, binary, vector）
- ✅ **删除列** - 删除不需要的列
- ✅ **向量列** - 支持指定向量维度

## 技术栈

### 后端

- 🏗️ **Node.js 20** + **Express** - 服务端框架
- 🗄️ **LanceDB** - 向量数据库
- 📝 **TypeScript** - 类型安全
- 🧩 **routing-controllers** - 装饰器路由
- 💉 **TypeDI** - 依赖注入

### 前端

- ⚡ **React 19** - 最新 React 版本
- 🎨 **Tailwind CSS** - Utility-first CSS
- 🔄 **@rabjs/react** - 响应式状态管理
- 🗂️ **React Router** - 客户端路由
- 📡 **Axios** - HTTP 客户端
- 🎭 **Lucide React** - 图标库

## 快速开始

### 前置要求

- **Node.js** >= 20.0
- **pnpm** >= 10.0
- **Docker** (可选，用于容器化部署)

### 本地开发

#### 1️⃣ 克隆项目

```bash
git clone https://github.com/your-org/mancedb.git
cd mancedb
```

#### 2️⃣ 安装依赖

```bash
pnpm install
```

#### 3️⃣ 配置环境变量（可选）

```bash
cp .env.example .env
# 编辑 .env 文件（如需自定义配置）
```

**基础环境变量：**

```env
CORS_ORIGIN=http://localhost:3000
```

> **注意**：从最新版本开始，应用已移除用户认证系统，无需配置 `JWT_SECRET`，打开应用后可直接使用。

#### 4️⃣ 启动开发服务器

```bash
# 同时启动后端和前端
pnpm dev

# 或者分别启动
pnpm dev:server  # 后端 (http://localhost:3000)
pnpm dev:web     # 前端 (http://localhost:5173)
```

#### 5️⃣ 访问应用

打开浏览器访问：http://localhost:3000

### 常用开发命令

```bash
# 构建应用
pnpm build                # 构建前后端
pnpm build:web            # 只构建前端
pnpm build:server         # 只构建后端

# 代码检查
pnpm lint                 # ESLint 检查
pnpm lint:fix             # 自动修复

# 代码格式化
pnpm format               # Prettier 格式化
```

## Docker 部署

### 📦 预构建镜像

```bash
# 拉取镜像
docker pull ghcr.io/ximing/mancedb:stable
```

### 🏗️ 快速部署

#### 方式 1: Docker Compose (推荐)

```bash
# 1. 克隆项目
git clone https://github.com/your-org/mancedb.git
cd mancedb

# 2. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件（如需自定义配置）

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f app

# 5. 停止服务
docker-compose down
```

#### 方式 2: Docker Run

```bash
# 运行容器
docker run -d \
  -p 3000:3000 \
  --name lancedb-admin \
  -e CORS_ORIGIN=http://localhost:3000 \
  -v $(pwd)/data/lancedb:/app/lancedb_data \
  --restart unless-stopped \
  ghcr.io/ximing/mancedb:stable

# 查看日志
docker logs -f lancedb-admin
```

#### 方式 3: 从源码构建

```bash
# 构建镜像
docker build -t lancedb-admin:latest .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name lancedb-admin \
  lancedb-admin:latest
```

### 🔧 环境变量配置

详见 [ENVIRONMENT.md](./ENVIRONMENT.md) 文档。

**基础配置：**

```env
CORS_ORIGIN=http://localhost:3000
```

> **注意**：用户认证系统已移除，无需配置 `JWT_SECRET`。

**可选配置：**

```env
# 本地化
LOCALE_LANGUAGE=zh-cn
LOCALE_TIMEZONE=Asia/Shanghai

# LanceDB
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data
```

### 数据持久化

必须挂载数据卷以持久化数据：

```yaml
volumes:
  - ./data/lancedb:/app/lancedb_data
```

### 健康检查

应用提供健康检查端点：

```bash
curl http://localhost:3000/api/v1/health
```

## 配置指南

### 连接配置

1. **本地连接**
   - 类型：Local
   - 路径：LanceDB 数据目录路径
   - 用户名/密码：自定义认证信息

2. **S3 连接**
   - 类型：S3
   - Bucket：S3 存储桶名称
   - Region：AWS 区域
   - Access Key / Secret Key：S3 凭证
   - Endpoint：可选，用于 MinIO 等兼容服务

### 安全建议

1. **CORS_ORIGIN**：明确指定允许的域名
2. **数据备份**：定期备份 `lancedb_data` 目录
3. **HTTPS**：生产环境使用 HTTPS 反向代理
4. **访问控制**：建议通过防火墙或 VPN 限制访问

> **注意**：用户认证系统已移除，建议通过 HTTPS 和访问控制保护应用安全。

## API 文档

### 认证

> **注意**：用户认证系统已移除，所有 API 无需认证即可访问。

### 主要端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/health` | GET | 健康检查 |
| `/api/v1/connections` | GET/POST | 连接列表/创建 |
| `/api/v1/connections/:id` | GET/PUT/DELETE | 连接详情/更新/删除 |
| `/api/v1/connections/:id/test` | POST | 测试连接 |
| `/api/v1/auth/connections/login` | POST | 连接登录 |
| `/api/v1/database/tables` | GET | 获取表列表 |
| `/api/v1/tables/:name/schema` | GET | 获取表结构 |
| `/api/v1/tables/:name/data` | GET | 获取表数据 |
| `/api/v1/tables/:name/columns` | POST | 添加列 |
| `/api/v1/query` | POST | 执行 SQL |
| `/api/v1/query/history` | GET | 查询历史 |

## 常见问题

### Q: 如何保护应用安全？

A: 由于用户认证系统已移除，建议通过以下方式保护应用：
   - 使用 HTTPS 反向代理
   - 配置防火墙限制访问 IP
   - 在私有网络或 VPN 内部署

### Q: 支持哪些 SQL 语法？

A: 支持 LanceDB SQL 子集：SELECT, WHERE, ORDER BY, LIMIT。不支持 INSERT/UPDATE/DELETE（请使用 SDK）。

### Q: 如何备份数据？

A: 直接备份挂载的 `lancedb_data` 目录即可。

### Q: 支持哪些 S3 服务？

A: 支持 AWS S3、MinIO、阿里云 OSS、腾讯云 COS 等 S3 兼容服务。

### Q: 向量列如何显示？

A: 向量列显示为维度摘要（如 `[1536-dim vector]`），点击行可查看完整数据。

## 许可证

**Business Source License (BSL 1.1)** - 查看 [LICENSE](./LICENSE) 文件详情

### 许可证说明

- ✅ **个人使用** - 允许
- ✅ **非商业用途** - 允许
- ✅ **内部使用** - 允许
- ❌ **商业服务/SaaS** - 需要商业许可

如需商业许可，请联系：morningxm@hotmail.com

## 支持与反馈

- 📧 邮件：morningxm@hotmail.com
- 🐛 Issue：https://github.com/ximing/mancedb/issues
- 💬 讨论：https://github.com/ximing/mancedb/discussions
