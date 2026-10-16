/**
 * Domain enums, defined once and reused by the database (pgEnum), the API
 * (validation) and the web app (labels, ordering). Values follow the MVP spec v3.
 */

export const USER_ROLES = ['OWNER', 'STAFF', 'DESIGNER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORDER_STATUSES = [
  'QUOTATION',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'RELEASED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const MATERIAL_STATUSES = ['COMPLETE', 'SHORT'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

/** Fixed production order. PRINTING and HEAT_PRESS always travel together. */
export const PRODUCTION_STAGES = ['DESIGN', 'PRINTING', 'HEAT_PRESS', 'SEWING', 'PACKAGING'] as const;
export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

export const JOB_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const DESIGN_APPROVAL_STATUSES = [
  'DRAFTING',
  'FOR_APPROVAL',
  'REVISION_REQUESTED',
  'APPROVED',
] as const;
export type DesignApprovalStatus = (typeof DESIGN_APPROVAL_STATUSES)[number];

/** Fixed display order (guideline: Sizes). ONE_SIZE is for mugs and other unsized items. */
export const GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'ONE_SIZE'] as const;
export type GarmentSize = (typeof GARMENT_SIZES)[number];

export const STOCK_UNITS = ['YARD', 'METER', 'ML', 'GRAM', 'PIECE'] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export const PAYMENT_METHODS = ['CASH', 'GCASH', 'BANK_TRANSFER', 'CHECK'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INVENTORY_TXN_TYPES = [
  'PURCHASE',
  'ORDER_CONSUMPTION',
  'RETURN',
  'ADJUSTMENT',
  'WASTE',
] as const;
export type InventoryTxnType = (typeof INVENTORY_TXN_TYPES)[number];

export const PURCHASE_REQUEST_STATUSES = [
  'DRAFT',
  'PRINTED',
  'ORDERED',
  'RECEIVED',
  'CANCELLED',
] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  'SALARY',
  'GOVT_CONTRIBUTIONS',
  'RENT',
  'UTILITIES',
  'FUEL',
  'VEHICLE_MAINTENANCE',
  'REPAIR_MAINTENANCE',
  'PROFESSIONAL_FEES',
  'MEALS_SNACKS',
  'OFFICE_SUPPLIES',
  'SHIPPING',
  'LOAN_PAYMENT',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// ---- Display labels (sentence case, the shop's own words) ----

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  DESIGN: 'Design',
  PRINTING: 'Printing',
  HEAT_PRESS: 'Heat press',
  SEWING: 'Sewing',
  PACKAGING: 'Ready for pickup',
};

export const SIZE_LABELS: Record<GarmentSize, string> = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  '2XL': '2XL',
  '3XL': '3XL',
  ONE_SIZE: 'One size',
};

/** Guideline "Payment method: fixed labels". BANK_TRANSFER is shown as the shop's bank. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'BDO',
  CHECK: 'Cheque',
};

export const UNIT_SUFFIX: Record<StockUnit, string> = {
  YARD: 'yd',
  METER: 'm',
  ML: 'ml',
  GRAM: 'g',
  PIECE: 'pc',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARY: 'Salary',
  GOVT_CONTRIBUTIONS: 'SSS, PhilHealth, Pag-IBIG',
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  FUEL: 'Diesel and toll',
  VEHICLE_MAINTENANCE: 'Vehicle maintenance',
  REPAIR_MAINTENANCE: 'Machine repair',
  PROFESSIONAL_FEES: 'Professional fees',
  MEALS_SNACKS: 'Meals and snacks',
  OFFICE_SUPPLIES: 'Office supplies',
  SHIPPING: 'Shipping',
  LOAN_PAYMENT: 'Loan payment',
  OTHER: 'Other',
};
