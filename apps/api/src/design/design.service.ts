import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import type { DesignApprovalStatus, JobStatus, UpdateDesignJobData, AssignDesignJobData } from '@yamban/shared';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designFiles,
  designJobs,
  orderItems,
  orders,
  productionJobs,
  products,
  users,
} from '../db/schema/index.js';
import { FilesService } from './files.service.js';

export interface DesignJobRow {
  id: string;
  productionJobId: string;
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
  hasFile: boolean;
  isReady: boolean;
  productionStatus: JobStatus;
}

export interface DesignBoard {
  pending: DesignJobRow[];
  ready: DesignJobRow[];
}

export interface DesignJobDetail extends DesignJobRow {
  requirements: string | null;
  referenceNotes: string | null;
  fileId: string | null;
  fileName: string | null;
}

// Valid approval status transitions
export const VALID_TRANSITIONS: Record<DesignApprovalStatus, DesignApprovalStatus[]> = {
  DRAFTING: ['FOR_APPROVAL'],
  FOR_APPROVAL: ['APPROVED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['FOR_APPROVAL'],
  APPROVED: [], // terminal
};

/** Check if a status transition is valid */
export function isValidTransition(from: DesignApprovalStatus, to: DesignApprovalStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

@Injectable()
export class DesignService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(forwardRef(() => FilesService)) private readonly files: FilesService,
  ) {}

  async listBoard(): Promise<DesignBoard> {
    const assignee = this.db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .as('assignee');

    // Subquery to check if design job has a file
    const fileExists = this.db
      .select({ designJobId: designFiles.designJobId })
      .from(designFiles)
      .as('file_exists');

    const rows = await this.db
      .select({
        id: designJobs.id,
        productionJobId: designJobs.productionJobId,
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
        productionStatus: productionJobs.status,
        hasFileRef: fileExists.designJobId,
      })
      .from(designJobs)
      .innerJoin(productionJobs, eq(productionJobs.id, designJobs.productionJobId))
      .innerJoin(orderItems, eq(orderItems.id, productionJobs.orderItemId))
      .innerJoin(orders, eq(orders.id, productionJobs.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(assignee, eq(assignee.id, productionJobs.assignedToId))
      .leftJoin(fileExists, eq(fileExists.designJobId, designJobs.id));

    const board: DesignBoard = {
      pending: [],
      ready: [],
    };

    for (const row of rows) {
      const hasFile = row.hasFileRef !== null;
      const isReady = row.productionStatus === 'COMPLETED';
      const jobRow: DesignJobRow = {
        id: row.id,
        productionJobId: row.productionJobId,
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        orderItemId: row.orderItemId,
        customerId: row.customerId,
        customerFirstName: row.customerFirstName,
        customerLastName: row.customerLastName,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        dueDate: row.dueDate,
        assignedToId: row.assignedToId,
        assignedToName: row.assignedToName,
        hasFile,
        isReady,
        productionStatus: row.productionStatus,
      };

      if (isReady) {
        board.ready.push(jobRow);
      } else {
        board.pending.push(jobRow);
      }
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
        requirements: designJobs.requirements,
        referenceNotes: designJobs.referenceNotes,
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
        productionStatus: productionJobs.status,
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

    // Get file info
    const [file] = await this.db
      .select({
        id: designFiles.id,
        fileName: designFiles.fileName,
      })
      .from(designFiles)
      .where(eq(designFiles.designJobId, id))
      .limit(1);

    const isReady = row.productionStatus === 'COMPLETED';
    const hasFile = !!file;

    return {
      ...row,
      hasFile,
      isReady,
      fileId: file?.id ?? null,
      fileName: file?.fileName ?? null,
    };
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
      if (!isValidTransition(existing.approvalStatus, data.approvalStatus)) {
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

  /** Mark design job ready for print (completes DESIGN stage, starts PRINTING) */
  async markReady(designJobId: string) {
    // Check file exists
    const file = await this.files.getFile(designJobId);
    if (!file) {
      throw new BadRequestException('Upload a design file first.');
    }

    // Get the production job and order item info
    const [designJob] = await this.db
      .select({
        productionJobId: designJobs.productionJobId,
        orderItemId: productionJobs.orderItemId,
        status: productionJobs.status,
      })
      .from(designJobs)
      .innerJoin(productionJobs, eq(productionJobs.id, designJobs.productionJobId))
      .where(eq(designJobs.id, designJobId))
      .limit(1);

    if (!designJob) throw new NotFoundException('Design job not found.');

    // Idempotent: if already completed, return success
    if (designJob.status === 'COMPLETED') {
      return { success: true, alreadyReady: true };
    }

    // Mark DESIGN production job as COMPLETED
    await this.db
      .update(productionJobs)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(productionJobs.id, designJob.productionJobId));

    // Start PRINTING stage for this order item if it exists
    await this.db
      .update(productionJobs)
      .set({
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      })
      .where(
        and(
          eq(productionJobs.orderItemId, designJob.orderItemId),
          eq(productionJobs.stage, 'PRINTING'),
        ),
      );

    return { success: true };
  }
}
