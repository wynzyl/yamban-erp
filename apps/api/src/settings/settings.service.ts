import { Injectable } from '@nestjs/common';
import type { ProductionStage, SetElectricityRateData, UpdateDefaultLaborRatesData } from '@yamban/shared';
import { desc, eq, lte } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { defaultLaborRates, electricityRates, products, productStages } from '../db/schema/index.js';

export interface ElectricityRateRow {
  id: string;
  ratePerKwh: string;
  effectiveDate: string;
}

export interface DefaultLaborRateRow {
  id: string;
  stage: ProductionStage;
  ratePerPiece: string;
}

export interface ProductLaborRateRow {
  productId: string;
  productName: string;
  stages: {
    stage: ProductionStage;
    laborRatePerPiece: string | null;
  }[];
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

  /** List default labor rates for all production stages. */
  async listDefaultLaborRates(): Promise<DefaultLaborRateRow[]> {
    return await this.db
      .select({
        id: defaultLaborRates.id,
        stage: defaultLaborRates.stage,
        ratePerPiece: defaultLaborRates.ratePerPiece,
      })
      .from(defaultLaborRates);
  }

  /** Update default labor rates. Upserts by stage. */
  async updateDefaultLaborRates(data: UpdateDefaultLaborRatesData): Promise<DefaultLaborRateRow[]> {
    const results: DefaultLaborRateRow[] = [];

    for (const rate of data.rates) {
      const [row] = await this.db
        .insert(defaultLaborRates)
        .values({
          stage: rate.stage,
          ratePerPiece: rate.ratePerPiece,
        })
        .onConflictDoUpdate({
          target: defaultLaborRates.stage,
          set: { ratePerPiece: rate.ratePerPiece },
        })
        .returning();

      results.push({
        id: row!.id,
        stage: row!.stage,
        ratePerPiece: row!.ratePerPiece,
      });
    }

    return results;
  }

  /** List all products with their stage labor rates. */
  async listProductLaborRates(): Promise<ProductLaborRateRow[]> {
    const productRows = await this.db
      .select({
        id: products.id,
        name: products.name,
      })
      .from(products)
      .where(eq(products.active, true));

    const results: ProductLaborRateRow[] = [];

    for (const product of productRows) {
      const stages = await this.db
        .select({
          stage: productStages.stage,
          laborRatePerPiece: productStages.laborRatePerPiece,
        })
        .from(productStages)
        .where(eq(productStages.productId, product.id));

      results.push({
        productId: product.id,
        productName: product.name,
        stages: stages.map((s) => ({
          stage: s.stage,
          laborRatePerPiece: s.laborRatePerPiece,
        })),
      });
    }

    return results;
  }
}
