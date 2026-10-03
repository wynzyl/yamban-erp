import { McpController, Tool } from '@rekog/mcp-nest';
import { Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { CustomersService } from '../customers/customers.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ProductsService } from '../products/products.service.js';

@McpController()
export class McpTools {
  constructor(
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Order Tools
  // ─────────────────────────────────────────────────────────────────────────────

  @Tool({
    name: 'list-orders',
    description: 'List orders with optional search and status filter. Returns paginated results.',
    parameters: z.object({
      search: z.string().optional().describe('Search by order number, customer name, or organization'),
      status: z.enum(['QUOTATION', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED', 'CANCELLED']).optional().describe('Filter by order status'),
      page: z.number().int().positive().default(1).describe('Page number'),
      pageSize: z.number().int().positive().max(100).default(20).describe('Items per page'),
    }),
  })
  async listOrders(
    @Payload() { search, status, page, pageSize }: { search?: string; status?: string; page: number; pageSize: number },
  ) {
    const result = await this.orders.list({ search, status, page, pageSize });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  @Tool({
    name: 'get-order',
    description: 'Get detailed information about a specific order including items, payments, and production status.',
    parameters: z.object({
      id: z.string().uuid().describe('The order ID'),
    }),
  })
  async getOrder(@Payload() { id }: { id: string }) {
    const order = await this.orders.get(id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(order, null, 2),
      }],
    };
  }

  @Tool({
    name: 'get-order-edit-permissions',
    description: 'Check what edit actions are allowed for an order based on its production status.',
    parameters: z.object({
      id: z.string().uuid().describe('The order ID'),
    }),
  })
  async getOrderPermissions(@Payload() { id }: { id: string }) {
    const permissions = await this.orders.getEditPermissions(id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(permissions, null, 2),
      }],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Customer Tools
  // ─────────────────────────────────────────────────────────────────────────────

  @Tool({
    name: 'list-customers',
    description: 'List customers with optional search. Returns paginated results.',
    parameters: z.object({
      search: z.string().optional().describe('Search by name, mobile, or organization'),
      page: z.number().int().positive().default(1).describe('Page number'),
      pageSize: z.number().int().positive().max(100).default(20).describe('Items per page'),
    }),
  })
  async listCustomers(
    @Payload() { search, page, pageSize }: { search?: string; page: number; pageSize: number },
  ) {
    const result = await this.customers.list({ search, page, pageSize });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  @Tool({
    name: 'get-customer',
    description: 'Get detailed information about a specific customer.',
    parameters: z.object({
      id: z.string().uuid().describe('The customer ID'),
    }),
  })
  async getCustomer(@Payload() { id }: { id: string }) {
    const customer = await this.customers.get(id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(customer, null, 2),
      }],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Product Tools
  // ─────────────────────────────────────────────────────────────────────────────

  @Tool({
    name: 'list-products',
    description: 'List products with optional search. Returns paginated results.',
    parameters: z.object({
      search: z.string().optional().describe('Search by product name'),
      page: z.number().int().positive().default(1).describe('Page number'),
      pageSize: z.number().int().positive().max(100).default(20).describe('Items per page'),
    }),
  })
  async listProducts(
    @Payload() { search, page, pageSize }: { search?: string; page: number; pageSize: number },
  ) {
    const result = await this.products.list({ search, page, pageSize });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  @Tool({
    name: 'get-product',
    description: 'Get detailed information about a specific product including sizes and pricing.',
    parameters: z.object({
      id: z.string().uuid().describe('The product ID'),
    }),
  })
  async getProduct(@Payload() { id }: { id: string }) {
    const product = await this.products.get(id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(product, null, 2),
      }],
    };
  }
}
