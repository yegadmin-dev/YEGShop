import { yegApi } from '../services/api.ts';
import type { PaymentRecord, PublicPaymentStatus, StoreSettings } from '../shared/types.ts';
import type { PaymentRepository } from './interfaces.ts';

/**
 * DemoPaymentRepository
 * Mengelola konfigurasi metode pembayaran (SeaBank/QRIS) & verifikasi transaksi dalam mode DEMO.
 */
export class DemoPaymentRepository implements PaymentRepository {
  readonly sourceMode = 'DEMO' as const;

  getStorePaymentConfig(): Promise<StoreSettings> {
    return yegApi.getStoreConfig();
  }

  async listPayments(): Promise<PaymentRecord[]> {
    const res = await yegApi.getPayments();
    return res.items;
  }

  async verifyPayment(
    paymentId: string,
    status: PublicPaymentStatus,
    verifiedBy?: string
  ): Promise<PaymentRecord> {
    const res = await yegApi.verifyPayment(paymentId, status, verifiedBy);
    return res.payment;
  }
}
