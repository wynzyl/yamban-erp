import {
  McpStrategy,
  StreamableHttpTransport,
} from '@rekog/mcp-nest';

export const mcp = new McpStrategy({
  name: 'yamban-erp',
  version: '0.1.0',
  server: 'yamban',
  description: 'Yamban ERP MCP Server - Orders, inventory, collections, and expenses',
  transports: [
    new StreamableHttpTransport({
      endpoint: '/mcp',
    }),
  ],
  allowUnauthenticatedAccess: true,
  logging: {
    level: ['log', 'error', 'warn', 'debug'],
  },
});

export const MCP_STRATEGY = 'MCP_STRATEGY';
