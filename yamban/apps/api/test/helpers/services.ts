import { CostingService } from '../../src/costing/costing.service.js';
import type { Database } from '../../src/db/client.js';
import { DesignService } from '../../src/design/design.service.js';
import { FilesService } from '../../src/design/files.service.js';
import { InventoryService } from '../../src/inventory/inventory.service.js';
import { OrdersService } from '../../src/orders/orders.service.js';
import { JobTransitions } from '../../src/production/job-transitions.service.js';
import { ProductionService } from '../../src/production/production.service.js';

/**
 * Wires the services by hand with a real database. (Vitest's transform does not emit
 * decorator metadata, so Nest's constructor injection by type is not available here.)
 */
export function buildServices(db: Database) {
  const costing = new CostingService(db);
  const inventory = new InventoryService(db);
  const transitions = new JobTransitions(db, inventory, costing);
  const files = new FilesService(db);
  return {
    costing,
    inventory,
    transitions,
    files,
    orders: new OrdersService(db, costing),
    production: new ProductionService(db, transitions),
    design: new DesignService(db, files, transitions),
  };
}

export type Services = ReturnType<typeof buildServices>;
