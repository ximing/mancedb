# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LanceDB Admin is a full-stack Web/Electron application for managing LanceDB vector databases. It provides a Navicat-like interface for connection management, table browsing, SQL queries, and data manipulation.

## Architecture

### Monorepo Structure (pnpm workspaces + Turbo)

```
apps/
  server/          # Express.js backend (@mancedb/server)
  web/             # React 19 + Vite frontend (@mancedb/web)
  client/          # Electron desktop app (@mancedb/client)

packages/
  lancedb-core/    # Shared LanceDB services (@mancedb/lancedb-core)
  dto/             # Shared types/DTOs (@mancedb/dto)

config/
  eslint-config/   # Shared ESLint configuration
  jest-presets/    # Shared Jest configurations
  rollup-config/   # Shared Rollup configuration
  config-typescript/ # Shared TypeScript configurations
```

### Dependency Graph

Build order matters due to workspace dependencies:

1. `@mancedb/dto` - Shared types and DTOs (no internal deps)
2. `@mancedb/lancedb-core` - Depends on `@mancedb/dto`
3. Apps - `@mancedb/server`, `@mancedb/web`, `@mancedb/client` all depend on the packages above

The server serves the web app's static build output from `apps/server/public/` in production.

### Key Technologies

- **Backend**: Node.js 20, Express, routing-controllers, TypeDI (dependency injection)
- **Frontend**: React 19, Tailwind CSS, @rabjs/react (state management), React Router
- **Database**: LanceDB (vector database) with Apache Arrow
- **Desktop**: Electron with vite-plugin-electron
- **Authentication**: JWT tokens

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm dev:server    # Backend at http://localhost:3000
pnpm dev:web       # Frontend at http://localhost:5173
pnpm dev:client    # Electron app
```

### Building

```bash
# Build all packages and apps (respects dependency order)
pnpm build

# Build specific targets
pnpm build:web      # Builds web app, outputs to apps/server/public/
pnpm build:server   # Compiles TypeScript to apps/server/dist/
pnpm build:client   # Builds Electron app (requires web build first)
```

### Linting and Formatting

```bash
pnpm lint           # Run ESLint on all packages
pnpm lint:fix       # Auto-fix linting issues
pnpm format         # Run Prettier on all files
```

### Testing

```bash
# Run tests (Jest is configured in packages)
pnpm --filter @mancedb/dto test
pnpm --filter @mancedb/lancedb-core test
```

### Docker

```bash
# Build and run with Docker
docker build -t mancedb:latest .
docker run -p 3000:3000 --env-file .env mancedb:latest

# Or use docker-compose
docker-compose up -d
```

## Important Patterns

### TypeDI Dependency Injection

All services use TypeDI for dependency injection:

```typescript
import { Service, Inject } from 'typedi';
import { ConnectionManager } from '@mancedb/lancedb-core';

@Service()
export class MyService {
  constructor(
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager
  ) {}
}
```

Retrieve services from the container:
```typescript
import { Container } from 'typedi';
const myService = Container.get(MyService);
```

### Shared LanceDB Core Package

The `@mancedb/lancedb-core` package provides shared database services used by both server and client:

- `ConnectionManager` - Manages LanceDB connections (local and S3)
- `TableManager` - Table CRUD operations
- `QueryEngine` - Query execution with filtering/pagination
- `SchemaManager` - Apache Arrow schema parsing

### Server Architecture

The server uses `routing-controllers` with decorator-based routing:

```typescript
@JsonController('/api/v1/database')
export class DatabaseController {
  constructor(
    @Inject(() => ConnectionService) private connectionService: ConnectionService
  ) {}

  @Get('/tables')
  async getTables(@Req() req: Request) {
    // ...
  }
}
```

Controllers are registered in `apps/server/src/controllers/index.ts`.

### Client (Electron) Architecture

The Electron app has three processes:
- **Main** (`src/main/`) - Node.js environment, accesses system APIs
- **Preload** (`src/preload/`) - Bridge between main and renderer
- **Renderer** (`src/renderer/`) - Loads the web app

IPC communication flows through `ipc-router.ts` which maps HTTP-like requests to LanceDB operations.

### DTO Package Convention

Shared types and DTOs go in `packages/dto/src/` and use `class-transformer`/`class-validator`:

```typescript
export class CreateConnectionDto {
  @IsString()
  name: string;

  @IsEnum(StorageType)
  storageType: StorageType;
}
```

## Configuration

### Required Environment Variables

```env
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
CORS_ORIGIN=http://localhost:3000
```

See `ENVIRONMENT.md` for full configuration options.

### TypeScript Configuration

- Apps use `"type": "module"` (ES modules)
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- Each package extends configs from `@mancedb/typescript-config`

## Development Notes

- Node.js 20+ is required (specified in `.nvmrc`)
- pnpm 10.22.0+ is required (specified in `packageManager`)
- LanceDB requires native modules; builds may fail on mismatched Node versions
- The web app detects Electron via `import.meta.env.VITE_ELECTRON` and uses IPC instead of HTTP
- Client build requires web build first (`ELECTRON=true pnpm build` in web app)

## Testing Strategy

Jest is configured via `@mancedb/jest-presets`:
- Node preset for backend/packages
- Browser preset for frontend (when needed)

## License

Business Source License (BSL 1.1) - See LICENSE file
