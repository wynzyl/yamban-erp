import { numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Column helpers. Table/column names are snake_cased by `casing: 'snake_case'`. */

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Pesos. numeric(14,2) returned as string — format with formatMoney(), never parseFloat for math. */
export const money = () => numeric({ precision: 14, scale: 2 });

/** Stock quantities in the material's operating unit (yd, m, ml...). */
export const qty = () => numeric({ precision: 14, scale: 3 });

/** Unit costs keep more precision than pesos (₱0.0514 per ml of ink). */
export const unitCost = () => numeric({ precision: 14, scale: 4 });
