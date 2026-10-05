import { Injectable } from '@nestjs/common';
import type { SetElectricityRateData } from '@yamban/shared';
import { desc, lte } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { electricityRates } from '../db/schema/index.js';

export interface ElectricityRateRow {
  id: string;
  ratePerKwh: string;
  effectiveDate: string;
}

@Injectable()
export class SettingsService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Get the current effective electricity rate. */
  async getCurrentElectricityRate(): Promise<ElectricityRateRow | null> {
    const today = new Date().toISOString().split('T')[0]!;
    const [row] = await this.db
      .select({
        id: electricityRates.id,
        ratePerKwh: electricityRates.ratePerKwh,
        effectiveDate: electricityRates.effectiveDate,
      })
      .from(electricityRates)
      .where(lte(electricityRates.effectiveDate, today))
      .orderBy(desc(electricityRates.effectiveDate))
      .limit(1);

    return row ?? null;
  }

  /** Get electricity rate effective on a specific date. */
  async getElectricityRateOn(date: string): Promise<ElectricityRateRow | null> {
    const [row] = await this.db
      .select({
        id: electricityRates.id,
        ratePerKwh: electricityRates.ratePerKwh,
        effectiveDate: electricityRates.effectiveDate,
      })
      .from(electricityRates)
      .where(lte(electricityRates.effectiveDate, date))
      .orderBy(desc(electricityRates.effectiveDate))
      .limit(1);

    return row ?? null;
  }

  /** List all electricity rates (history). */
  async listElectricityRates(): Promise<ElectricityRateRow[]> {
    return await this.db
      .select({
        id: electricityRates.id,
        ratePerKwh: electricityRates.ratePerKwh,
        effectiveDate: electricityRates.effectiveDate,
      })
      .from(electricityRates)
      .orderBy(desc(electricityRates.effectiveDate));
  }

  /** Set a new electricity rate. Upserts by effectiveDate. */
  async setElectricityRate(data: SetElectricityRateData): Promise<ElectricityRateRow> {
    const [row] = await this.db
      .insert(electricityRates)
      .values({
        ratePerKwh: data.ratePerKwh,
        effectiveDate: data.effectiveDate,
      })
      .onConflictDoUpdate({
        target: electricityRates.effectiveDate,
        set: { ratePerKwh: data.ratePerKwh },
      })
      .returning();

    return {
      id: row!.id,
      ratePerKwh: row!.ratePerKwh,
      effectiveDate: row!.effectiveDate,
    };
  }
}
