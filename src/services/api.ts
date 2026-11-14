import type {
  Addon,
  AiProductionAnalysis,
  AiSpecSuggestion,
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
  QuoteResult,
  StoreSettings,
} from '../shared/types.ts';

const ADMIN_TOKEN_STORAGE_KEY = 'yegshop_admin_token_v1';
const CASHIER_TOKEN_STORAGE_KEY = 'yegshop_cashier_token_v1';
let inMemoryAdminToken: string | null = null;
let inMemoryCashierToken: string | null = null;

function getStoredToken(scope: 'admin' | 'cashier'): string | null {
  if (scope === 'cashier') {
    if (inMemoryCashierToken) return inMemoryCashierToken;
    try {
      const stored = sessionStorage.getItem(CASHIER_TOKEN_STORAGE_KEY);
      if (stored) {
        inMemoryCashierToken = stored;
        return stored;
      }
      return null;
    } catch {
      return inMemoryCashierToken;
    }
  }
  if (inMemoryAdminToken) return inMemoryAdminToken;
  try {
    const stored = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryAdminToken = stored;
      return stored;
    }
    return null;
  } catch {
    return inMemoryAdminToken;
  }
}

function setStoredToken(scope: 'admin' | 'cashier', token: string | null) {
  if (scope === 'cashier') {
    inMemoryCashierToken = token;
  } else {
    inMemoryAdminToken = token;
  }
  const key = scope === 'cashier' ? CASHIER_TOKEN_STORAGE_KEY : ADMIN_TOKEN_STORAGE_KEY;
  try {
    if (token) {
      sessionStorage.setItem(key, token);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage issues; in-memory token remains active
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const isCashierEndpoint = url.startsWith('/api/cashier/');
  const token = isCashierEndpoint
    ? getStoredToken('cashier') || getStoredToken('admin')
    : getStoredToken('admin');
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      if (url.startsWith('/api/admin/') && url !== '/api/admin/login') {
        setStoredToken('admin', null);
      }
      if (isCashierEndpoint && url !== '/api/cashier/login') {
        setStoredToken('cashier', null);
      }
    }
    throw new Error(data?.error || `Terjadi kesalahan server (${res.status})`);
  }
  return data as T;
}

export const yegApi = {
  // Public
  getStoreConfig: () => requestJson<StoreSettings>('/api/store/config'),
  getCategories: () => requestJson<{ items: Category[] }>('/api/catalog/categories'),
  getProducts: (params?: { category?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return requestJson<{ items: Product[] }>(`/api/catalog/products${suffix}`);
  },
  getProductBySlug: (slug: string) =>
    requestJson<{ product: Product; addons: Addon[] }>(`/api/catalog/products/${slug}`),
  getAddons: () => requestJson<{ items: Addon[] }>('/api/catalog/addons'),
  calculateQuote: (input: ConfiguredItemInput) =>
    requestJson<QuoteResult>('/api/quote', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  createPublicOrder: (payload: {
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
  }) =>
    requestJson<{ order: OrderWaitingRecord; items: OrderItemRecord[]; deduplicated: boolean }>(
      '/api/orders',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  lookupStatus: (query: string) =>
    requestJson<{ items: PublicOrderLookupResult[] }>('/api/status', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  consultSpecAi: (payload: {
    question: string;
    qtyEstimate: number;
    budgetPerPcs?: number;
    productSlug?: string;
  }) =>
    requestJson<AiSpecSuggestion>('/api/ai/consult-spec', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Auth
  adminLogin: async (pin: string) => {
    const res = await requestJson<{
      authenticated: boolean;
      adminName: string;
      role: string;
      token?: string;
    }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res.token) {
      setStoredToken('admin', res.token);
    }
    return res;
  },
  adminLogout: async () => {
    try {
      return await requestJson<{ ok: boolean }>('/api/admin/logout', {
        method: 'POST',
      });
    } finally {
      setStoredToken('admin', null);
    }
  },
  adminMe: () =>
    requestJson<{ authenticated: boolean; adminName: string; role: string }>('/api/admin/me'),

  // Cashier Auth & Terminal API (isolated from Admin Portal)
  cashierLogin: async (pin: string, cashierName?: string) => {
    const res = await requestJson<{
      authenticated: boolean;
      cashierName: string;
      role: string;
      token?: string;
    }>('/api/cashier/login', {
      method: 'POST',
      body: JSON.stringify({ pin, cashierName }),
    });
    if (res.token) {
      setStoredToken('cashier', res.token);
    }
    return res;
  },
  cashierLogout: async () => {
    try {
      return await requestJson<{ ok: boolean }>('/api/cashier/logout', {
        method: 'POST',
      });
    } finally {
      setStoredToken('cashier', null);
      setStoredToken('admin', null);
    }
  },
  cashierMe: () =>
    requestJson<{ authenticated: boolean; cashierName: string; role: string }>('/api/cashier/me'),
  enterCashierIsolated: async () => {
    const res = await requestJson<{
      authenticated: boolean;
      cashierName: string;
      role: string;
      token?: string;
    }>('/api/cashier/enter-isolated', {
      method: 'POST',
    });
    setStoredToken('admin', null);
    if (res.token) {
      setStoredToken('cashier', res.token);
    }
    return res;
  },
  createCashierTerminalOrder: (payload: {
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
  }) =>
    requestJson<{
      order: OrderAdminCashierRecord;
      items: OrderItemRecord[];
      deduplicated: boolean;
    }>('/api/cashier/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCashierTerminalHistory: () =>
    requestJson<{ items: OrderAdminCashierRecord[] }>('/api/cashier/history'),
  getCashierWaitingOrders: () =>
    requestJson<{ items: OrderWaitingRecord[] }>('/api/cashier/waiting-orders'),
  lookupCashierBarcode: (code: string) =>
    requestJson<{ result: CashierOrderLookupResult | null }>(
      `/api/cashier/lookup-barcode?code=${encodeURIComponent(code)}`
    ),

  // Admin Protected
  getDashboard: () =>
    requestJson<{
      totalPublicOrders: number;
      totalCashierOrders: number;
      pendingConfirmationCount: number;
      verifiedPaymentsCount: number;
      inProductionCount: number;
      completedCount: number;
      totalPublicValue: number;
      totalCashierValue: number;
    }>('/api/admin/dashboard'),
  getPublicOrders: () => requestJson<{ items: OrderWaitingRecord[] }>('/api/admin/orders'),
  updatePublicOrder: (
    orderId: string,
    patch: {
      orderStatus?: OrderWorkflowStatus;
      paymentStatus?: PublicPaymentStatus;
      adminNotes?: string;
    }
  ) =>
    requestJson<{ order: OrderWaitingRecord }>(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  createCashierOrder: (payload: {
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
  }) =>
    requestJson<{
      order: OrderAdminCashierRecord;
      items: OrderItemRecord[];
      deduplicated: boolean;
    }>('/api/admin/cashier/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCashierHistory: () =>
    requestJson<{ items: OrderAdminCashierRecord[] }>('/api/admin/cashier/history'),
  getPayments: () => requestJson<{ items: PaymentRecord[] }>('/api/admin/payments'),
  verifyPayment: (paymentId: string, status: PublicPaymentStatus, verifiedBy?: string) =>
    requestJson<{ payment: PaymentRecord }>(`/api/admin/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, verifiedBy }),
    }),
  getProductionQueue: () => requestJson<{ items: ProductionRecord[] }>('/api/admin/production'),
  updateProductionStage: (productionId: string, stage: ProductionStage, notes?: string) =>
    requestJson<{ item: ProductionRecord }>(`/api/admin/production/${productionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage, notes }),
    }),
  getAdminCatalogPreview: () =>
    requestJson<{ categories: Category[]; products: Product[]; addons: Addon[] }>(
      '/api/admin/catalog/preview'
    ),
  saveProduct: (product: Product) =>
    requestJson<{ product: Product }>('/api/admin/catalog/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  saveAddon: (addon: Addon) =>
    requestJson<{ addon: Addon }>('/api/admin/catalog/addons', {
      method: 'POST',
      body: JSON.stringify(addon),
    }),
  refreshCatalogCache: () =>
    requestJson<{ refreshedAt: string; productCount: number; categoryCount: number }>(
      '/api/admin/catalog/refresh',
      { method: 'POST' }
    ),
  getReports: () =>
    requestJson<{
      totalRevenueAllChannels: number;
      publicRevenue: number;
      cashierRevenue: number;
      totalOrdersCount: number;
      verifiedPaidAmount: number;
      outstandingReceivable: number;
      topProducts: Array<{ productName: string; totalQty: number; totalRevenue: number }>;
      paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
    }>('/api/admin/reports'),
  updateSettings: (patch: Partial<StoreSettings>) =>
    requestJson<StoreSettings>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  analyzeProductionAi: (question?: string) =>
    requestJson<AiProductionAnalysis>('/api/ai/admin-analyze', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};
