import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DesignApprovalStatus, UpdateDesignJobData, AssignDesignJobData } from '@yamban/shared';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designJobs,
  orderItems,
  orders,
  productionJobs,
  products,
  users,
} from '../db/schema/index.js';

export interface DesignJobRow {
  id: string;
  productionJobId: string;
  approvalStatus: DesignApprovalStatus;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  productId: string;
  productName: string;
  quantity: number;
  dueDate: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
}

export interface DesignBoard {
  DRAFTING: DesignJobRow[];
  FOR_APPROVAL: DesignJobRow[];
  REVISION_REQUESTED: DesignJobRow[];
  APPROVED: DesignJobRow[];
}

export interface DesignJobDetail extends DesignJobRow {
  requirements: string | null;
  referenceNotes: string | null;
  revisionCount: number;
  customerApprovedAt: Date | null;
}

// Valid approval status transitions
const VALID_TRANSITIONS: Record<DesignApprovalStatus, DesignApprovalStatus[]> = {
  DRAFTING: ['FOR_APPROVAL'],
  FOR_APPROVAL: ['APPROVED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['FOR_APPROVAL'],
  APPROVED: [], // terminal
};

@Injectable()
export class DesignService {
  constructor(@InjectDb() private readonly db: Database) {}

  async listBoard(): Promise<DesignBoard> {
    const assignee = this.db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .as('assignee');

    const rows = await this.db
      .select({
        id: designJobs.id,
        productionJobId: designJobs.productionJobId,
        approvalStatus: designJobs.approvalStatus,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderItemId: orderItems.id,
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        productId: products.id,
        productName: products.name,
        quantity: productionJobs.plannedQuantity,
        dueDate: orders.dueDate,
        assignedToId: productionJobs.assignedToId,
        assignedToName: assignee.name,
      })
      .from(designJobs)
      .innerJoin(productionJobs, eq(productionJobs.id, designJobs.productionJobId))
      .innerJoin(orderItems, eq(orderItems.id, productionJobs.orderItemId))
      .innerJoin(orders, eq(orders.id, productionJobs.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(assignee, eq(assignee.id, productionJobs.assignedToId));

    const board: DesignBoard = {
      DRAFTING: [],
      FOR_APPROVAL: [],
      REVISION_REQUESTED: [],
      APPROVED: [],
    };

    for (const row of rows) {
      board[row.approvalStatus].push(row);
    }

    return board;
  }

  async get(id: string): Promise<DesignJobDetail> {
    const assignee = this.db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .as('assignee');

    const [row] = await this.db
      .select({
        id: designJobs.id,
        productionJobId: designJobs.productionJobId,
        approvalStatus: designJobs.approvalStatus,
        requirements: designJobs.requirements,
        referenceNotes: designJobs.referenceNotes,
        revisionCount: designJobs.revisionCount,
        customerApprovedAt: designJobs.customerApprovedAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderItemId: orderItems.id,
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        productId: products.id,
        productName: products.name,
        quantity: productionJobs.plannedQuantity,
        dueDate: orders.dueDate,
        assignedToId: productionJobs.assignedToId,
        assignedToName: assignee.name,
      })
      .from(designJobs)
      .innerJoin(productionJobs, eq(productionJobs.id, designJobs.productionJobId))
      .innerJoin(orderItems, eq(orderItems.id, productionJobs.orderItemId))
      .innerJoin(orders, eq(orders.id, productionJobs.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(assignee, eq(assignee.id, productionJobs.assignedToId))
      .where(eq(designJobs.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Design job not found.');

    return row;
  }

  async update(id: string, data: UpdateDesignJobData, userId?: string) {
    // Fetch current state
    const [existing] = await this.db
      .select({
        approvalStatus: designJobs.approvalStatus,
        revisionCount: designJobs.revisionCount,
      })
      .from(designJobs)
      .where(eq(designJobs.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Design job not found.');

    // Validate approval status transition
    if (data.approvalStatus && data.approvalStatus !== existing.approvalStatus) {
      const validTargets = VALID_TRANSITIONS[existing.approvalStatus];
      if (!validTargets.includes(data.approvalStatus)) {
        throw new BadRequestException(
          `Cannot transition from ${existing.approvalStatus} to ${data.approvalStatus}.`,
        );
      }
    }

    const updates: Partial<typeof designJobs.$inferInsert> = {};
    if (data.approvalStatus !== undefined) {
      updates.approvalStatus = data.approvalStatus;
      // Track revision count when going to REVISION_REQUESTED
      if (data.approvalStatus === 'REVISION_REQUESTED') {
        updates.revisionCount = existing.revisionCount + 1;
      }
      // Set customerApprovedAt when approved
      if (data.approvalStatus === 'APPROVED') {
        updates.customerApprovedAt = new Date();
        if (userId) updates.approvedById = userId;
      }
    }
    if (data.requirements !== undefined) updates.requirements = data.requirements;
    if (data.referenceNotes !== undefined) updates.referenceNotes = data.referenceNotes;

    const [updated] = await this.db
      .update(designJobs)
      .set(updates)
      .where(eq(designJobs.id, id))
      .returning();

    return updated!;
  }

  async assign(id: string, data: AssignDesignJobData) {
    // Get the production job ID for this design job
    const [designJob] = await this.db
      .select({ productionJobId: designJobs.productionJobId })
      .from(designJobs)
      .where(eq(designJobs.id, id))
      .limit(1);

    if (!designJob) throw new NotFoundException('Design job not found.');

    // Update the production job's assignedToId
    const [updated] = await this.db
      .update(productionJobs)
      .set({ assignedToId: data.assignedToId })
      .where(eq(productionJobs.id, designJob.productionJobId))
      .returning();

    return updated!;
  }
}
