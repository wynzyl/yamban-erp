import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { McpStrategy } from '@rekog/mcp-nest';
import { z } from 'zod';
import { MCP_STRATEGY } from './mcp.strategy.js';

@Injectable()
export class McpService implements OnModuleInit {
  constructor(
    @Inject(MCP_STRATEGY) private readonly mcp: McpStrategy,
  ) {}

  onModuleInit() {
    // Register tools dynamically
    this.mcp.registerTool({
      name: 'ping',
      description: 'Health check tool - returns pong',
      parameters: z.object({}),
      handler: async () => ({
        content: [{ type: 'text' as const, text: 'pong' }],
      }),
    });

    this.mcp.registerTool({
      name: 'get-server-info',
      description: 'Get information about the Yamban ERP server',
      parameters: z.object({}),
      handler: async () => ({
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                name: 'Yamban ERP',
                version: '0.1.0',
                description:
                  'ERP system for sublimation and tailoring shop: orders, inventory, collections, and expenses',
                modules: ['customers', 'users', 'auth'],
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    this.mcp.registerTool({
      name: 'echo',
      description: 'Echo back the provided message',
      parameters: z.object({
        message: z.string().describe('The message to echo back'),
      }),
      handler: async (args: Record<string, unknown>) => ({
        content: [{ type: 'text' as const, text: args.message as string }],
      }),
    });
  }
}
