import type {
  Addon,
  Category,
  ConfiguredItemInput,
  OrderAdminCashierRecord,
  OrderItemRecord,
  OrderWaitingRecord,
  OrderWorkflowStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentScheme,
  PriceRule,
  Product,
  PublicOrderLookupResult,
  PublicPaymentStatus,
  QuoteResult,
  StoreSettings,
} from '../shared/types.ts';

export interface ProductFilterParams {
  categorySlug?: string;
  query?: string;
  includeInactive?: boolean;
}

export interface ProductRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  list(params?: ProductFilterParams): Promise<Product[]>;
  getBySlug(slug: string): Promise<{ product: Product; addons: Addon[] } | null>;
  save(product: Product): Promise<Product>;
}

export interface CategoryRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  list(includeInactive?: boolean): Promise<Category[]>;
  getBySlug(slug: string): Promise<Category | null>;
}

export interface PriceRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  getRulesForProduct(product: Product): PriceRule[];
  calculateQuote(input: ConfiguredItemInput): Promise<QuoteResult>;
}

export interface AddonRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  list(includeInactive?: boolean): Promise<Addon[]>;
  listForProduct(product: Product): Promise<Addon[]>;
  save(addon: Addon): Promise<Addon>;
}

export interface CreatePublicOrderPayload {
  customerName: string;
  whatsapp: string;
  institution?: string;
  address?: string;
  customerNotes?: string;
  deadline: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentScheme;
  dpAmount?: number;
  paymentProofDataUrl?: string;
  paymentProofFileName?: string;
  idempotencyKey: string;
  items: ConfiguredItemInput[];
}

export interface CreateCashierOrderPayload {
  sourceOrderId?: string;
  customerName: string;
  whatsapp?: string;
  institution?: string;
  cashierName: string;
  deadline: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar';
  dpAmount?: number;
  cashReceived?: number;
  transactionNotes?: string;
  idempotencyKey: string;
  items: ConfiguredItemInput[];
}

export interface OrderRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  createPublicOrder(
    payload: CreatePublicOrderPayload
  ): Promise<{ order: OrderWaitingRecord; items: OrderItemRecord[]; deduplicated: boolean }>;
  lookupStatus(query: string): Promise<PublicOrderLookupResult[]>;
  listPublicOrders(): Promise<OrderWaitingRecord[]>;
  updatePublicOrder(
    orderId: string,
    patch: {
      orderStatus?: OrderWorkflowStatus;
      paymentStatus?: PublicPaymentStatus;
      adminNotes?: string;
    }
  ): Promise<OrderWaitingRecord>;
  createCashierOrder(
    payload: CreateCashierOrderPayload
  ): Promise<{ order: OrderAdminCashierRecord; items: OrderItemRecord[]; deduplicated: boolean }>;
  listCashierHistory(): Promise<OrderAdminCashierRecord[]>;
}

export interface PaymentRepository {
  readonly sourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  getStorePaymentConfig(): Promise<StoreSettings>;
  listPayments(): Promise<PaymentRecord[]>;
  verifyPayment(
    paymentId: string,
    status: PublicPaymentStatus,
    verifiedBy?: string
  ): Promise<PaymentRecord>;
}

export interface RepositoryRegistry {
  mode: 'DEMO' | 'CLOUDFLARE_WORKER';
  products: ProductRepository;
  categories: CategoryRepository;
  prices: PriceRepository;
  addons: AddonRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
}
