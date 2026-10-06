import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { CategoriesModule } from './categories/categories.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CostingModule } from './costing/costing.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DatabaseModule } from './db/database.module.js';
import { DesignModule } from './design/design.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { MachinesModule } from './machines/machines.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ProductionModule } from './production/production.module.js';
import { ProductsModule } from './products/products.module.js';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { HealthController } from './health/health.controller.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CostingModule,
    CustomersModule,
    DesignModule,
    InventoryModule,
    MachinesModule,
    MaterialsModule,
    McpModule,
    OrdersModule,
    PaymentsModule,
    ProductionModule,
    ProductsModule,
    PurchaseRequestsModule,
    SettingsModule,
    SuppliersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global exception filter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Order matters: rate limit, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
