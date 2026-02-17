# PRD: 数据库连接凭证可选

## Introduction

ManceDB 目前要求用户在创建数据库连接时必须填写账号和密码。但实际上存在多种无需凭证的场景：
- 本地 LanceDB 数据库可能没有设置访问控制
- S3 公开桶允许匿名访问
- 使用 IAM 角色等免密钥认证方式

本功能将账号和密码字段改为可选，让用户可以根据实际情况选择是否填写凭证。

## Goals

- 允许创建无需账号密码的数据库连接
- 支持本地无认证数据库连接
- 支持 S3 公开桶的匿名访问
- 保持现有需要凭证的连接方式正常工作
- 在 UI 上清晰标识凭证为可选项

## User Stories

### US-001: 后端 DTO 移除凭证必填验证
**Description:** 作为开发者，我需要让后端接受无凭证的连接配置。

**Acceptance Criteria:**
- [ ] 在 `CreateConnectionDto` 中将 `accessKeyId` 字段标记为 `@IsOptional()`
- [ ] 在 `CreateConnectionDto` 中将 `secretAccessKey` 字段标记为 `@IsOptional()`
- [ ] 在 `UpdateConnectionDto` 中同样移除凭证必填验证
- [ ] 确保空字符串和 `undefined` 都被接受为有效值
- [ ] Typecheck passes

### US-002: 连接服务支持空凭证
**Description:** 作为开发者，我需要确保 LanceDB/S3 连接逻辑能正确处理空凭证。

**Acceptance Criteria:**
- [ ] 检查 `ConnectionManager` 创建 S3 连接时的凭证处理逻辑
- [ ] 确保空凭证时正确创建匿名 S3 客户端或本地连接
- [ ] 验证非空凭证时原有功能不受影响
- [ ] 添加空凭证场景的错误处理和提示
- [ ] Typecheck passes

### US-003: 前端表单移除凭证必填验证
**Description:** 作为用户，我可以在创建连接时不填写账号密码。

**Acceptance Criteria:**
- [ ] 找到连接创建/编辑表单组件
- [ ] 移除账号字段的必填验证规则
- [ ] 移除密码字段的必填验证规则
- [ ] 确保表单提交时允许空值
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: 前端表单添加可选标注
**Description:** 作为用户，我能清楚知道账号密码是可选填写的。

**Acceptance Criteria:**
- [ ] 在账号输入框标签后添加 "(可选)" 标注
- [ ] 在密码输入框标签后添加 "(可选)" 标注
- [ ] 添加提示文字说明何时需要填写（如 S3 非公开桶）
- [ ] 保持现有表单的样式一致性
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: 连接列表显示凭证状态
**Description:** 作为用户，我能在连接列表中看出哪些连接有凭证、哪些没有。

**Acceptance Criteria:**
- [ ] 在连接列表项或详情中显示凭证状态（有/无）
- [ ] 使用图标或标签直观展示
- [ ] 不影响列表的现有功能和布局
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 后端 DTO 接受空的 `accessKeyId` 和 `secretAccessKey`
- FR-2: 连接服务正确处理空凭证场景（本地数据库、S3 公开桶）
- FR-3: 前端表单允许不填写账号密码直接提交
- FR-4: UI 上清晰标注账号密码为可选字段
- FR-5: 连接列表或详情显示凭证配置状态
- FR-6: 现有带凭证的连接功能不受影响

## Non-Goals

- 不支持在 UI 上切换凭证显示/隐藏（保持现有密码框类型）
- 不自动检测 S3 桶是否需要凭证
- 不实现凭证自动填充或记住功能
- 不改变连接配置的数据库表结构

## Design Considerations

- 账号/密码输入框保持单行文本框样式
- "(可选)" 标注使用次要文字颜色（如 gray-500）
- 提示文字位置：输入框下方或表单顶部
- 凭证状态指示：使用锁图标（有凭证=锁定，无凭证=解锁）

## Technical Considerations

### 后端改动点
- `packages/dto/src/connection/create-connection.dto.ts` - 添加 `@IsOptional()`
- `packages/dto/src/connection/update-connection.dto.ts` - 添加 `@IsOptional()`
- `packages/lancedb-core/src/connection/connection-manager.ts` - 检查空凭证处理

### 前端改动点
- `apps/web/src/pages/connections/connection-form.tsx` 或类似文件 - 表单验证
- 标签和提示文案的国际化键值
- `apps/web/src/pages/connections/connection-list.tsx` - 添加凭证状态显示

### S3 连接逻辑
- AWS SDK 的 S3 客户端支持空凭证创建匿名客户端
- 需要验证 LanceDB 对 S3 的封装是否透传这一能力
- 错误处理：当需要凭证但未提供时，显示清晰的错误信息

## Success Metrics

- 用户可以不填写凭证成功创建本地 LanceDB 连接
- 用户可以不填写凭证成功创建 S3 公开桶连接
- 带凭证的连接功能保持 100% 兼容

## Open Questions

1. 是否需要对不同的存储类型显示不同的提示？（本地路径 vs S3）
2. 空凭证连接失败时，错误信息是否应该明确提示"可能需要填写凭证"？
3. 是否应该支持保存时测试连接，提前发现凭证问题？
