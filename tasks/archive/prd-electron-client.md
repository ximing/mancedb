# PRD: Electron Desktop Client for LanceDB Admin

## Introduction

为 LanceDB Admin 提供桌面客户端支持，基于 Electron 构建跨平台应用。客户端将复用现有 Web 端的完整代码，同时提供原生桌面能力，包括本地文件系统访问和直接操作 LanceDB 数据库的能力。用户可以选择连接远程服务或通过原生模块直接操作本地数据库。

## Goals

- 提供 macOS/Windows/Linux 三平台的桌面客户端
- 复用 apps/web 现有代码，保持一致的用户体验
- 支持本地文件系统浏览和数据库路径选择
- 支持两种工作模式：远程服务模式和原生本地模式
- 生成可独立分发的桌面应用程序

## User Stories

### US-001: 创建 Electron 基础项目结构
**Description:** 作为开发者，我需要在 apps/client 目录下建立 Electron 项目，为桌面客户端提供基础架构。

**Acceptance Criteria:**
- [ ] 在 apps/client 创建完整的 Electron 项目结构（main, preload, renderer）
- [ ] 配置 TypeScript 支持
- [ ] 配置 Vite 作为构建工具
- [ ] 配置 ESLint 和 Prettier
- [ ] 添加开发启动脚本（hot reload）
- [ ] 类型检查通过

### US-002: 集成 Web 应用到 Electron
**Description:** 作为用户，我希望桌面客户端与 Web 端有完全一致的用户界面和体验。

**Acceptance Criteria:**
- [ ] Electron 成功加载 apps/web 的构建产物
- [ ] 复用 apps/web 的所有组件、样式和路由
- [ ] 确保所有 Web 端功能在 Electron 中正常工作
- [ ] 处理文件系统路径和路由的兼容性
- [ ] 类型检查通过
- [ ] 使用 dev-browser skill 验证界面渲染正常

### US-003: 实现 Web 项目 Electron 适配改造
**Description:** 作为开发者，我需要改造 apps/web 项目，使其能同时支持浏览器和 Electron 环境。

**Acceptance Criteria:**
- [ ] 添加 Electron 环境检测工具函数
- [ ] API 客户端支持两种模式：HTTP 请求（远程模式）和 IPC 调用（本地模式）
- [ ] 配置运行时环境变量区分 electron/server 模式
- [ ] 确保 Web 端在浏览器环境行为不变
- [ ] 类型检查通过

### US-004: 实现本地文件系统访问
**Description:** 作为用户，我希望通过原生对话框浏览和选择本地数据库文件夹。

**Acceptance Criteria:**
- [ ] 实现 IPC 通道：打开文件夹选择对话框
- [ ] 在 UI 中添加"打开本地数据库"按钮（Electron 环境显示）
- [ ] 支持选择文件夹路径并传递给后端
- [ ] 处理无权限/路径不存在等错误情况
- [ ] 类型检查通过
- [ ] 使用 dev-browser skill 验证对话框正常工作

### US-005: 实现原生 LanceDB 连接模式
**Description:** 作为用户，我希望 Electron 能直接操作本地 LanceDB 数据库，无需启动后端服务。

**Acceptance Criteria:**
- [ ] 在 Electron main 进程集成 LanceDB Node.js SDK
- [ ] 实现 IPC API 映射层（复用现有 HTTP API 接口定义）
- [ ] 支持的操作：连接数据库、获取表列表、查询数据、创建/删除表
- [ ] 错误处理：数据库不存在、格式错误、权限问题
- [ ] 类型检查通过

### US-006: 实现连接模式切换 UI
**Description:** 作为用户，我希望在应用启动时选择工作模式：连接远程服务或直接打开本地数据库。

**Acceptance Criteria:**
- [ ] 添加启动模式选择界面（远程服务 / 本地数据库）
- [ ] 远程模式：输入服务器地址和端口
- [ ] 本地模式：打开文件夹选择对话框
- [ ] 记住上次选择的模式/地址
- [ ] 类型检查通过
- [ ] 使用 dev-browser skill 验证界面和交互

### US-007: 配置跨平台打包
**Description:** 作为开发者，我需要配置 Electron Builder 生成各平台的安装包。

**Acceptance Criteria:**
- [ ] 配置 electron-builder
- [ ] 支持 macOS (.dmg, .zip)
- [ ] 支持 Windows (.exe, .msi)
- [ ] 支持 Linux (.AppImage, .deb)
- [ ] 配置应用图标和元数据
- [ ] 构建流程能在 CI 中运行
- [ ] 类型检查通过

### US-008: 添加系统集成特性
**Description:** 作为用户，我希望客户端有原生应用的体验（菜单、快捷键、托盘等）。

**Acceptance Criteria:**
- [ ] 配置应用菜单（macOS: 顶部菜单栏，Windows/Linux: 窗口菜单）
- [ ] 支持键盘快捷键（刷新、切换开发者工具等）
- [ ] 窗口状态管理（记住大小和位置）
- [ ] 处理多实例启动（单实例锁定）
- [ ] 添加 Dock/任务栏图标
- [ ] 类型检查通过

### US-009: 实现自动更新检查
**Description:** 作为用户，我希望客户端能检查并提示新版本更新。

**Acceptance Criteria:**
- [ ] 集成 electron-updater
- [ ] 启动时检查更新
- [ ] 发现新版本时显示提示对话框
- [ ] 支持手动检查更新菜单项
- [ ] 类型检查通过

## Functional Requirements

- FR-1: Electron 应用启动时加载 apps/web 的渲染进程
- FR-2: 提供两种数据源模式：
  - 远程模式：通过 HTTP API 连接 LanceDB Admin 服务
  - 本地模式：通过 IPC 调用直接使用 Node.js LanceDB SDK
- FR-3: 实现原生文件对话框用于选择数据库目录
- FR-4: 复用现有 HTTP API 接口定义，映射为 IPC 调用
- FR-5: Web 项目支持运行时检测 Electron 环境并适配行为
- FR-6: 生成 macOS/Windows/Linux 平台的可执行文件和安装包
- FR-7: 应用菜单包含：文件（打开数据库）、视图（刷新、开发者工具）、帮助
- FR-8: 实现单实例锁定，多次启动只激活已有窗口

## Non-Goals

- 不实现无窗口的纯后台服务模式
- 不支持直接编辑 LanceDB 的底层存储文件
- 不实现与其他数据库类型的连接（如 SQLite、PostgreSQL）
- 不实现自动下载安装更新（仅提示，手动下载）
- 不修改现有 apps/server 的代码（保持独立运行能力）
- 不实现多数据库同时连接

## Technical Considerations

### 架构设计

```
apps/client/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 入口
│   │   ├── window.ts   # 窗口管理
│   │   ├── ipc/        # IPC 处理器
│   │   │   ├── fs.ts   # 文件系统相关
│   │   │   └── lancedb.ts  # 原生 LanceDB 操作
│   │   └── menu.ts     # 应用菜单
│   ├── preload/        # 预加载脚本
│   │   └── index.ts    # 暴露安全的 API
│   └── renderer/       # 渲染进程（复用 apps/web）
├── package.json
├── electron-builder.json5
└── vite.config.ts
```

### 工作模式切换

- **远程模式**：Renderer 使用现有 HTTP 客户端，连接指定服务器
- **本地模式**：Renderer 通过 IPC 调用 Main 进程的 LanceDB 操作

### IPC API 映射

保持与现有 HTTP API 相同的接口签名：
- `lancedb:connect` → POST /api/lancedb/connect
- `lancedb:tables` → GET /api/lancedb/:uri/tables
- `lancedb:query` → POST /api/lancedb/:uri/query
- etc.

### Web 项目适配点

1. 创建 `apps/web/src/utils/electron.ts`：
   - `isElectron()` 环境检测
   - `getApiClient()` 根据环境返回 HTTP 或 IPC 客户端

2. 修改 `apps/web/src/api/lancedb.ts`：
   - 使用抽象接口而非直接 fetch

3. 添加环境变量 `VITE_RUNTIME_MODE=electron|server`

## Dependencies

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "lancedb": "^0.9.0"
  },
  "devDependencies": {
    "electron-builder": "^24.9.0",
    "electron-vite": "^2.0.0",
    "vite": "^5.0.0"
  }
}
```

## Success Metrics

- 成功构建 macOS/Windows/Linux 三平台安装包
- 代码复用率：Web UI 代码 100% 复用
- 本地模式启动时间 < 3 秒（无需启动 HTTP 服务）
- 所有 Web 端功能在 Electron 中正常工作

## Open Questions

- 是否需要支持 LanceDB 的异步写入功能？
- 本地模式是否需要支持多个数据库目录的快速切换？
- 是否需要实现最近打开的数据库历史记录？
- macOS 是否需要签名和公证（notarization）？
