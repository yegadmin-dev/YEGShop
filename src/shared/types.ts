export type OrderSource = 'PUBLIC' | 'ADMIN_CASHIER';

export type PaymentMethod = 'SeaBank' | 'QRIS' | 'Tunai' | 'Belum Dipilih';

export type PaymentScheme = 'DP' | 'Lunas' | 'Menunggu Konfirmasi';

export type PublicPaymentStatus =
  | 'Menunggu verifikasi pembayaran'
  | 'DP Terverifikasi'
  | 'Lunas'
  | 'Ditolak'
  | 'Belum Dibayar';

export type OrderWorkflowStatus =
  | 'Menunggu konfirmasi admin'
  | 'Diproses'
  | 'Dalam Produksi'
  | 'Quality Control'
  | 'Siap Diambil / Dikirim'
  | 'Selesai'
  | 'Dibatalkan';

export type ProductionStage =
  | 'Antrean Masuk'
  | 'Potong Bahan'
  | 'Hotprint Emboss'
  | 'Rakit & Jahit Siku'
  | 'QC & Siap Kirim';

export interface StoreSettings {
  storeName: string;
  providerName: string;
  domain: string;
  profileUrl: string;
  currency: 'IDR';
  seabankAccountNumber: string;
  seabankAccountName: string;
  qrisFileId: string;
  assetsFolderId: string;
  adminWhatsapp: string;
  whatsappPrefix: string;
  operatingHours: string;
  workshopAddress: string;
  minDpPercent: number;
  defaultCashierName: string;
  demoMode: boolean;
}

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  imageFileId: string;
  active: boolean;
  sortOrder: number;
}

export interface ProductOptionField {
  optionId: string;
  productId: string;
  key: string;
  label: string;
  type: 'select' | 'swatch' | 'text' | 'textarea' | 'file' | 'radio';
  values: string[];
  required: boolean;
  helpText?: string;
  sortOrder: number;
}

export interface PriceRule {
  ruleId: string;
  productId: string;
  variantKey: string; // e.g., 'Only Cover', '2 lembar', ..., '24 lembar', or 'default'
  minQty: number;
  maxQty: number | null; // null = unlimited (101+)
  unitPrice: number;
  active: boolean;
}

export interface AddonOption {
  optionId: string;
  addonId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Addon {
  addonId: string;
  slug: string;
  name: string;
  description: string;
  pricePerPcs: number;
  imageFileId: string;
  applicableProducts: string[]; // e.g., ['map-k13'] or ['map-k13', 'map-full-colour']
  requiresOption: boolean;
  options?: AddonOption[];
  active: boolean;
  sortOrder: number;
}

export interface Product {
  productId: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  fullDescription: string;
  mainImageFileId: string;
  galleryFileIds: string[];
  priceModel: 'tier_sheet' | 'tier_unit';
  minOrderQty: number;
  estimatedDays: string;
  isMapProduct: boolean;
  active: boolean;
  featured: boolean;
  bestSeller: boolean;
  isNew: boolean;
  sortOrder: number;
  options: ProductOptionField[];
  priceRules: PriceRule[];
}

export interface SelectedAddonInput {
  addonId: string;
  selectedOption?: string;
}

export interface ConfiguredItemInput {
  productId: string;
  qty: number;
  specifications: Record<string, string>;
  addons: SelectedAddonInput[];
  logoFileName?: string;
  logoPreviewDataUrl?: string;
}

export interface CartItem extends ConfiguredItemInput {
  cartItemId: string;
  productName: string;
  productSlug: string;
  imageFileId: string;
  unitBasePrice: number;
  unitAddonsPrice: number;
  unitTotalPrice: number;
  lineBaseSubtotal: number;
  lineAddonsSubtotal: number;
  lineTotal: number;
  tierLabel: string;
  addonBreakdown: Array<{
    addonId: string;
    name: string;
    selectedOption?: string;
    pricePerPcs: number;
    subtotal: number;
  }>;
}

export interface QuoteResult {
  productId: string;
  productName: string;
  qty: number;
  tierLabel: string;
  unitBasePrice: number;
  unitAddonsPrice: number;
  unitTotalPrice: number;
  lineBaseSubtotal: number;
  lineAddonsSubtotal: number;
  lineTotal: number;
  addonBreakdown: Array<{
    addonId: string;
    name: string;
    selectedOption?: string;
    pricePerPcs: number;
    subtotal: number;
  }>;
  nextTierTip?: {
    targetQty: number;
    newUnitBasePrice: number;
    savingsPerPcs: number;
  } | null;
}

export interface OrderItemRecord {
  itemId: string;
  orderId: string;
  source: OrderSource;
  productId: string;
  productName: string;
  qty: number;
  unitBasePrice: number;
  unitAddonsPrice: number;
  lineSubtotal: number;
  lineAddonsTotal: number;
  lineTotal: number;
  specifications: Record<string, string>;
  addons: Array<{
    addonId: string;
    name: string;
    selectedOption?: string;
    pricePerPcs: number;
    subtotal: number;
  }>;
  logoFileName?: string;
}

export interface OrderWaitingRecord {
  orderId: string;
  timestamp: string;
  customerName: string;
  whatsapp: string;
  institution: string;
  address: string;
  source: 'PUBLIC';
  subtotal: number;
  totalAddons: number;
  totalTransaction: number;
  dpAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentScheme;
  paymentProofFileId: string;
  paymentProofDataUrl?: string;
  queueNumber: string;
  deadline: string;
  paymentStatus: PublicPaymentStatus;
  orderStatus: OrderWorkflowStatus;
  adminNotes: string;
  customerNotes?: string;
  linkedCashierOrderId?: string;
  idempotencyKey: string;
  items?: OrderItemRecord[];
}

export interface OrderAdminCashierRecord {
  orderId: string;
  timestamp: string;
  source: 'ADMIN_CASHIER';
  sourceOrderId?: string;
  customerName: string;
  whatsapp: string;
  institution?: string;
  cashierName: string;
  itemTypeCount: number;
  totalQty: number;
  productSubtotal: number;
  totalAddons: number;
  totalTransaction: number;
  dpAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar';
  cashReceived: number;
  changeAmount: number;
  queueNumber: string;
  deadline: string;
  transactionNotes: string;
  items?: OrderItemRecord[];
}

export interface CashierOrderLookupResult {
  orderId: string;
  source: OrderSource;
  queueNumber: string;
  customerName: string;
  whatsapp: string;
  institution: string;
  address: string;
  deadline: string;
  timestamp: string;
  orderStatus: OrderWorkflowStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PublicPaymentStatus;
  customerNotes: string;
  adminNotes: string;
  linkedCashierOrderId?: string;
  totalTransaction: number;
  dpAmount: number;
  remainingAmount: number;
  items: OrderItemRecord[];
}

export interface PaymentRecord {
  paymentId: string;
  orderId: string;
  source: OrderSource;
  customerName: string;
  method: PaymentMethod;
  paymentType: PaymentScheme;
  amount: number;
  totalTransaction: number;
  proofFileId: string;
  proofDataUrl?: string;
  status: PublicPaymentStatus;
  verifiedBy: string;
  verifiedAt: string;
  createdAt: string;
}

export interface ProductionRecord {
  productionId: string;
  orderId: string;
  source: OrderSource;
  queueNumber: string;
  customerName: string;
  institution?: string;
  productSummary: string;
  totalQty: number;
  deadline: string;
  stage: ProductionStage;
  notes: string;
  updatedAt: string;
}

export interface PublicOrderLookupResult {
  orderId: string;
  source: OrderSource;
  queueNumber: string;
  customerName: string;
  institution?: string;
  timestamp: string;
  deadline: string;
  totalTransaction: number;
  dpAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PublicPaymentStatus;
  orderStatus: OrderWorkflowStatus;
  productionStage: ProductionStage;
  items: OrderItemRecord[];
}

export interface AiSpecSuggestion {
  summary: string;
  recommendedProduct: string;
  recommendedSheetCount: string;
  recommendedAddons: string[];
  volumeOptimizationTip: string;
  estimatedUnitRange: string;
  estimatedProductionDays: string;
  considerations: string[];
}

export interface AiProductionAnalysis {
  executiveSummary: string;
  bottleneckAlerts: string[];
  priorityQueueRecommendations: Array<{
    orderId: string;
    queueNumber: string;
    reason: string;
  }>;
  channelInsights: string;
  actionChecklist: string[];
}
