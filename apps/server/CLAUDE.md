# Server CLAUDE.md

## LanceDB Core Integration

The server uses `@mancedb/lancedb-core` for shared LanceDB functionality.

### Dependency Injection Pattern

Services should use TypeDI to inject `ConnectionManager` and `TableManager`:

```typescript
import { Service, Inject } from 'typedi';
import { ConnectionManager, TableManager } from '@mancedb/lancedb-core';

@Service()
export class MyService {
  constructor(
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => TableManager) private tableManager: TableManager
  ) {}
}
```

### Connection Management

Use `ConnectionManager` to connect to databases:

```typescript
// Local connection
const conn = await this.connectionManager.connect('/path/to/db');

// S3 connection
const conn = await this.connectionManager.connect('s3://bucket/prefix', {
  storageType: 's3',
  s3Config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    awsAccessKeyId: '...',
    awsSecretAccessKey: '...',
  },
});
```

### Type Imports

Import shared types from `@mancedb/dto`:

```typescript
import type { TableInfo, DatabaseInfo } from '@mancedb/dto';
```

### Internal vs External Database

- **Internal database**: Used for server metadata (users, connections, query history)
  - Managed by `LanceDbService` in `sources/lancedb.ts`
  - Uses config from `config.lancedb`

- **External databases**: User-connected databases via connection service
  - Use `ConnectionManager` and `TableManager` from lancedb-core
  - Connection configs come from `ConnectionService`

### Migration Files

Migration scripts in `migrations/scripts/` use the internal database directly via `@lancedb/lancedb` - they don't need to use the shared package since they're part of the server's internal database setup.
