import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMachineData, UpdateMachineData } from '@yamban/shared';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { machines } from '../db/schema/index.js';

export interface MachineRow {
  id: string;
  name: string;
  stage: string;
  powerKw: string;
  active: boolean;
}

@Injectable()
export class MachinesService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(): Promise<MachineRow[]> {
    return await this.db
      .select({
        id: machines.id,
        name: machines.name,
        stage: machines.stage,
        powerKw: machines.powerKw,
        active: machines.active,
      })
      .from(machines)
      .where(eq(machines.active, true))
      .orderBy(asc(machines.stage), asc(machines.name));
  }

  async get(id: string): Promise<MachineRow> {
    const [row] = await this.db
      .select({
        id: machines.id,
        name: machines.name,
        stage: machines.stage,
        powerKw: machines.powerKw,
        active: machines.active,
      })
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Machine not found.');
    return row;
  }

  async create(data: CreateMachineData): Promise<MachineRow> {
    const [row] = await this.db
      .insert(machines)
      .values({
        name: data.name,
        stage: data.stage,
        powerKw: data.powerKw,
      })
      .returning();

    return {
      id: row!.id,
      name: row!.name,
      stage: row!.stage,
      powerKw: row!.powerKw,
      active: row!.active,
    };
  }

  async update(id: string, data: UpdateMachineData): Promise<MachineRow> {
    const [existing] = await this.db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Machine not found.');

    const updates: Partial<typeof machines.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.stage !== undefined) updates.stage = data.stage;
    if (data.powerKw !== undefined) updates.powerKw = data.powerKw;

    if (Object.keys(updates).length > 0) {
      await this.db.update(machines).set(updates).where(eq(machines.id, id));
    }

    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Machine not found.');

    // Soft delete
    await this.db.update(machines).set({ active: false }).where(eq(machines.id, id));
  }
}
