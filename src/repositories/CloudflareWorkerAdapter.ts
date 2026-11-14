import type {
  Addon,
  Category,
  ConfiguredItemInput,
  OrderAdminCashierRecord,
  OrderItemRecord,
  OrderWaitingRecord,
  OrderWorkflowStatus,
  PaymentRecord,
  PriceRule,
  Product,
  PublicOrderLookupResult,
  PublicPaymentStatus,
  QuoteResult,
  StoreSettings,
} from '../shared/types.ts';
import type {
  AddonRepository,
  CategoryRepository,
  CreateCashierOrderPayload,
  CreatePublicOrderPayload,
  OrderRepository,
  PaymentRepository,
  PriceRepository,
  ProductFilterParams,
  ProductRepository,
  RepositoryRegistry,
} from './interfaces.ts';

/**
 * Transport client untuk Cloudflare Worker API yang terhubung ke:
 * - Google Sheets (katalog, harga tier, antrean order, kasir, produksi)
 * - Google Drive (aset produk, QRIS, unggah bukti pembayaran & logo instansi)
 */
class WorkerHttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const res = await fetch(`${cleanBase}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Cloudflare Worker API error (${res.status})`);
    }
    return data as T;
  }

  resolveDriveAssetUrl(fileId: string): string {
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    return `${cleanBase}/api/assets/${encodeURIComponent(fileId)}`;
  }
}

export function createCloudflareWorkerRegistry(workerBaseUrl: string): RepositoryRegistry {
  const client = new WorkerHttpClient(workerBaseUrl);

  const products: ProductRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    async list(params?: ProductFilterParams): Promise<Product[]> {
      const qs = new URLSearchParams();
      if (params?.categorySlug) qs.set('category', params.categorySlug);
      if (params?.query) qs.set('q', params.query);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await client.request<{ items: Product[] }>(`/api/catalog/products${suffix}`);
      return res.items;
    },
    async getBySlug(slug: string): Promise<{ product: Product; addons: Addon[] } | null> {
      try {
        return await client.request<{ product: Product; addons: Addon[] }>(
          `/api/catalog/products/${encodeURIComponent(slug)}`
        );
      } catch {
        return null;
      }
    },
    async save(product: Product): Promise<Product> {
      const res = await client.request<{ product: Product }>('/api/admin/catalog/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
      return res.product;
    },
  };

  const categories: CategoryRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    async list(): Promise<Category[]> {
      const res = await client.request<{ items: Category[] }>('/api/catalog/categories');
      return res.items;
    },
    async getBySlug(slug: string): Promise<Category | null> {
      const items = await categories.list();
      return items.find((c) => c.slug === slug) || null;
    },
  };

  const prices: PriceRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    getRulesForProduct(product: Product): PriceRule[] {
      return (product.priceRules || []).filter((r) => r.active);
    },
    calculateQuote(input: ConfiguredItemInput): Promise<QuoteResult> {
      return client.request<QuoteResult>('/api/quote', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  };

  const addons: AddonRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    async list(): Promise<Addon[]> {
      const res = await client.request<{ items: Addon[] }>('/api/catalog/addons');
      return res.items;
    },
    async listForProduct(product: Product): Promise<Addon[]> {
      const all = await addons.list();
      return all.filter(
        (a) =>
          a.active &&
          (a.applicableProducts.includes(product.productId) ||
            a.applicableProducts.includes(product.slug) ||
            (a.applicableProducts.includes('all_map') && product.isMapProduct))
      );
    },
    async save(addon: Addon): Promise<Addon> {
      const res = await client.request<{ addon: Addon }>('/api/admin/catalog/addons', {
        method: 'POST',
        body: JSON.stringify(addon),
      });
      return res.addon;
    },
  };

  const orders: OrderRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    createPublicOrder(
      payload: CreatePublicOrderPayload
    ): Promise<{ order: OrderWaitingRecord; items: OrderItemRecord[]; deduplicated: boolean }> {
      return client.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async lookupStatus(query: string): Promise<PublicOrderLookupResult[]> {
      const res = await client.request<{ items: PublicOrderLookupResult[] }>('/api/status', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      return res.items;
    },
    async listPublicOrders(): Promise<OrderWaitingRecord[]> {
      const res = await client.request<{ items: OrderWaitingRecord[] }>('/api/admin/orders');
      return res.items;
    },
    async updatePublicOrder(
      orderId: string,
      patch: {
        orderStatus?: OrderWorkflowStatus;
        paymentStatus?: PublicPaymentStatus;
        adminNotes?: string;
      }
    ): Promise<OrderWaitingRecord> {
      const res = await client.request<{ order: OrderWaitingRecord }>(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      return res.order;
    },
    createCashierOrder(
      payload: CreateCashierOrderPayload
    ): Promise<{ order: OrderAdminCashierRecord; items: OrderItemRecord[]; deduplicated: boolean }> {
      return client.request('/api/admin/cashier/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listCashierHistory(): Promise<OrderAdminCashierRecord[]> {
      const res = await client.request<{ items: OrderAdminCashierRecord[] }>(
        '/api/admin/cashier/history'
      );
      return res.items;
    },
  };

  const payments: PaymentRepository = {
    sourceMode: 'CLOUDFLARE_WORKER',
    getStorePaymentConfig(): Promise<StoreSettings> {
      return client.request<StoreSettings>('/api/store/config');
    },
    async listPayments(): Promise<PaymentRecord[]> {
      const res = await client.request<{ items: PaymentRecord[] }>('/api/admin/payments');
      return res.items;
    },
    async verifyPayment(
      paymentId: string,
      status: PublicPaymentStatus,
      verifiedBy?: string
    ): Promise<PaymentRecord> {
      const res = await client.request<{ payment: PaymentRecord }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, verifiedBy }),
        }
      );
      return res.payment;
    },
  };

  return {
    mode: 'CLOUDFLARE_WORKER',
    products,
    categories,
    prices,
    addons,
    orders,
    payments,
  };
}
