# ManceDB - LanceDB Database Manager

[![CI](https://github.com/ximing/mancedb/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ximing/mancedb/actions/workflows/ci.yml)
[![Docker Build and Publish](https://github.com/ximing/mancedb/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/ximing/mancedb/actions/workflows/docker-publish.yml)
[![Build Electron](https://github.com/ximing/mancedb/actions/workflows/build-electron.yml/badge.svg)](https://github.com/ximing/mancedb/actions/workflows/build-electron.yml)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-BSL%201.1-blue)
![GitHub repo size](https://img.shields.io/github/repo-size/ximing/mancedb?color=green)
![GitHub last commit](https://img.shields.io/github/last-commit/ximing/mancedb?color=blue)

English | [Chinese README](./README_CN.md)

A modern LanceDB database management tool with a Navicat-like web UI. It supports connection management, table browsing, SQL queries, and data operations.

![Main UI](./assets/main.png)

## Installation and Usage

The desktop client is now available. Download the installer for your OS from the GitHub Releases page and launch ManceDB.

- Releases: https://github.com/ximing/mancedb/releases
- Install the package for your operating system and start the app.
- Create a new connection and begin managing your LanceDB database.

## Table of Contents

- [Installation and Usage](#installation-and-usage)
- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [License](#license)
- [Support and Feedback](#support-and-feedback)

## Overview

**ManceDB** is a full-stack web application that provides an intuitive management interface for LanceDB vector databases. It supports multiple connection types (local/S3), schema management, data browsing, and SQL queries.

### Use Cases

- Database management: manage multiple LanceDB connections.
- Schema inspection: view schemas, column information, and vector dimensions.
- Data browsing: paginate data with filtering and sorting.
- SQL queries: run LanceDB SQL queries and review history.
- Schema changes: add/delete columns, rename/delete tables.
- Data operations: delete single or multiple rows.

## Core Features

### Connection Management

- Multi-connection support with saved configurations.
- Connection types: local path and S3 storage.
- Per-connection username/password authentication.
- Connection testing for availability.
- S3 compatibility with AWS S3, MinIO, Alibaba Cloud OSS, and more.

### Table Management

- List all tables with row counts and sizes.
- Inspect schemas with column types and vector dimensions.
- Create tables via SQL.
- Rename tables.
- Delete tables with confirmation.

### Data Browsing

- Pagination with 50/100/200 rows per page.
- Column filtering by condition.
- Column sorting via table headers.
- Vector column dimension summaries.
- JSON detail view for each row.
- Single and batch row deletion.

### SQL Queries

- SQL editor with highlighting and formatting.
- Run SELECT queries.
- Table-based result display.
- Recent 20-query history.
- Export results to CSV or JSON.
- Cmd/Ctrl+Enter to execute quickly.

### Schema Changes

- Add columns with Arrow types (int64, float64, string, binary, vector).
- Delete columns.
- Vector columns with configurable dimensions.

## Quick Start

### Prerequisites

- Node.js >= 20.0
- pnpm >= 10.0
- Docker (optional, for container deployment)

### Local Development

#### 1. Clone the repo

```bash
git clone https://github.com/your-org/mancedb.git
cd mancedb
```

#### 2. Install dependencies

```bash
pnpm install
```

#### 3. Configure environment variables (optional)

```bash
cp .env.example .env
# Edit .env if you need custom configuration.
```

Base environment variables:

```env
CORS_ORIGIN=http://localhost:3000
```

> Note: Authentication has been removed in the latest version, so `JWT_SECRET` is no longer required.

#### 4. Start dev servers

```bash
# Start backend and frontend together
pnpm dev

# Or start separately
pnpm dev:server  # Backend (http://localhost:3000)
pnpm dev:web     # Frontend (http://localhost:5173)
```

#### 5. Open the app

Open http://localhost:3000

### Common Commands

```bash
# Build the apps
pnpm build                # Build both backend and frontend
pnpm build:web            # Build frontend only
pnpm build:server         # Build backend only

# Lint
pnpm lint                 # ESLint checks
pnpm lint:fix             # Auto-fix

# Format
pnpm format               # Prettier formatting
```

## Docker Deployment

### Prebuilt Image

```bash
docker pull ghcr.io/ximing/mancedb:stable
```

### Quick Deploy

#### Option 1: Docker Compose (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/mancedb.git
cd mancedb

# 2. Configure environment variables (optional)
cp .env.example .env
# Edit .env if you need custom configuration.

# 3. Start services
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Stop services
docker-compose down
```

#### Option 2: Docker Run

```bash
# Run the container
docker run -d \
  -p 3000:3000 \
  --name lancedb-admin \
  -e CORS_ORIGIN=http://localhost:3000 \
  -v $(pwd)/data/lancedb:/app/lancedb_data \
  --restart unless-stopped \
  ghcr.io/ximing/mancedb:stable

# View logs
docker logs -f lancedb-admin
```

#### Option 3: Build from Source

```bash
# Build the image
docker build -t lancedb-admin:latest .

# Run the container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name lancedb-admin \
  lancedb-admin:latest
```

### Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for details.

Base configuration:

```env
CORS_ORIGIN=http://localhost:3000
```

> Note: Authentication has been removed, so `JWT_SECRET` is no longer required.

Optional configuration:

```env
# Localization
LOCALE_LANGUAGE=zh-cn
LOCALE_TIMEZONE=Asia/Shanghai

# LanceDB
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data
```

### Data Persistence

Make sure to mount a data volume for persistence:

```yaml
volumes:
  - ./data/lancedb:/app/lancedb_data
```

### Health Check

The app provides a health check endpoint:

```bash
curl http://localhost:3000/api/v1/health
```

## Configuration

### Connection Configuration

1. Local connection
   - Type: Local
   - Path: LanceDB data directory
   - Username/Password: custom credentials

2. S3 connection
   - Type: S3
   - Bucket: S3 bucket name
   - Region: AWS region
   - Access Key / Secret Key: S3 credentials
   - Endpoint: optional (for MinIO or compatible services)

### Security Recommendations

1. CORS_ORIGIN: allow only specific domains.
2. Data backups: backup the `lancedb_data` directory regularly.
3. HTTPS: use HTTPS via a reverse proxy in production.
4. Access control: restrict access via firewall or VPN.

> Note: Authentication has been removed, so protect the app with HTTPS and access control.

## License

**Business Source License (BSL 1.1)** - see [LICENSE](./LICENSE).

### License Notes

- Personal use: allowed
- Non-commercial use: allowed
- Internal use: allowed
- Commercial services/SaaS: requires a commercial license

For commercial licensing, contact: morningxm@hotmail.com

## Support and Feedback

- Email: morningxm@hotmail.com
- Issues: https://github.com/ximing/mancedb/issues
- Discussions: https://github.com/ximing/mancedb/discussions
