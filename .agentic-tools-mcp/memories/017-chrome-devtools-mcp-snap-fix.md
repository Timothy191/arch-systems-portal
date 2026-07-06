# Memory Log: Chrome DevTools MCP Fix (Chromium on Snap)

## Problem Details

When invoking `/chrome-devtools-plugin:debug-optimize-lcp`, the `chrome-devtools-mcp` server failed to start, returning:
`Could not find Google Chrome executable for channel 'stable' at: /opt/google/chrome/chrome.`

On this Linux environment, Google Chrome stable was not installed in the standard path. Instead, Chromium was installed via snap at `/snap/bin/chromium`.

## Resolution Steps

1. **Configured Executable Path**:
   We modified `/home/timothy/.gemini/config/mcp_config.json` to explicitly configure the `chrome-devtools-mcp` server.
   We added the `--executablePath` argument pointing to `/snap/bin/chromium` and set the `PUPPETEER_EXECUTABLE_PATH` environment variable:

   ```json
   "chrome-devtools-mcp": {
     "$typeName": "exa.cascade_plugins_pb.CascadePluginCommandTemplate",
     "command": "npx",
     "args": [
       "-y",
       "chrome-devtools-mcp@latest",
       "--executablePath",
       "/snap/bin/chromium"
     ],
     "env": {
       "PUPPETEER_EXECUTABLE_PATH": "/snap/bin/chromium"
     }
   }
   ```

2. **Handled Profile Locks**:
   Upon launching, the tool encountered a profile lock error:
   `The browser is already running for /home/timothy/.cache/chrome-devtools-mcp/chrome-profile. Use --isolated to run multiple browser instances.`
   To resolve this, we added the `--isolated` argument to the config, ensuring that the browser starts in a clean temporary user data directory that does not conflict with existing instances.

3. **Restarted Server**:
   Killed all running/hanging `chrome-devtools-mcp` processes.
   Re-invoked `list_pages` tool, triggering the client to auto-restart the MCP server with the new args, which completed successfully.
