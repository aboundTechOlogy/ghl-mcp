/**
 * GHL MCP Server Entry Point
 * Starts HTTP server by default
 */

import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { HTTPServer } from './mcp/http-server-json-rpc.js';
import { GHLMCPServer } from './mcp/server.js';

async function main() {
  // Set log level
  logger.setLevel(config.logLevel);

  // Determine mode from environment or command line
  const mode = process.env.MCP_MODE || process.argv[2] || 'http';

  logger.info(`Starting GHL MCP Server in ${mode} mode`);

  if (mode === 'stdio') {
    // Run in stdio mode (for direct MCP client usage)
    const server = new GHLMCPServer();
    await server.runStdio();
  } else {
    // Run HTTP server (default)
    const httpServer = new HTTPServer();
    await httpServer.start();
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
