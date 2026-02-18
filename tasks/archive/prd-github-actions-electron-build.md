# PRD: GitHub Actions Electron 多平台构建

## 简介

配置 GitHub Actions CI/CD 工作流，为 Electron 桌面应用构建多平台安装包，支持 macOS (Intel/Apple Silicon)、Linux 和 Windows，并集成自动更新功能。

## 目标

- 每次推送代码时自动构建多平台安装包
- 支持 macOS Intel (x64) 和 Apple Silicon (arm64)
- 支持 Linux (x64) 和 Windows (x64)
- 自动将构建产物上传到 GitHub Release
- 集成 electron-updater 实现自动更新

## 用户故事

### US-001: 创建 GitHub Actions 工作流文件

**描述:** 作为开发者，我需要 GitHub Actions 工作流来自动构建 Electron 应用。

**验收标准:**

- [ ] 创建 `.github/workflows/build-electron.yml` 文件
- [ ] 配置触发条件：push 到任意分支
- [ ] 配置 matrix 构建策略，支持 4 个平台目标
- [ ] 设置 Node.js 20 环境
- [ ] 安装 pnpm 并配置缓存
- [ ] 安装项目依赖
- [ ] 按正确顺序构建：dto → lancedb-core → web → client
- [ ] Typecheck 通过

### US-002: 配置 macOS 双架构构建

**描述:** 作为 macOS 用户，我希望下载到适配我芯片架构的应用。

**验收标准:**

- [ ] macOS Intel (x64) 构建任务正常运行
- [ ] macOS Apple Silicon (arm64) 构建任务正常运行
- [ ] 构建产物文件名区分架构 (如 `-mac-x64.dmg`, `-mac-arm64.dmg`)
- [ ] 构建产物包含在 Artifact 中
- [ ] Typecheck 通过

### US-003: 配置 Linux 和 Windows 构建

**描述:** 作为 Linux/Windows 用户，我希望下载到对应平台的安装包。

**验收标准:**

- [ ] Linux (x64) 构建任务正常运行，输出 `.AppImage` 或 `.deb`
- [ ] Windows (x64) 构建任务正常运行，输出 `.exe` 安装包
- [ ] 构建产物文件名清晰标识平台
- [ ] 构建产物包含在 Artifact 中
- [ ] Typecheck 通过

### US-004: 自动发布到 GitHub Release

**描述:** 作为开发者，我希望构建产物自动发布到 GitHub Release。

**验收标准:**

- [ ] 推送 tag 时自动创建 Release
- [ ] 构建产物自动上传到 Release 附件
- [ ] Release 标题和描述自动生成
- [ ] 草稿 (draft) 模式可选
- [ ] Typecheck 通过

### US-005: 集成 Electron 自动更新

**描述:** 作为用户，我希望应用能自动检测并安装更新。

**验收标准:**

- [ ] 安装 `electron-updater` 依赖
- [ ] 在主进程 (main/index.ts) 中初始化 autoUpdater
- [ ] 配置更新服务器 URL (使用 GitHub Release)
- [ ] 生成 `latest-mac.yml`, `latest-linux.yml`, `latest.yml` 更新文件
- [ ] 更新文件随构建产物一起发布
- [ ] 添加菜单项或 UI 检查更新按钮
- [ ] Typecheck 通过

### US-006: 优化构建流程

**描述:** 作为开发者，我希望构建流程高效可靠。

**验收标准:**

- [ ] 使用 pnpm 缓存加速依赖安装
- [ ] 并行构建不同平台 (使用 matrix)
- [ ] 构建失败时发送通知或标记
- [ ] 添加构建状态 badge 到 README
- [ ] 构建日志清晰可读
- [ ] Typecheck 通过

## 功能需求

- **FR-1:** GitHub Actions 工作流必须在 push 事件时触发
- **FR-2:** 必须支持 macOS x64 和 arm64 两种架构
- **FR-3:** 必须支持 Linux x64 平台
- **FR-4:** 必须支持 Windows x64 平台
- **FR-5:** 构建产物必须上传到 GitHub Artifact
- **FR-6:** 推送 tag 时必须自动创建 GitHub Release
- **FR-7:** Release 必须包含所有平台的构建产物
- **FR-8:** 必须生成 electron-updater 所需的更新元数据文件
- **FR-9:** 应用启动时必须检查更新
- **FR-10:** 构建流程必须使用 pnpm 缓存优化速度

## 非目标

- 不支持 32 位 Windows (ia32)
- 不支持 Linux arm64 (暂不实现)
- 不实现静默自动安装 (需要用户确认)
- 不实现增量更新 (使用完整安装包)
- 暂不需要代码签名 (后续可添加)
- 不实现内测通道 (beta/alpha)

## 技术考量

### 构建流程

```
1. 检出代码
2. 设置 Node.js 20 + pnpm
3. 安装依赖 (pnpm install)
4. 构建 packages/dto
5. 构建 packages/lancedb-core
6. 构建 apps/web (ELECTRON=true)
7. 构建 apps/client (electron-builder)
```

### Matrix 配置

| OS | Runner | Platform | Arch |
|----|--------|----------|------|
| macOS | macos-latest | darwin | x64, arm64 |
| Linux | ubuntu-latest | linux | x64 |
| Windows | windows-latest | win32 | x64 |

### electron-builder 配置

需要在 `apps/client/electron-builder.yml` 中配置：
- publish 设置为 github
- 生成 latest.yml 更新文件
- 输出目录配置

### 自动更新流程

1. 应用启动时检查 GitHub Release 最新版本
2. 发现新版本时提示用户
3. 用户确认后下载并安装更新
4. 重启应用完成更新

## 成功指标

- 所有 4 个平台构建成功率 > 95%
- 构建时间 < 15 分钟 (含所有平台)
- 用户能通过自动更新获取新版本
- Release 附件包含所有平台的安装包

## 待解决问题

- 是否需要为不同平台设置不同的版本号策略？
- 是否需要设置预发布 (prerelease) 标记？
- 代码签名证书未来是否添加？
