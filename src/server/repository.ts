import fs from 'node:fs';
import path from 'node:path';
import {
  calculateConfiguredQuote,
  getTodayIsoDate,
  isValidFutureOrTodayDeadline,
} from '../shared/pricing.ts';
import type {
  Addon,
  CashierOrderLookupResult,
  Category,
  ConfiguredItemInput,
  OrderAdminCashierRecord,
  OrderItemRecord,
  OrderWaitingRecord,
  OrderWorkflowStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentScheme,
  Product,
  ProductionRecord,
  ProductionStage,
  PublicOrderLookupResult,
  PublicPaymentStatus,
  StoreSettings,
} from '../shared/types.ts';
import { createInitialDemoState, INITIAL_SETTINGS } from './seedData.ts';

export interface DemoStoreState {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  addons: Addon[];
  ordersWaiting: OrderWaitingRecord[];
  ordersCashier: OrderAdminCashierRecord[];
  orderItems: OrderItemRecord[];
  payments: PaymentRecord[];
  production: ProductionRecord[];
  dailyQueueCounters: Record<string, number>;
  orderCounter: number;
  cashierCounter: number;
}

export interface CreatePublicOrderInput {
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

export interface CreateCashierOrderInput {
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

export interface YegRepository {
  getSettings(): Promise<StoreSettings>;
  updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings>;
  getCategories(includeInactive?: boolean): Promise<Category[]>;
  getProducts(includeInactive?: boolean): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getAddons(includeInactive?: boolean): Promise<Addon[]>;
  upsertCategory(category: Category): Promise<Category>;
  upsertProduct(product: Product): Promise<Product>;
  upsertAddon(addon: Addon): Promise<Addon>;
  createPublicOrder(input: CreatePublicOrderInput): Promise<{
    order: OrderWaitingRecord;
    items: OrderItemRecord[];
    deduplicated: boolean;
  }>;
  createCashierOrder(input: CreateCashierOrderInput): Promise<{
    order: OrderAdminCashierRecord;
    items: OrderItemRecord[];
    deduplicated: boolean;
  }>;
  getCashierWaitingOrders(): Promise<OrderWaitingRecord[]>;
  lookupCashierBarcode(code: string): Promise<CashierOrderLookupResult | null>;
  lookupOrders(query: string): Promise<PublicOrderLookupResult[]>;
  getDashboardSummary(): Promise<{
    totalPublicOrders: number;
    totalCashierOrders: number;
    pendingConfirmationCount: number;
    verifiedPaymentsCount: number;
    inProductionCount: number;
    completedCount: number;
    totalPublicValue: number;
    totalCashierValue: number;
  }>;
  getPublicOrders(): Promise<OrderWaitingRecord[]>;
  updatePublicOrder(
    orderId: string,
    patch: {
      orderStatus?: OrderWorkflowStatus;
      paymentStatus?: PublicPaymentStatus;
      adminNotes?: string;
    }
  ): Promise<OrderWaitingRecord | null>;
  getCashierHistory(): Promise<OrderAdminCashierRecord[]>;
  getPayments(): Promise<PaymentRecord[]>;
  verifyPayment(
    paymentId: string,
    status: PublicPaymentStatus,
    verifiedBy: string
  ): Promise<PaymentRecord | null>;
  getProductionQueue(): Promise<ProductionRecord[]>;
  updateProductionStage(
    productionId: string,
    stage: ProductionStage,
    notes?: string
  ): Promise<ProductionRecord | null>;
  getReportsSummary(): Promise<{
    totalRevenueAllChannels: number;
    publicRevenue: number;
    cashierRevenue: number;
    totalOrdersCount: number;
    verifiedPaidAmount: number;
    outstandingReceivable: number;
    topProducts: Array<{ productName: string; totalQty: number; totalRevenue: number }>;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
  }>;
  refreshCache(): Promise<{ refreshedAt: string; productCount: number; categoryCount: number }>;
}

const STORE_FILE = path.resolve(process.cwd(), '.yegshop-demo-store.json');

export class MockSheetsRepository implements YegRepository {
  private state: DemoStoreState;
  private lockPromise: Promise<void> = Promise.resolve();
  private cashierIdempotencyMap = new Map<string, string>();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DemoStoreState {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DemoStoreState;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.ordersWaiting)) {
          return {
            ...parsed,
            settings: {
              ...INITIAL_SETTINGS,
              ...(parsed.settings || {}),
            },
          };
        }
      }
    } catch {
      // Fallback to fresh demo seed without deleting anything intentionally
    }
    const fresh = createInitialDemoState();
    this.persistState(fresh);
    return fresh;
  }

  private persistState(nextState: DemoStoreState = this.state) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(nextState, null, 2), 'utf-8');
    } catch {
      // Safe fallback in read-only runtimes: in-memory state stays active
    }
  }

  private withMutex<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.lockPromise.then(() => fn());
    this.lockPromise = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private nextAtomicQueueNumber(): string {
    const today = getTodayIsoDate();
    const current = this.state.dailyQueueCounters[today] || 0;
    const next = current + 1;
    this.state.dailyQueueCounters[today] = next;
    return `#A-${String(next).padStart(2, '0')}`;
  }

  async getSettings(): Promise<StoreSettings> {
    return { ...this.state.settings };
  }

  async updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.withMutex(() => {
      this.state.settings = {
        ...this.state.settings,
        ...patch,
        currency: 'IDR',
      };
      this.persistState();
      return { ...this.state.settings };
    });
  }

  async getCategories(includeInactive = false): Promise<Category[]> {
    return this.state.categories
      .filter((c) => includeInactive || c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProducts(includeInactive = false): Promise<Product[]> {
    return this.state.products
      .filter((p) => includeInactive || p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return this.state.products.find((p) => p.slug === slug && p.active) || null;
  }

  async getAddons(includeInactive = false): Promise<Addon[]> {
    return this.state.addons
      .filter((a) => includeInactive || a.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async upsertCategory(category: Category): Promise<Category> {
    return this.withMutex(() => {
      const idx = this.state.categories.findIndex((c) => c.categoryId === category.categoryId);
      if (idx >= 0) {
        this.state.categories[idx] = category;
      } else {
        this.state.categories.push(category);
      }
      this.persistState();
      return category;
    });
  }

  async upsertProduct(product: Product): Promise<Product> {
    return this.withMutex(() => {
      const idx = this.state.products.findIndex((p) => p.productId === product.productId);
      if (idx >= 0) {
        this.state.products[idx] = product;
      } else {
        this.state.products.push(product);
      }
      this.persistState();
      return product;
    });
  }

  async upsertAddon(addon: Addon): Promise<Addon> {
    return this.withMutex(() => {
      const idx = this.state.addons.findIndex((a) => a.addonId === addon.addonId);
      if (idx >= 0) {
        this.state.addons[idx] = addon;
      } else {
        this.state.addons.push(addon);
      }
      this.persistState();
      return addon;
    });
  }

  private buildValidatedOrderItems(
    orderId: string,
    source: 'PUBLIC' | 'ADMIN_CASHIER',
    items: ConfiguredItemInput[]
  ): OrderItemRecord[] {
    if (!items || items.length === 0) {
      throw new Error('Keranjang pesanan tidak boleh kosong.');
    }

    return items.map((item, idx) => {
      const product = this.state.products.find(
        (p) => p.productId === item.productId && p.active
      );
      if (!product) {
        throw new Error(`Produk tidak ditemukan atau nonaktif: ${item.productId}`);
      }
      const quote = calculateConfiguredQuote(product, this.state.addons, item);
      return {
        itemId: `ITM-${orderId}-${idx + 1}`,
        orderId,
        source,
        productId: product.productId,
        productName: product.name,
        qty: quote.qty,
        unitBasePrice: quote.unitBasePrice,
        unitAddonsPrice: quote.unitAddonsPrice,
        lineSubtotal: quote.lineBaseSubtotal,
        lineAddonsTotal: quote.lineAddonsSubtotal,
        lineTotal: quote.lineTotal,
        specifications: item.specifications || {},
        addons: quote.addonBreakdown,
        logoFileName: item.logoFileName,
      };
    });
  }

  async createPublicOrder(input: CreatePublicOrderInput) {
    return this.withMutex(() => {
      if (!input.idempotencyKey) {
        throw new Error('Idempotency key wajib disertakan.');
      }

      const existing = this.state.ordersWaiting.find(
        (o) => o.idempotencyKey === input.idempotencyKey
      );
      if (existing) {
        const items = this.state.orderItems.filter((i) => i.orderId === existing.orderId);
        return { order: existing, items, deduplicated: true };
      }

      if (!input.customerName?.trim() || !input.whatsapp?.trim()) {
        throw new Error('Nama pemesan dan nomor WhatsApp wajib diisi.');
      }

      if (!isValidFutureOrTodayDeadline(input.deadline)) {
        throw new Error('Tanggal deadline tidak valid atau sudah lewat.');
      }

      const hasProof =
        typeof input.paymentProofDataUrl === 'string' &&
        input.paymentProofDataUrl.startsWith('data:image/');

      this.state.orderCounter += 1;
      const orderId = `YEG-${this.state.orderCounter}`;
      const queueNumber = this.nextAtomicQueueNumber();
      const nowIso = new Date().toISOString();

      const orderItems = this.buildValidatedOrderItems(orderId, 'PUBLIC', input.items);
      const subtotal = orderItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
      const totalAddons = orderItems.reduce((sum, i) => sum + i.lineAddonsTotal, 0);
      const totalTransaction = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);

      let dpAmount = 0;
      let paymentMethod: PaymentMethod = input.paymentMethod || 'Belum Dipilih';
      let paymentType: PaymentScheme = input.paymentType || 'Menunggu Konfirmasi';
      let paymentStatus: PublicPaymentStatus = 'Belum Dibayar';
      let proofFileId = '';

      if (hasProof) {
        paymentMethod = input.paymentMethod || 'SeaBank';
        paymentType = input.paymentType || 'DP';
        paymentStatus = 'Menunggu verifikasi pembayaran';
        proofFileId = `DRV-PROOF-${orderId}`;
        dpAmount = totalTransaction;
        if (paymentType === 'DP') {
          const minDp = Math.ceil(totalTransaction * 0.5);
          const requestedDp = Math.round(Number(input.dpAmount) || minDp);
          dpAmount =
            requestedDp < minDp || requestedDp >= totalTransaction ? minDp : requestedDp;
        }
      }

      const remainingAmount = Math.max(0, totalTransaction - dpAmount);
      const customerNotes = (input.customerNotes || '').trim();

      const order: OrderWaitingRecord = {
        orderId,
        timestamp: nowIso,
        customerName: input.customerName.trim(),
        whatsapp: input.whatsapp.trim(),
        institution: (input.institution || '').trim(),
        address: (input.address || '').trim(),
        source: 'PUBLIC',
        subtotal,
        totalAddons,
        totalTransaction,
        dpAmount,
        remainingAmount,
        paymentMethod,
        paymentType,
        paymentProofFileId: proofFileId,
        paymentProofDataUrl: hasProof ? input.paymentProofDataUrl : undefined,
        queueNumber,
        deadline: input.deadline,
        paymentStatus,
        orderStatus: 'Menunggu konfirmasi admin',
        adminNotes: customerNotes ? `Catatan Pemesan: ${customerNotes}` : '',
        customerNotes,
        idempotencyKey: input.idempotencyKey,
      };

      const payment: PaymentRecord = {
        paymentId: `PAY-${orderId}`,
        orderId,
        source: 'PUBLIC',
        customerName: order.customerName,
        method: paymentMethod,
        paymentType,
        amount: dpAmount,
        totalTransaction,
        proofFileId,
        proofDataUrl: hasProof ? input.paymentProofDataUrl : undefined,
        status: paymentStatus,
        verifiedBy: '',
        verifiedAt: '',
        createdAt: nowIso,
      };

      const totalQty = orderItems.reduce((s, i) => s + i.qty, 0);
      const summary = orderItems
        .map((i) => `${i.productName} (${i.qty} pcs)`)
        .join(', ');

      const prod: ProductionRecord = {
        productionId: `PRD-${orderId}`,
        orderId,
        source: 'PUBLIC',
        queueNumber,
        customerName: order.customerName,
        institution: order.institution,
        productSummary: summary,
        totalQty,
        deadline: order.deadline,
        stage: 'Antrean Masuk',
        notes:
          customerNotes ||
          (hasProof
            ? 'Pesanan publik baru, menunggu verifikasi pembayaran admin.'
            : 'Order waiting publik baru, menunggu konfirmasi WA & pemrosesan Kasir POS.'),
        updatedAt: nowIso,
      };

      // Atomic state commit across Orders_Waiting, Order_Items, Payments, Production
      this.state.ordersWaiting.unshift(order);
      this.state.orderItems.push(...orderItems);
      this.state.payments.unshift(payment);
      this.state.production.unshift(prod);
      this.persistState();

      return { order, items: orderItems, deduplicated: false };
    });
  }

  async createCashierOrder(input: CreateCashierOrderInput) {
    return this.withMutex(() => {
      if (input.idempotencyKey && this.cashierIdempotencyMap.has(input.idempotencyKey)) {
        const existingId = this.cashierIdempotencyMap.get(input.idempotencyKey)!;
        const existingOrder = this.state.ordersCashier.find((o) => o.orderId === existingId);
        if (existingOrder) {
          const items = this.state.orderItems.filter((i) => i.orderId === existingOrder.orderId);
          return { order: existingOrder, items, deduplicated: true };
        }
      }

      if (!input.customerName?.trim()) {
        throw new Error('Nama pelanggan wajib diisi pada transaksi kasir.');
      }

      const deadline = isValidFutureOrTodayDeadline(input.deadline)
        ? input.deadline
        : getTodayIsoDate();

      const sourceOrderIdClean = input.sourceOrderId?.trim();
      const linkedPublic = sourceOrderIdClean
        ? this.state.ordersWaiting.find(
            (o) => o.orderId.toLowerCase() === sourceOrderIdClean.toLowerCase()
          )
        : undefined;

      this.state.cashierCounter += 1;
      const orderId = `POS-${this.state.cashierCounter}`;
      const queueNumber = linkedPublic ? linkedPublic.queueNumber : this.nextAtomicQueueNumber();
      const nowIso = new Date().toISOString();

      const orderItems = this.buildValidatedOrderItems(orderId, 'ADMIN_CASHIER', input.items);
      const productSubtotal = orderItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
      const totalAddons = orderItems.reduce((sum, i) => sum + i.lineAddonsTotal, 0);
      const totalTransaction = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const totalQty = orderItems.reduce((sum, i) => sum + i.qty, 0);

      let dpAmount = totalTransaction;
      if (input.paymentStatus === 'Belum Dibayar') {
        dpAmount = 0;
      } else if (input.paymentStatus === 'DP Terverifikasi') {
        dpAmount = Math.min(
          totalTransaction,
          Math.max(1, Math.round(Number(input.dpAmount) || Math.ceil(totalTransaction * 0.5)))
        );
      }

      const remainingAmount = Math.max(0, totalTransaction - dpAmount);
      const cashReceived =
        input.paymentMethod === 'Tunai'
          ? Math.max(0, Math.round(Number(input.cashReceived) || dpAmount))
          : dpAmount;
      const changeAmount =
        input.paymentMethod === 'Tunai' && cashReceived >= dpAmount
          ? cashReceived - dpAmount
          : 0;

      const order: OrderAdminCashierRecord = {
        orderId,
        timestamp: nowIso,
        source: 'ADMIN_CASHIER',
        sourceOrderId: linkedPublic?.orderId,
        customerName: input.customerName.trim(),
        whatsapp: (input.whatsapp || '').trim(),
        institution: (input.institution || '').trim(),
        cashierName:
          (input.cashierName || '').trim() ||
          this.state.settings.defaultCashierName ||
          'Kasir Workshop YEG',
        itemTypeCount: orderItems.length,
        totalQty,
        productSubtotal,
        totalAddons,
        totalTransaction,
        dpAmount,
        remainingAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        cashReceived,
        changeAmount,
        queueNumber,
        deadline,
        transactionNotes: (input.transactionNotes || '').trim(),
      };

      const payment: PaymentRecord = {
        paymentId: `PAY-${orderId}`,
        orderId,
        source: 'ADMIN_CASHIER',
        customerName: order.customerName,
        method: input.paymentMethod,
        paymentType: input.paymentStatus === 'DP Terverifikasi' ? 'DP' : 'Lunas',
        amount: dpAmount,
        totalTransaction,
        proofFileId:
          input.paymentMethod === 'Tunai'
            ? 'CASH-POS'
            : `POS-${input.paymentMethod.toUpperCase()}`,
        status: input.paymentStatus,
        verifiedBy: input.paymentStatus === 'Belum Dibayar' ? '' : order.cashierName,
        verifiedAt: input.paymentStatus === 'Belum Dibayar' ? '' : nowIso,
        createdAt: nowIso,
      };

      const summary = orderItems
        .map((i) => `${i.productName} (${i.qty} pcs)`)
        .join(', ');

      if (linkedPublic) {
        // Synchronize linked public waiting order without duplicating items/payments/production
        linkedPublic.linkedCashierOrderId = orderId;
        linkedPublic.customerName = order.customerName;
        if (order.whatsapp) linkedPublic.whatsapp = order.whatsapp;
        linkedPublic.institution = order.institution || '';
        linkedPublic.deadline = order.deadline;
        linkedPublic.subtotal = productSubtotal;
        linkedPublic.totalAddons = totalAddons;
        linkedPublic.totalTransaction = totalTransaction;
        linkedPublic.dpAmount = dpAmount;
        linkedPublic.remainingAmount = remainingAmount;
        linkedPublic.paymentMethod = input.paymentMethod;
        linkedPublic.paymentType = input.paymentStatus === 'DP Terverifikasi' ? 'DP' : 'Lunas';
        linkedPublic.paymentStatus = input.paymentStatus;
        if (
          linkedPublic.orderStatus === 'Menunggu konfirmasi admin' ||
          linkedPublic.orderStatus === 'Dibatalkan'
        ) {
          linkedPublic.orderStatus = 'Diproses';
        }
        const posAudit = `Diproses lewat Kasir POS (${orderId}) oleh ${order.cashierName}`;
        linkedPublic.adminNotes = [linkedPublic.adminNotes, posAudit]
          .filter(Boolean)
          .join(' · ');

        // Remove superseded waiting items & unpaid placeholder payment so revenue isn't double counted
        this.state.orderItems = this.state.orderItems.filter(
          (i) => i.orderId !== linkedPublic.orderId
        );
        this.state.payments = this.state.payments.filter(
          (p) => p.orderId !== linkedPublic.orderId
        );

        const existingProd = this.state.production.find(
          (p) => p.orderId === linkedPublic.orderId
        );
        if (existingProd) {
          existingProd.customerName = order.customerName;
          existingProd.institution = order.institution;
          existingProd.productSummary = summary;
          existingProd.totalQty = totalQty;
          existingProd.deadline = deadline;
          existingProd.notes =
            order.transactionNotes || `Disesuaikan di Kasir POS (${orderId})`;
          existingProd.updatedAt = nowIso;
        } else {
          this.state.production.unshift({
            productionId: `PRD-${orderId}`,
            orderId,
            source: 'ADMIN_CASHIER',
            queueNumber,
            customerName: order.customerName,
            institution: order.institution,
            productSummary: summary,
            totalQty,
            deadline,
            stage: 'Antrean Masuk',
            notes: order.transactionNotes || `Dari Order Publik ${linkedPublic.orderId}`,
            updatedAt: nowIso,
          });
        }
      } else {
        const prod: ProductionRecord = {
          productionId: `PRD-${orderId}`,
          orderId,
          source: 'ADMIN_CASHIER',
          queueNumber,
          customerName: order.customerName,
          institution: order.institution,
          productSummary: summary,
          totalQty,
          deadline,
          stage: 'Antrean Masuk',
          notes: order.transactionNotes || 'Pesanan dari terminal Kasir POS.',
          updatedAt: nowIso,
        };
        this.state.production.unshift(prod);
      }

      this.state.ordersCashier.unshift(order);
      this.state.orderItems.push(...orderItems);
      this.state.payments.unshift(payment);
      if (input.idempotencyKey) {
        this.cashierIdempotencyMap.set(input.idempotencyKey, orderId);
      }
      this.persistState();

      return { order, items: orderItems, deduplicated: false };
    });
  }

  async getCashierWaitingOrders(): Promise<OrderWaitingRecord[]> {
    const waiting = this.state.ordersWaiting.map((o) => ({
      ...o,
      items: this.state.orderItems.filter(
        (i) => i.orderId === (o.linkedCashierOrderId || o.orderId)
      ),
    }));
    // Prioritize orders waiting confirmation / not yet processed by cashier
    return waiting.sort((a, b) => {
      const aPending = !a.linkedCashierOrderId && a.orderStatus === 'Menunggu konfirmasi admin' ? 0 : 1;
      const bPending = !b.linkedCashierOrderId && b.orderStatus === 'Menunggu konfirmasi admin' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return b.timestamp.localeCompare(a.timestamp);
    });
  }

  async lookupCashierBarcode(code: string): Promise<CashierOrderLookupResult | null> {
    const raw = (code || '').trim();
    if (!raw) return null;

    // Extract order token from `YEGSHOP:YEG-2501`, `#YEG-2501`, URLs, or plain IDs
    const yegPrefixMatch = raw.match(/YEGSHOP:([A-Z0-9-]+)/i);
    const idPatternMatch = raw.match(/\b((?:YEG|POS)-\d+)\b/i);
    const extracted = (yegPrefixMatch?.[1] || idPatternMatch?.[1] || raw.replace(/^#/, '')).trim();
    const cleanLower = extracted.toLowerCase();
    const digitsOnly = raw.replace(/\D/g, '');

    const publicMatch = this.state.ordersWaiting.find((o) => {
      if (o.orderId.toLowerCase() === cleanLower) return true;
      const waDigits = o.whatsapp.replace(/\D/g, '');
      return digitsOnly.length >= 8 && waDigits.endsWith(digitsOnly.slice(-9));
    });

    if (publicMatch) {
      const itemOrderId = publicMatch.linkedCashierOrderId || publicMatch.orderId;
      const items = this.state.orderItems.filter((i) => i.orderId === itemOrderId);
      return {
        orderId: publicMatch.orderId,
        source: 'PUBLIC',
        queueNumber: publicMatch.queueNumber,
        customerName: publicMatch.customerName,
        whatsapp: publicMatch.whatsapp,
        institution: publicMatch.institution,
        address: publicMatch.address,
        deadline: publicMatch.deadline,
        timestamp: publicMatch.timestamp,
        orderStatus: publicMatch.orderStatus,
        paymentMethod: publicMatch.paymentMethod,
        paymentStatus: publicMatch.paymentStatus,
        customerNotes: publicMatch.customerNotes || '',
        adminNotes: publicMatch.adminNotes || '',
        linkedCashierOrderId: publicMatch.linkedCashierOrderId,
        totalTransaction: publicMatch.totalTransaction,
        dpAmount: publicMatch.dpAmount,
        remainingAmount: publicMatch.remainingAmount,
        items,
      };
    }

    const cashierMatch = this.state.ordersCashier.find((c) => {
      if (c.orderId.toLowerCase() === cleanLower) return true;
      const waDigits = c.whatsapp.replace(/\D/g, '');
      return digitsOnly.length >= 8 && waDigits.endsWith(digitsOnly.slice(-9));
    });

    if (cashierMatch) {
      const items = this.state.orderItems.filter((i) => i.orderId === cashierMatch.orderId);
      const prod = this.state.production.find((p) => p.orderId === cashierMatch.orderId);
      return {
        orderId: cashierMatch.orderId,
        source: 'ADMIN_CASHIER',
        queueNumber: cashierMatch.queueNumber,
        customerName: cashierMatch.customerName,
        whatsapp: cashierMatch.whatsapp,
        institution: cashierMatch.institution || '',
        address: '',
        deadline: cashierMatch.deadline,
        timestamp: cashierMatch.timestamp,
        orderStatus: prod?.stage === 'QC & Siap Kirim' ? 'Siap Diambil / Dikirim' : 'Diproses',
        paymentMethod: cashierMatch.paymentMethod,
        paymentStatus: cashierMatch.paymentStatus,
        customerNotes: cashierMatch.transactionNotes || '',
        adminNotes: cashierMatch.transactionNotes || '',
        totalTransaction: cashierMatch.totalTransaction,
        dpAmount: cashierMatch.dpAmount,
        remainingAmount: cashierMatch.remainingAmount,
        items,
      };
    }

    return null;
  }

  async lookupOrders(query: string): Promise<PublicOrderLookupResult[]> {
    const clean = query.trim().toLowerCase().replace(/^#/, '');
    const digitsOnly = query.replace(/\D/g, '');
    if (!clean) return [];

    const results: PublicOrderLookupResult[] = [];

    for (const o of this.state.ordersWaiting) {
      const matchOrder = o.orderId.toLowerCase() === clean || o.orderId.toLowerCase().includes(clean);
      const waDigits = o.whatsapp.replace(/\D/g, '');
      const matchWa = digitsOnly.length >= 6 && waDigits.endsWith(digitsOnly.slice(-8));
      if (matchOrder || matchWa) {
        const prod = this.state.production.find(
          (p) => p.orderId === o.orderId || (o.linkedCashierOrderId && p.orderId === o.linkedCashierOrderId)
        );
        const items = this.state.orderItems.filter(
          (i) => i.orderId === (o.linkedCashierOrderId || o.orderId)
        );
        results.push({
          orderId: o.orderId,
          source: 'PUBLIC',
          queueNumber: o.queueNumber,
          customerName: o.customerName,
          institution: o.institution,
          timestamp: o.timestamp,
          deadline: o.deadline,
          totalTransaction: o.totalTransaction,
          dpAmount: o.dpAmount,
          remainingAmount: o.remainingAmount,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          productionStage: prod?.stage || 'Antrean Masuk',
          items,
        });
      }
    }

    for (const c of this.state.ordersCashier) {
      const matchOrder = c.orderId.toLowerCase() === clean || c.orderId.toLowerCase().includes(clean);
      const waDigits = c.whatsapp.replace(/\D/g, '');
      const matchWa = digitsOnly.length >= 6 && waDigits.endsWith(digitsOnly.slice(-8));
      if (matchOrder || matchWa) {
        const prod = this.state.production.find(
          (p) => p.orderId === c.orderId || (c.sourceOrderId && p.orderId === c.sourceOrderId)
        );
        const items = this.state.orderItems.filter((i) => i.orderId === c.orderId);
        results.push({
          orderId: c.orderId,
          source: 'ADMIN_CASHIER',
          queueNumber: c.queueNumber,
          customerName: c.customerName,
          institution: c.institution,
          timestamp: c.timestamp,
          deadline: c.deadline,
          totalTransaction: c.totalTransaction,
          dpAmount: c.dpAmount,
          remainingAmount: c.remainingAmount,
          paymentMethod: c.paymentMethod,
          paymentStatus: c.paymentStatus,
          orderStatus: prod?.stage === 'QC & Siap Kirim' ? 'Siap Diambil / Dikirim' : 'Diproses',
          productionStage: prod?.stage || 'Antrean Masuk',
          items,
        });
      }
    }

    return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async getDashboardSummary() {
    const verifiedStatuses: PublicPaymentStatus[] = ['DP Terverifikasi', 'Lunas'];
    const unlinkedPublicOrders = this.state.ordersWaiting.filter((o) => !o.linkedCashierOrderId);
    const totalPublicOrders = this.state.ordersWaiting.length;
    const totalCashierOrders = this.state.ordersCashier.length;
    const pendingConfirmationCount = this.state.ordersWaiting.filter(
      (o) => o.orderStatus === 'Menunggu konfirmasi admin'
    ).length;
    const verifiedPaymentsCount = this.state.payments.filter((p) =>
      verifiedStatuses.includes(p.status)
    ).length;
    const inProductionCount = this.state.production.filter(
      (p) => p.stage !== 'QC & Siap Kirim'
    ).length;
    const completedCount =
      this.state.ordersWaiting.filter((o) => o.orderStatus === 'Selesai').length +
      this.state.production.filter((p) => p.stage === 'QC & Siap Kirim').length;
    const totalPublicValue = unlinkedPublicOrders.reduce(
      (s, o) => s + o.totalTransaction,
      0
    );
    const totalCashierValue = this.state.ordersCashier.reduce(
      (s, o) => s + o.totalTransaction,
      0
    );

    return {
      totalPublicOrders,
      totalCashierOrders,
      pendingConfirmationCount,
      verifiedPaymentsCount,
      inProductionCount,
      completedCount,
      totalPublicValue,
      totalCashierValue,
    };
  }

  async getPublicOrders(): Promise<OrderWaitingRecord[]> {
    return this.state.ordersWaiting.map((o) => ({
      ...o,
      items: this.state.orderItems.filter(
        (i) => i.orderId === (o.linkedCashierOrderId || o.orderId)
      ),
    }));
  }

  async updatePublicOrder(
    orderId: string,
    patch: {
      orderStatus?: OrderWorkflowStatus;
      paymentStatus?: PublicPaymentStatus;
      adminNotes?: string;
    }
  ): Promise<OrderWaitingRecord | null> {
    return this.withMutex(() => {
      const order = this.state.ordersWaiting.find((o) => o.orderId === orderId);
      if (!order) return null;

      if (patch.orderStatus) order.orderStatus = patch.orderStatus;
      if (patch.paymentStatus) {
        order.paymentStatus = patch.paymentStatus;
        const payment = this.state.payments.find((p) => p.orderId === orderId);
        if (payment) {
          payment.status = patch.paymentStatus;
          if (patch.paymentStatus === 'DP Terverifikasi' || patch.paymentStatus === 'Lunas') {
            payment.verifiedBy = 'Admin YEGShop';
            payment.verifiedAt = new Date().toISOString();
          }
        }
      }
      if (patch.adminNotes !== undefined) order.adminNotes = patch.adminNotes;

      this.persistState();
      return {
        ...order,
        items: this.state.orderItems.filter((i) => i.orderId === order.orderId),
      };
    });
  }

  async getCashierHistory(): Promise<OrderAdminCashierRecord[]> {
    return this.state.ordersCashier.map((o) => ({
      ...o,
      items: this.state.orderItems.filter((i) => i.orderId === o.orderId),
    }));
  }

  async getPayments(): Promise<PaymentRecord[]> {
    return [...this.state.payments];
  }

  async verifyPayment(
    paymentId: string,
    status: PublicPaymentStatus,
    verifiedBy: string
  ): Promise<PaymentRecord | null> {
    return this.withMutex(() => {
      const payment = this.state.payments.find((p) => p.paymentId === paymentId);
      if (!payment) return null;

      payment.status = status;
      payment.verifiedBy = verifiedBy;
      payment.verifiedAt = new Date().toISOString();

      const pubOrder = this.state.ordersWaiting.find((o) => o.orderId === payment.orderId);
      if (pubOrder) {
        pubOrder.paymentStatus = status;
        if (
          (status === 'DP Terverifikasi' || status === 'Lunas') &&
          pubOrder.orderStatus === 'Menunggu konfirmasi admin'
        ) {
          pubOrder.orderStatus = 'Diproses';
        }
      }

      const posOrder = this.state.ordersCashier.find((o) => o.orderId === payment.orderId);
      if (posOrder && (status === 'Lunas' || status === 'DP Terverifikasi' || status === 'Belum Dibayar')) {
        posOrder.paymentStatus = status;
      }

      this.persistState();
      return { ...payment };
    });
  }

  async getProductionQueue(): Promise<ProductionRecord[]> {
    return [...this.state.production];
  }

  async updateProductionStage(
    productionId: string,
    stage: ProductionStage,
    notes?: string
  ): Promise<ProductionRecord | null> {
    return this.withMutex(() => {
      const item = this.state.production.find((p) => p.productionId === productionId);
      if (!item) return null;

      item.stage = stage;
      item.updatedAt = new Date().toISOString();
      if (notes !== undefined) item.notes = notes;

      const pubOrder = this.state.ordersWaiting.find((o) => o.orderId === item.orderId);
      if (pubOrder) {
        if (stage === 'QC & Siap Kirim') {
          pubOrder.orderStatus = 'Siap Diambil / Dikirim';
        } else if (stage !== 'Antrean Masuk') {
          pubOrder.orderStatus = 'Dalam Produksi';
        }
      }

      this.persistState();
      return { ...item };
    });
  }

  async getReportsSummary() {
    const unlinkedPublicOrders = this.state.ordersWaiting.filter((o) => !o.linkedCashierOrderId);
    const publicRevenue = unlinkedPublicOrders.reduce((s, o) => s + o.totalTransaction, 0);
    const cashierRevenue = this.state.ordersCashier.reduce((s, o) => s + o.totalTransaction, 0);
    const totalRevenueAllChannels = publicRevenue + cashierRevenue;
    const totalOrdersCount = unlinkedPublicOrders.length + this.state.ordersCashier.length;

    const verifiedPaidAmount = this.state.payments
      .filter((p) => p.status === 'Lunas' || p.status === 'DP Terverifikasi')
      .reduce((s, p) => s + p.amount, 0);

    const outstandingReceivable = Math.max(0, totalRevenueAllChannels - verifiedPaidAmount);

    const productMap = new Map<string, { productName: string; totalQty: number; totalRevenue: number }>();
    for (const item of this.state.orderItems) {
      const prev = productMap.get(item.productId) || {
        productName: item.productName,
        totalQty: 0,
        totalRevenue: 0,
      };
      prev.totalQty += item.qty;
      prev.totalRevenue += item.lineTotal;
      productMap.set(item.productId, prev);
    }

    const methodMap = new Map<string, { method: string; count: number; amount: number }>();
    for (const pay of this.state.payments) {
      const prev = methodMap.get(pay.method) || { method: pay.method, count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += pay.amount;
      methodMap.set(pay.method, prev);
    }

    return {
      totalRevenueAllChannels,
      publicRevenue,
      cashierRevenue,
      totalOrdersCount,
      verifiedPaidAmount,
      outstandingReceivable,
      topProducts: Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
      paymentMethodBreakdown: Array.from(methodMap.values()),
    };
  }

  async refreshCache() {
    return {
      refreshedAt: new Date().toISOString(),
      productCount: this.state.products.filter((p) => p.active).length,
      categoryCount: this.state.categories.filter((c) => c.active).length,
    };
  }
}

/**
 * ProductionWorkerRepository delegates API operations to Cloudflare Worker when configured.
 * In AI Studio demo mode, MockSheetsRepository is active unless CLOUDFLARE_WORKER_URL is enabled.
 */
export class ProductionWorkerRepository {
  private readonly workerBaseUrl: string;
  constructor(workerBaseUrl: string) {
    this.workerBaseUrl = workerBaseUrl.replace(/\/$/, '');
  }

  async proxyRequest<T>(pathSuffix: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.workerBaseUrl}${pathSuffix}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Cloudflare Worker error (${res.status}): ${await res.text()}`);
    }
    return (await res.json()) as T;
  }
}

export const yegRepo: YegRepository = new MockSheetsRepository();
