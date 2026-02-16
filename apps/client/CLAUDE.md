# Client (Electron) Development Guide

## Architecture Overview

The Electron app is organized into three main processes:

- **Main Process** (`src/main/`): Node.js environment, has access to system APIs
- **Preload** (`src/preload/`): Bridge between main and renderer, exposes safe APIs
- **Renderer** (`src/renderer/`): Web environment, loads the web app

## IPC Communication Patterns

### Adding a New IPC Channel

1. **Add channel to preload script** (`src/preload/index.ts`):
```typescript
const VALID_INVOKE_CHANNELS = ['dialog:openDirectory', 'api:request', 'your:new:channel'];
```

2. **Register handler in main process** (`src/main/ipc-router.ts` or `src/main/index.ts`):
```typescript
ipcMain.handle('your:new:channel', async (event, ...args) => {
  // Implementation
  return result;
});
```

3. **Call from renderer** (via web app's `ipc-request.ts`):
```typescript
const result = await window.electronAPI!.invoke('your:new:channel', args);
```

### API Request Flow (Local Mode)

Web app API calls go through this flow in Electron:

```
web app → api-client.ts → ipc-request.ts → preload → main (ipc-router) → lancedb.service
```

The `ipc-router.ts` maps HTTP-like requests to LanceDB operations:

```typescript
// Web app makes this call:
apiClient.get('/api/v1/database/tables')

// ipc-router handles it:
if (endpoint === '/api/v1/database/tables' && method === 'GET') {
  const result = await lancedbService.getTables();
  return successResponse(result);
}
```

## LanceDB Service

Located at `src/main/services/lancedb.service.ts`.

### Key Methods

- `connectToDatabase(dbPath)` - Opens connection to a local LanceDB database
- `getTables()` - Lists all tables with row counts and sizes
- `getTableSchema(tableName)` - Returns column info, types, vector dimensions
- `getTableData(tableName, options)` - Paginated data with filters/sorting
- `deleteTable(tableName)` - Drops a table
- `renameTable(oldName, newName)` - Copy-and-delete rename (LanceDB limitation)
- `executeQuery(sql)` - Basic SELECT * FROM support

### LanceDB Limitations

- No ALTER TABLE support (can't add/drop columns)
- No native RENAME TABLE (implemented via copy+delete)
- Queries use `table.search(vector)` even for non-vector data
- Schema is Apache Arrow-based

## Database Connection Flow

1. User selects folder via `dialog:openDirectory`
2. UI calls `db:connect` IPC with path
3. `lancedbService.connectToDatabase(path)` establishes connection
4. Subsequent API calls use the active connection
5. Connection is cached until `db:disconnect` is called

## Error Handling

All LanceDB operations throw descriptive errors that are caught in `ipc-router.ts` and returned as API error responses:

```typescript
{
  code: 500,
  data: null,
  message: "Failed to get table data: Table 'xyz' not found"
}
```

## Development Tips

- Use `pnpm dev` to start with hot reload
- Main process logs appear in terminal
- Renderer logs appear in DevTools console
- IPC messages are logged with `[IPC Router]` prefix

## Building and Packaging

### Build Configuration

Electron Builder configuration is in `electron-builder.yml`:

- **macOS**: `.dmg` and `.zip` (x64, arm64)
- **Windows**: `.exe` (NSIS) and `.msi` (x64, ia32)
- **Linux**: `.AppImage` and `.deb` (x64)

### Build Commands

```bash
# Build for all platforms (requires native dependencies on each platform)
pnpm dist:all

# Build for specific platform
pnpm dist:mac      # macOS only
pnpm dist:win      # Windows only
pnpm dist:linux    # Linux only

# Build without packaging (for testing)
pnpm build
```

### Icons

Icons are located in `build/` directory:

- `icon.icns` - macOS app icon
- `icon.ico` - Windows app icon
- `icon.png` - Linux app icon
- `icons/` - Linux icon set (16x16 to 512x512)

To regenerate icons from `public/logo.png`:

```bash
# macOS ICNS
mkdir -p build/icon.iconset
for size in 16 32 128 256 512; do
  magick convert public/logo.png -resize ${size}x${size} build/icon.iconset/icon_${size}x${size}.png
  magick convert public/logo.png -resize $((size*2))x$((size*2)) build/icon.iconset/icon_${size}x${size}@2x.png
done
iconutil -c icns build/icon.iconset -o build/icon.icns
rm -rf build/icon.iconset

# Windows ICO
magick convert public/logo.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

### CI/CD

GitHub Actions workflow (`.github/workflows/build-client.yml`) builds for all platforms on push to main and tags. Release artifacts are uploaded automatically.

### Code Signing (Optional)

For production releases, set these secrets in GitHub:

- `CSC_LINK` / `CSC_KEY_PASSWORD` - macOS certificate
- `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` - Windows certificate
