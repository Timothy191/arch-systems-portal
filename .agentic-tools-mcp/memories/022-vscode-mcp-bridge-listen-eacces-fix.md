# VSCode MCP Bridge listen EACCES Fix

## Issue Summary
The VSCode MCP Bridge extension failed to start its Unix socket server, producing the following error:
`VSCode MCP Bridge: Failed to start socket server - Error: listen EACCES: permission denied /home/timothy/.local/share/yutengjing-vscode-mcp/vscode-mcp-bb69cd56.sock`

## Diagnostics
1. Verified that `/home/timothy/.local/share/` is readable and writable by the user `timothy`.
2. Verified that the subdirectory `/home/timothy/.local/share/yutengjing-vscode-mcp` did not exist.
3. Tested Node.js behavior when listening on a Unix socket path with a non-existent parent directory. On Linux, `net.Server.listen(path)` throws an `EACCES: permission denied` error instead of `ENOENT` in this scenario.
4. Confirmed that the `yutengjing.vscode-mcp-bridge` extension did not contain any directory creation (`mkdir` or `mkdirSync`) logic before calling `listen()`.

## Resolution
1. **Directory Creation**: Created the missing parent directory `/home/timothy/.local/share/yutengjing-vscode-mcp` so the socket can be successfully bound:
   ```bash
   mkdir -p /home/timothy/.local/share/yutengjing-vscode-mcp
   ```
2. **Extension Patch**: Modified the `start` method of the `Hn` class inside the extension bundle:
   Path: [/home/timothy/.antigravity-ide/extensions/yutengjing.vscode-mcp-bridge-4.9.2-universal/out/src/extension.js](file:///home/timothy/.antigravity-ide/extensions/yutengjing.vscode-mcp-bridge-4.9.2-universal/out/src/extension.js)

   Added recursive directory creation logic:
   ```javascript
   let parentDir = dt.dirname(this.socketPath);
   if (!ft.existsSync(parentDir)) {
       try {
           ft.mkdirSync(parentDir, { recursive: true });
           k.info(`Created socket directory: ${parentDir}`);
       } catch (r) {
           k.error(`Error creating socket directory: ${r}`);
       }
   }
   ```
   This ensures that the extension handles missing target directories gracefully going forward.
