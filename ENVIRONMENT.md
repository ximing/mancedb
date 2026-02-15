# LanceDB Admin - 环境变量配置文档

本文档详细说明 LanceDB Admin 应用的所有环境变量配置选项。

## 快速配置

对于大部分用户，只需要配置以下必需的环境变量：

```env
# 必需配置
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
CORS_ORIGIN=http://localhost:3000
```

## 完整配置选项

### 基础配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境：`development` 或 `production` |
| `PORT` | `3000` | 服务器监听端口 |

### CORS 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CORS_ORIGIN` | `http://localhost:3000` | 允许的跨域源，多个源用逗号分隔 |
| `CORS_CREDENTIALS` | `true` | 是否允许携带凭证（cookies） |

### JWT 认证配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `JWT_SECRET` | *(必需)* | JWT 签名密钥，**生产环境必须修改**，至少 32 个字符 |

**安全提示：**
- 使用随机生成的强密钥：`openssl rand -base64 32`
- 定期轮换密钥（会强制所有用户重新登录）
- 不要将密钥提交到代码仓库

### LanceDB 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LANCEDB_STORAGE_TYPE` | `local` | 存储类型：`local` 或 `s3` |
| `LANCEDB_PATH` | `./lancedb_data` | 本地存储路径 |
| `LANCEDB_VERSION_RETENTION_DAYS` | `7` | 数据版本保留天数 |

#### S3 存储配置（可选）

当 `LANCEDB_STORAGE_TYPE=s3` 时需要配置：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LANCEDB_S3_BUCKET` | *(必需)* | S3 存储桶名称 |
| `LANCEDB_S3_PREFIX` | `lancedb` | S3 中的路径前缀 |
| `LANCEDB_S3_ENDPOINT` | - | S3 端点 URL（用于 MinIO 等兼容服务） |
| `AWS_ACCESS_KEY_ID` | - | AWS/S3 访问密钥 |
| `AWS_SECRET_ACCESS_KEY` | - | AWS/S3 密钥 |
| `AWS_REGION` | `us-east-1` | AWS 区域 |

### 本地化配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOCALE_LANGUAGE` | `zh-cn` | 界面语言：`zh-cn` 或 `en-us` |
| `LOCALE_TIMEZONE` | `Asia/Shanghai` | 时区设置 |

## Docker 部署示例

### 使用 Docker Compose

创建 `.env` 文件：

```env
# 必需配置
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=http://localhost:3000

# 可选配置
LOCALE_LANGUAGE=zh-cn
LOCALE_TIMEZONE=Asia/Shanghai
```

启动服务：

```bash
docker-compose up -d
```

### 使用 Docker Run

```bash
docker run -d \
  -p 3000:3000 \
  --name lancedb-admin \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e LOCALE_LANGUAGE=zh-cn \
  -v $(pwd)/data/lancedb:/app/lancedb_data \
  --restart unless-stopped \
  mancedb:latest
```

## 数据持久化

### 卷挂载说明

| 容器路径 | 说明 | 建议挂载 |
|----------|------|----------|
| `/app/lancedb_data` | LanceDB 数据目录 | **必须挂载** |

### 示例挂载

```bash
# 本地目录挂载
-v /host/path/lancedb:/app/lancedb_data

# Docker 卷挂载
-v lancedb_data:/app/lancedb_data
```

## 健康检查

应用提供健康检查端点：

```
GET /api/v1/health
```

Docker 健康检查配置：

```yaml
healthcheck:
  test: ['CMD', 'node', '-e', "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## 故障排查

### 数据库连接失败

检查日志：
```bash
docker logs mancedb-app
```

常见问题：
- 卷挂载权限问题：`chmod 755 /host/path/lancedb`
- 磁盘空间不足：检查宿主机磁盘空间

### JWT 认证失败

- 确认 `JWT_SECRET` 已正确设置
- 确认密钥长度至少 32 个字符
- 修改密钥后需要重新登录

### CORS 错误

- 确认 `CORS_ORIGIN` 包含实际访问的域名
- 多个源使用逗号分隔：`https://app1.com,https://app2.com`
- 开发环境可设置为 `*`（不推荐用于生产）

## 安全建议

1. **JWT_SECRET**：使用强随机密钥，定期轮换
2. **CORS_ORIGIN**：明确指定允许的域名，不要使用 `*`
3. **数据备份**：定期备份挂载的 lancedb_data 目录
4. **HTTPS**：生产环境使用 HTTPS 反向代理
5. **访问控制**：使用防火墙限制端口访问

## 升级指南

### 升级步骤

1. 备份数据：
   ```bash
   cp -r ./data/lancedb ./data/lancedb.backup.$(date +%Y%m%d)
   ```

2. 拉取新镜像：
   ```bash
   docker-compose pull
   ```

3. 重启服务：
   ```bash
   docker-compose up -d
   ```

4. 验证健康状态：
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

### 回滚

如果升级出现问题：

```bash
# 停止服务
docker-compose down

# 恢复数据
cp -r ./data/lancedb.backup.YYYYMMDD/* ./data/lancedb/

# 使用旧版本镜像启动
docker-compose up -d
```
