import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit2,
  FolderOpen,
  Layers,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { ProductConfigurator } from '../components/ProductConfigurator.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import {
  calculateConfiguredQuote,
  formatRupiah,
  getFutureIsoDate,
  getTodayIsoDate,
} from '../shared/pricing.ts';
import type {
  CartItem,
  ConfiguredItemInput,
  OrderAdminCashierRecord,
  OrderItemRecord,
  PaymentMethod,
  Product,
} from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

interface HeldPosOrder {
  id: string;
  label: string;
  savedAt: string;
  items: CartItem[];
}

const HELD_ORDERS_KEY = 'yegshop_pos_held_orders_v1';

function getCategoryIcon(slug: string) {
  if (slug.includes('map')) return BookOpen;
  if (slug.includes('percetakan')) return Printer;
  if (slug.includes('custom')) return Sparkles;
  return FolderOpen;
}

function getLowestUnitPrice(product: Product): number {
  return product.priceRules.reduce(
    (min, r) => (r.active && r.unitPrice < min ? r.unitPrice : min),
    Infinity
  );
}

export function AdminCashierPage() {
  const { categories, products, addons, loadingCatalog, notify, settings } = useStore();

  // Left panel filter/search state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Specification Modal state (opened when clicking a product card or editing cart item)
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Right Checkout Cart state
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>(() => {
    try {
      const saved = sessionStorage.getItem(HELD_ORDERS_KEY);
      return saved ? (JSON.parse(saved) as HeldPosOrder[]) : [];
    } catch {
      return [];
    }
  });

  // Payment Checkout Modal state (opened when clicking "Bayar")
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [institution, setInstitution] = useState('');
  const [cashierName, setCashierName] = useState('Mochamad Ridhwan M.');
  const [deadline, setDeadline] = useState(getFutureIsoDate(7));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar'>('Lunas');
  const [dpInput, setDpInput] = useState('');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  const [receiptResult, setReceiptResult] = useState<{
    order: OrderAdminCashierRecord;
    items: OrderItemRecord[];
  } | null>(null);

  const persistHeldOrders = (next: HeldPosOrder[]) => {
    setHeldOrders(next);
    try {
      sessionStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.categorySlug === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const subtotalBase = useMemo(
    () => posCart.reduce((sum, i) => sum + i.lineBaseSubtotal, 0),
    [posCart]
  );
  const subtotalAddons = useMemo(
    () => posCart.reduce((sum, i) => sum + i.lineAddonsSubtotal, 0),
    [posCart]
  );
  const posTotal = useMemo(() => posCart.reduce((sum, i) => sum + i.lineTotal, 0), [posCart]);
  const defaultMinDp = Math.ceil(posTotal * 0.5);

  const paidAmount = useMemo(() => {
    if (paymentStatus === 'Belum Dibayar') return 0;
    if (paymentStatus === 'Lunas') return posTotal;
    const val = Number(dpInput);
    if (Number.isFinite(val) && val > 0 && val <= posTotal) return Math.round(val);
    return defaultMinDp;
  }, [paymentStatus, posTotal, dpInput, defaultMinDp]);

  const cashReceived = useMemo(() => {
    if (paymentMethod !== 'Tunai') return paidAmount;
    const val = Number(cashReceivedInput);
    return Number.isFinite(val) && val > 0 ? Math.round(val) : paidAmount;
  }, [paymentMethod, cashReceivedInput, paidAmount]);

  const changeAmount =
    paymentMethod === 'Tunai' && cashReceived >= paidAmount ? cashReceived - paidAmount : 0;

  const buildCartItem = (
    cartItemId: string,
    product: Product,
    config: ConfiguredItemInput
  ): CartItem => {
    const quote = calculateConfiguredQuote(product, addons, config);
    return {
      ...config,
      cartItemId,
      productName: product.name,
      productSlug: product.slug,
      imageFileId: product.mainImageFileId,
      unitBasePrice: quote.unitBasePrice,
      unitAddonsPrice: quote.unitAddonsPrice,
      unitTotalPrice: quote.unitTotalPrice,
      lineBaseSubtotal: quote.lineBaseSubtotal,
      lineAddonsSubtotal: quote.lineAddonsSubtotal,
      lineTotal: quote.lineTotal,
      tierLabel: quote.tierLabel,
      addonBreakdown: quote.addonBreakdown,
    };
  };

  const handleOpenProductModal = (product: Product) => {
    setEditingCartItem(null);
    setModalProduct(product);
  };

  const handleOpenEditCartItem = (item: CartItem) => {
    const prod = products.find((p) => p.productId === item.productId);
    if (!prod) return;
    setEditingCartItem(item);
    setModalProduct(prod);
  };

  const handleSubmitProductModal = (config: ConfiguredItemInput) => {
    if (!modalProduct) return;
    if (editingCartItem) {
      const updated = buildCartItem(editingCartItem.cartItemId, modalProduct, config);
      setPosCart((prev) =>
        prev.map((c) => (c.cartItemId === editingCartItem.cartItemId ? updated : c))
      );
      notify(`Spesifikasi ${modalProduct.name} diperbarui.`, 'success');
    } else {
      const newId = `POSCI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item = buildCartItem(newId, modalProduct, config);
      setPosCart((prev) => [...prev, item]);
      notify(`${modalProduct.name} (${item.qty} pcs) masuk ke Checkout.`, 'success');
    }
    setModalProduct(null);
    setEditingCartItem(null);
  };

  const handleAdjustCartQty = (cartItemId: string, delta: number) => {
    setPosCart((prev) =>
      prev.map((existing) => {
        if (existing.cartItemId !== cartItemId) return existing;
        const product = products.find((p) => p.productId === existing.productId);
        if (!product) return existing;
        const nextQty = Math.max(1, existing.qty + delta);
        return buildCartItem(cartItemId, product, { ...existing, qty: nextQty });
      })
    );
  };

  const handleCancelOrder = () => {
    if (posCart.length === 0) return;
    setPosCart([]);
    notify('Daftar checkout kasir dikosongkan.', 'info');
  };

  const handleHoldOrder = () => {
    if (posCart.length === 0) {
      notify('Keranjang checkout masih kosong untuk ditahan.', 'info');
      return;
    }
    const label = customerName.trim() || `Antrean Tahan (${posCart.length} item)`;
    const held: HeldPosOrder = {
      id: `HOLD-${Date.now()}`,
      label,
      savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items: posCart,
    };
    persistHeldOrders([held, ...heldOrders]);
    setPosCart([]);
    notify(`Pesanan "${label}" disimpan sementara.`, 'success');
  };

  const handleRestoreHeldOrder = (held: HeldPosOrder) => {
    setPosCart(held.items);
    persistHeldOrders(heldOrders.filter((h) => h.id !== held.id));
    notify(`Pesanan "${held.label}" dimuat kembali ke Checkout.`, 'info');
  };

  const handleCompletePayment = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (posCart.length === 0) {
      setError('Daftar checkout masih kosong.');
      return;
    }
    if (!customerName.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await yegRepositories.orders.createCashierOrder({
        customerName: customerName.trim(),
        whatsapp: whatsapp.trim(),
        institution: institution.trim(),
        cashierName: cashierName.trim() || 'Kasir YEG Production',
        deadline,
        paymentMethod,
        paymentStatus,
        dpAmount: paidAmount,
        cashReceived: paymentMethod === 'Tunai' ? cashReceived : paidAmount,
        transactionNotes: notes.trim(),
        idempotencyKey,
        items: posCart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          specifications: c.specifications,
          addons: c.addons,
          logoFileName: c.logoFileName,
          logoPreviewDataUrl: c.logoPreviewDataUrl,
        })),
      });

      setReceiptResult({ order: res.order, items: res.items });
      setPosCart([]);
      setPayModalOpen(false);
      setCustomerName('');
      setWhatsapp('');
      setInstitution('');
      setDpInput('');
      setCashReceivedInput('');
      setNotes('');
      setIdempotencyKey(`POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      notify(`Transaksi Kasir ${res.order.orderId} berhasil disimpan.`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Kasir POS Workshop"
      subtitle="Klik produk untuk atur spesifikasi & add-on, lalu selesaikan di panel Checkout"
    >
      <div className="space-y-5">
        {/* Post-Transaction Success & Receipt Banner */}
        {receiptResult && (
          <div className="bg-[#065E46] text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-xs text-[#10B981]">
                  {receiptResult.order.orderId} · Antrean {receiptResult.order.queueNumber}
                </div>
                <h2 className="font-display font-bold text-lg">
                  Transaksi Tersimpan — {receiptResult.order.customerName}
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 font-mono tabular-nums">
                  Total {formatRupiah(receiptResult.order.totalTransaction)} · Dibayar{' '}
                  {formatRupiah(receiptResult.order.dpAmount)} · Sisa{' '}
                  {formatRupiah(receiptResult.order.remainingAmount)}
                  {receiptResult.order.changeAmount > 0
                    ? ` · Kembalian ${formatRupiah(receiptResult.order.changeAmount)}`
                    : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  downloadReceiptJpg({
                    orderId: receiptResult.order.orderId,
                    queueNumber: receiptResult.order.queueNumber,
                    sourceLabel: settings?.demoMode ? 'KASIR POS (DEMO)' : 'KASIR POS',
                    timestamp: receiptResult.order.timestamp,
                    deadline: receiptResult.order.deadline,
                    customerName: receiptResult.order.customerName,
                    whatsapp: receiptResult.order.whatsapp,
                    institution: receiptResult.order.institution,
                    items: receiptResult.items,
                    subtotal: receiptResult.order.productSubtotal,
                    totalAddons: receiptResult.order.totalAddons,
                    totalTransaction: receiptResult.order.totalTransaction,
                    paidAmount: receiptResult.order.dpAmount,
                    remainingAmount: receiptResult.order.remainingAmount,
                    paymentMethod: receiptResult.order.paymentMethod,
                    paymentStatus: receiptResult.order.paymentStatus,
                    cashReceived: receiptResult.order.cashReceived,
                    changeAmount: receiptResult.order.changeAmount,
                    cashierName: receiptResult.order.cashierName,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] text-[#06150E] text-xs font-bold hover:bg-[#059669] hover:text-white cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Struk JPG</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptResult(null)}
                className="px-3 py-2 rounded-xl border border-white/30 text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Held Orders Bar (if any) */}
        {heldOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-[#10B981] p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-800">
              Pesanan Ditahan ({heldOrders.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {heldOrders.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleRestoreHeldOrder(h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAF9] border border-slate-300 text-xs font-semibold text-[#065E46] hover:border-[#065E46] cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>
                    {h.label} ({h.savedAt})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main 2-Column POS Layout matching reference */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT ZONE: Product Grid + Bottom Category Tiles */}
          <div className="xl:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
              {/* Top Bar of Product Panel */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to="/admin/catalog"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-[#065E46] uppercase tracking-wide"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kelola Katalog Produk</span>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[280px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari barang di sini..."
                    className="flex-1 h-10 px-4 rounded-full border border-slate-200 bg-[#F8FAF9] text-xs focus:outline-none focus:bg-white focus:border-[#065E46]"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchQuery((q) => q.trim())}
                    aria-label="Cari produk"
                    className="w-10 h-10 rounded-full bg-[#065E46] text-white flex items-center justify-center hover:bg-[#054735] shrink-0 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Product Cards Grid */}
              {loadingCatalog ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-48 rounded-xl border border-slate-200 bg-[#F8FAF9] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Produk tidak ditemukan
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#065E46] text-white text-xs font-semibold cursor-pointer"
                  >
                    Tampilkan Semua Produk
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
                  {filteredProducts.map((product) => {
                    const lowestPrice = getLowestUnitPrice(product);
                    return (
                      <button
                        key={product.productId}
                        type="button"
                        onClick={() => handleOpenProductModal(product)}
                        className="group bg-white rounded-xl border border-slate-200 hover:border-[#065E46] hover:shadow-sm p-3 flex flex-col items-center text-center justify-between transition-all cursor-pointer"
                      >
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#F8FAF9] mb-2.5">
                          <SafeImage
                            fileId={product.mainImageFileId}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                          />
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="font-display font-semibold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-[#065E46]">
                            {product.name}
                          </div>
                          <div className="font-mono font-bold text-xs text-[#059669] tabular-nums">
                            {Number.isFinite(lowestPrice)
                              ? `Mulai ${formatRupiah(lowestPrice)}`
                              : 'Custom'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Category Selector Strip + Order Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`p-3 rounded-xl border bg-white flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'border-2 border-[#065E46] text-[#065E46]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span className="text-xs font-semibold">Semua Produk</span>
                </button>
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.slug);
                  const active = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`p-3 rounded-xl border bg-white flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer ${
                        active
                          ? 'border-2 border-[#065E46] text-[#065E46]'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold leading-tight line-clamp-1">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={posCart.length === 0}
                  onClick={handleCancelOrder}
                  className="px-5 py-2.5 rounded-xl border border-red-300 bg-white text-red-700 text-xs font-bold hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                >
                  Batalkan Order
                </button>
                <button
                  type="button"
                  disabled={posCart.length === 0}
                  onClick={handleHoldOrder}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#059669] bg-white text-[#065E46] text-xs font-bold hover:bg-[#065E46]/5 disabled:opacity-40 cursor-pointer"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Tahan Order</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT ZONE: Checkout Panel matching reference */}
          <aside className="xl:col-span-4 space-y-3 xl:sticky xl:top-20">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 text-center">
                <h2 className="font-display font-bold text-base text-slate-900">Checkout</h2>
              </div>

              {/* Column Header */}
              <div className="px-4 py-2.5 bg-[#F8FAF9] border-b border-slate-200 grid grid-cols-12 text-[11px] font-semibold text-slate-500">
                <div className="col-span-5">Nama</div>
                <div className="col-span-4 text-center">QTY</div>
                <div className="col-span-3 text-right">Harga</div>
              </div>

              {/* Line Items */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {posCart.length === 0 ? (
                  <div className="px-5 py-14 text-center text-xs text-slate-400">
                    Klik barang di sebelah kiri untuk memilih spesifikasi dan memasukkannya ke
                    Checkout.
                  </div>
                ) : (
                  posCart.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="px-4 py-3 grid grid-cols-12 items-center gap-1 text-xs"
                    >
                      <div className="col-span-5 flex items-start gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setPosCart((prev) =>
                              prev.filter((x) => x.cartItemId !== item.cartItemId)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 leading-snug line-clamp-2">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {Object.values(item.specifications || {})
                              .filter(Boolean)
                              .slice(0, 2)
                              .join(' · ')}
                          </div>
                          {item.addonBreakdown.length > 0 && (
                            <div className="text-[10px] text-[#059669] truncate">
                              +{item.addonBreakdown.map((a) => a.name).join(', ')}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditCartItem(item)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#065E46] hover:underline mt-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Ubah Spec</span>
                          </button>
                        </div>
                      </div>

                      <div className="col-span-4 flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustCartQty(item.cartItemId, -5)}
                          className="w-6 h-6 rounded-full border border-[#059669] text-[#065E46] flex items-center justify-center hover:bg-[#065E46] hover:text-white cursor-pointer"
                          aria-label="Kurangi 5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-slate-900 w-9 text-center tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustCartQty(item.cartItemId, 5)}
                          className="w-6 h-6 rounded-full border border-[#059669] text-[#065E46] flex items-center justify-center hover:bg-[#065E46] hover:text-white cursor-pointer"
                          aria-label="Tambah 5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="col-span-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(item.lineTotal)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary */}
              <div className="border-t border-slate-200 px-5 py-4 space-y-2 text-xs bg-white">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Produk</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(subtotalBase)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Add-ons Custom</span>
                  <span className="font-mono font-semibold text-[#059669] tabular-nums">
                    +{formatRupiah(subtotalAddons)}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="font-display font-bold text-base text-slate-900">Total</span>
                  <span className="font-mono font-bold text-xl text-[#065E46] tabular-nums">
                    {formatRupiah(posTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Green Pay Button */}
            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={() => {
                setError('');
                setPayModalOpen(true);
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Bayar ({formatRupiah(posTotal)})
            </button>
          </aside>
        </div>

        {/* POPUP 1: Specification Modal when clicking a Product Card or Edit Spec */}
        {modalProduct && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-3 sm:p-5">
            <div className="bg-[#F8FAF9] rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
              <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <SafeImage
                      fileId={modalProduct.mainImageFileId}
                      alt={modalProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#059669]">
                      {modalProduct.categoryName}
                    </div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 truncate">
                      {editingCartItem ? `Ubah Spesifikasi: ${modalProduct.name}` : modalProduct.name}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalProduct(null);
                    setEditingCartItem(null);
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  aria-label="Tutup popup spesifikasi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto">
                <ProductConfigurator
                  key={`${modalProduct.productId}-${editingCartItem?.cartItemId || 'new'}`}
                  product={modalProduct}
                  allAddons={addons}
                  initialConfig={
                    editingCartItem
                      ? {
                          qty: editingCartItem.qty,
                          specifications: editingCartItem.specifications,
                          addons: editingCartItem.addons,
                          logoFileName: editingCartItem.logoFileName,
                          logoPreviewDataUrl: editingCartItem.logoPreviewDataUrl,
                        }
                      : undefined
                  }
                  compactMode={true}
                  submitLabel={
                    editingCartItem ? 'Simpan Perubahan ke Checkout' : 'Masukkan ke Checkout'
                  }
                  onSubmit={handleSubmitProductModal}
                />
              </div>
            </div>
          </div>
        )}

        {/* POPUP 2: Payment & Customer Details Modal when clicking "Bayar" */}
        {payModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-3 sm:p-5">
            <form
              onSubmit={handleCompletePayment}
              className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900">
                    Penyelesaian Pembayaran Kasir POS
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Total Tagihan: {formatRupiah(posTotal)} ({posCart.length} item)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Bpk. Hendra Kusuma"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sekolah / Instansi
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Nama sekolah / umum"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Deadline Selesai
                  </label>
                  <input
                    type="date"
                    min={getTodayIsoDate()}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="SeaBank">SeaBank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(
                        e.target.value as 'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar'
                      )
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="DP Terverifikasi">DP Terverifikasi</option>
                    <option value="Belum Dibayar">Belum Dibayar</option>
                  </select>
                </div>
              </div>

              {paymentStatus === 'DP Terverifikasi' && (
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nominal DP Diterima (Default 50%: {formatRupiah(defaultMinDp)})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, posTotal)}
                    value={dpInput}
                    onChange={(e) => setDpInput(e.target.value)}
                    placeholder={String(defaultMinDp)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
                  />
                </div>
              )}

              {paymentMethod === 'Tunai' && paymentStatus !== 'Belum Dibayar' && (
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Uang Tunai Diterima (Tagihan sekarang: {formatRupiah(paidAmount)})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    placeholder={String(paidAmount)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kasir</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opsional"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Nominal Dibayar Sekarang</span>
                  <span className="font-mono font-bold text-[#065E46] tabular-nums">
                    {formatRupiah(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sisa Pelunasan</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(Math.max(0, posTotal - paidAmount))}
                  </span>
                </div>
                {paymentMethod === 'Tunai' && changeAmount > 0 && (
                  <div className="flex justify-between text-[#059669] font-bold">
                    <span>Kembalian Tunai</span>
                    <span className="font-mono tabular-nums">{formatRupiah(changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi & Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
