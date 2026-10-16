import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ProductsModule } from '../products/products.module.js';
import { McpTools } from './mcp.tools.js';
import { McpService } from './mcp.service.js';
import { mcp, MCP_STRATEGY } from './mcp.strategy.js';

@Module({
  imports: [
    CustomersModule,
    OrdersModule,
    ProductsModule,
  ],
  controllers: [McpTools],
  providers: [
    { provide: MCP_STRATEGY, useValue: mcp },
    McpService,
  ],
  exports: [MCP_STRATEGY],
})
export class McpModule {}
