import { pgEnum } from 'drizzle-orm/pg-core';
import {
  DESIGN_APPROVAL_STATUSES,
  EXPENSE_CATEGORIES,
  GARMENT_SIZES,
  INVENTORY_TXN_TYPES,
  JOB_STATUSES,
  MATERIAL_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCTION_STAGES,
  PURCHASE_REQUEST_STATUSES,
  STOCK_UNITS,
  USER_ROLES,
} from '@yamban/shared';

// Values come from @yamban/shared so the DB, API and UI cannot drift apart.
export const userRole = pgEnum('user_role', USER_ROLES);
export const orderStatus = pgEnum('order_status', ORDER_STATUSES);
export const materialStatus = pgEnum('material_status', MATERIAL_STATUSES);
export const productionStage = pgEnum('production_stage', PRODUCTION_STAGES);
export const jobStatus = pgEnum('job_status', JOB_STATUSES);
export const designApprovalStatus = pgEnum('design_approval_status', DESIGN_APPROVAL_STATUSES);
export const garmentSize = pgEnum('garment_size', GARMENT_SIZES);
export const stockUnit = pgEnum('stock_unit', STOCK_UNITS);
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS);
export const inventoryTxnType = pgEnum('inventory_txn_type', INVENTORY_TXN_TYPES);
export const purchaseRequestStatus = pgEnum('purchase_request_status', PURCHASE_REQUEST_STATUSES);
export const expenseCategory = pgEnum('expense_category', EXPENSE_CATEGORIES);
