import { McpController, Tool } from '@rekog/mcp-nest';
import { Payload } from '@nestjs/microservices';
import { z } from 'zod';

@McpController({ server: 'yamban' })
export class McpToolsController {
  @Tool({
    name: 'ping',
    description: 'Health check tool - returns pong',
    parameters: z.object({}),
  })
  ping() {
    return {
      content: [{ type: 'text', text: 'pong' }],
    };
  }

  @Tool({
    name: 'get-server-info',
    description: 'Get information about the Yamban ERP server',
    parameters: z.object({}),
  })
  getServerInfo() {
    return {
      content: [
        {
          type: 'text',
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
    };
  }

  @Tool({
    name: 'echo',
    description: 'Echo back the provided message',
    parameters: z.object({
      message: z.string().describe('The message to echo back'),
    }),
  })
  echo(@Payload() { message }: { message: string }) {
    return {
      content: [{ type: 'text', text: message }],
    };
  }
}
