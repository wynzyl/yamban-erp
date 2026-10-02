import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CustomersModule } from './customers/customers.module.js';
import { DatabaseModule } from './db/database.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ProductsModule } from './products/products.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { HealthController } from './health/health.controller.js';
import { McpService } from './mcp/mcp.service.js';
import { mcp, MCP_STRATEGY } from './mcp/mcp.strategy.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    MaterialsModule,
    OrdersModule,
    PaymentsModule,
    ProductsModule,
    SuppliersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // MCP strategy and service for runtime tool registration
    { provide: MCP_STRATEGY, useValue: mcp },
    McpService,
  ],
})
export class AppModule {}
