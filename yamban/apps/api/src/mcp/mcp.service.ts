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
    // Register utility tools dynamically (tools that don't need DI)
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
                description: 'ERP system for sublimation and tailoring shop',
                modules: [
                  'orders',
                  'customers',
                  'products',
                  'production',
                  'payments',
                  'materials',
                  'design',
                ],
              },
              null,
              2,
            ),
          },
        ],
      }),
    });
  }
}
