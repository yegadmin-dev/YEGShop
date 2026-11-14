import { yegApi } from '../services/api.ts';
import type {
  OrderAdminCashierRecord,
  OrderItemRecord,
  OrderWaitingRecord,
  OrderWorkflowStatus,
  PublicOrderLookupResult,
  PublicPaymentStatus,
} from '../shared/types.ts';
import type {
  CreateCashierOrderPayload,
  CreatePublicOrderPayload,
  OrderRepository,
} from './interfaces.ts';

/**
 * DemoOrderRepository
 * Mengelola pesanan publik, pelacakan status, dan riwayat kasir dalam mode DEMO.
 */
export class DemoOrderRepository implements OrderRepository {
  readonly sourceMode = 'DEMO' as const;

  createPublicOrder(
    payload: CreatePublicOrderPayload
  ): Promise<{ order: OrderWaitingRecord; items: OrderItemRecord[]; deduplicated: boolean }> {
    return yegApi.createPublicOrder(payload);
  }

  async lookupStatus(query: string): Promise<PublicOrderLookupResult[]> {
    const res = await yegApi.lookupStatus(query);
    return res.items;
  }

  async listPublicOrders(): Promise<OrderWaitingRecord[]> {
    const res = await yegApi.getPublicOrders();
    return res.items;
  }

  async updatePublicOrder(
    orderId: string,
    patch: {
      orderStatus?: OrderWorkflowStatus;
      paymentStatus?: PublicPaymentStatus;
      adminNotes?: string;
    }
  ): Promise<OrderWaitingRecord> {
    const res = await yegApi.updatePublicOrder(orderId, patch);
    return res.order;
  }

  createCashierOrder(
    payload: CreateCashierOrderPayload
  ): Promise<{ order: OrderAdminCashierRecord; items: OrderItemRecord[]; deduplicated: boolean }> {
    return yegApi.createCashierOrder(payload);
  }

  async listCashierHistory(): Promise<OrderAdminCashierRecord[]> {
    const res = await yegApi.getCashierHistory();
    return res.items;
  }
}
