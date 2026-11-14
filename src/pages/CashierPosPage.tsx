import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Edit2,
  FolderOpen,
  Layers,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  QrCode,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupiah } from '../shared/pricing.ts';
import type { Product } from '../shared/types.ts';

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

export function CashierPosPage() {
  const { categories, products, loadingCatalog, notify } = useStore();
  const {
    posCart,
    heldOrders,
    draft,
    subtotalBase,
    subtotalAddons,
    posTotal,
    adjustItemQty,
    setItemQty,
    clearSourceOrderRef,
    removeItem,
    clearCart,
    holdCurrentOrder,
  } = useCashier();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedCategory = searchParams.get('category') || 'ALL';
  const urlQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(urlQuery);

  const setFilterParams = (nextCategory: string, nextQ: string) => {
    const next = new URLSearchParams();
    if (nextCategory && nextCategory !== 'ALL') {
      next.set('category', nextCategory);
    }
    if (nextQ.trim()) {
      next.set('q', nextQ.trim());
    }
    setSearchParams(next);
  };

  const filteredProducts = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.categorySlug === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchInput]);

  const handleCancelOrder = () => {
    if (posCart.length === 0) return;
    clearCart();
    notify('Daftar checkout kasir dikosongkan.', 'info');
  };

  const handleHoldOrder = () => {
    const held = holdCurrentOrder();
    if (!held) {
      notify('Keranjang checkout masih kosong untuk ditahan.', 'info');
      return;
    }
    notify(`Pesanan "${held.label}" disimpan ke daftar Ditahan.`, 'success');
  };

  return (
    <CashierLayout
      title="Terminal Kasir POS"
      subtitle="Klik barang untuk membuka halaman konfigurasi spesifikasi & add-on"
    >
      <div className="space-y-4">
        {/* Source Order Imported via Barcode Scan Banner */}
        {draft.sourceOrderId && (
          <div className="bg-[#ECFDF5] rounded-2xl border border-[#065E46]/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#071A12]">
              Memuat Pesanan Publik{' '}
              <span className="font-mono font-bold text-[#065E46]">#{draft.sourceOrderId}</span>
              {draft.customerName ? ` (${draft.customerName})` : ''} — Edit Qty, ubah spec,
              atau tambah produk sebelum klik Bayar.
            </div>
            <button
              type="button"
              onClick={clearSourceOrderRef}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:border-red-400 hover:text-red-700 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Lepas Referensi</span>
            </button>
          </div>
        )}

        {/* Info link if held orders exist */}
        {heldOrders.length > 0 && (
          <div className="bg-[#EFF8FF] rounded-2xl border border-[#0284C7]/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#071A12]">
              Ada <span className="font-mono font-bold text-[#0284C7]">{heldOrders.length}</span>{' '}
              antrean pesanan yang sedang ditahan.
            </div>
            <Link
              to="/kasir/ditahan"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1]"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Buka Halaman Pesanan Ditahan &rarr;</span>
            </Link>
          </div>
        )}

        {/* Main 2-Column POS Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT ZONE: Product Cards + Category Tiles */}
          <div className="xl:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
              {/* Search & Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-base text-slate-900">
                    Pilih Produk Workshop
                  </h1>
                  <p className="text-xs text-slate-500">
                    Ketuk produk untuk mengatur jumlah lembar, warna bahan, &amp; add-on, atau
                    muat pesanan pelanggan via Scan Barcode.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Link
                    to="/kasir/scan"
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1] shrink-0 whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan Barcode</span>
                  </Link>
                  <div className="flex items-center gap-2 flex-1 sm:min-w-[230px]">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        setFilterParams(selectedCategory, val);
                      }}
                      placeholder="Cari barang di sini..."
                      className="flex-1 h-10 px-4 rounded-full border border-slate-200 bg-[#F8FAF9] text-xs focus:outline-none focus:bg-white focus:border-[#065E46]"
                    />
                    <button
                      type="button"
                      onClick={() => setFilterParams(selectedCategory, searchInput)}
                      aria-label="Cari produk"
                      className="w-10 h-10 rounded-full bg-[#065E46] text-white flex items-center justify-center hover:bg-[#054735] shrink-0 cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Cards Grid — Clicking navigates to dedicated page /kasir/produk/:slug */}
              {loadingCatalog ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-48 rounded-2xl border border-slate-200 bg-[#F8FAF9] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Produk tidak ditemukan</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setFilterParams('ALL', '');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#065E46] text-white text-xs font-semibold cursor-pointer"
                  >
                    Tampilkan Semua Produk
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {filteredProducts.map((product) => {
                    const lowestPrice = getLowestUnitPrice(product);
                    return (
                      <Link
                        key={product.productId}
                        to={`/kasir/produk/${product.slug}`}
                        className="group bg-white rounded-2xl border border-slate-200 hover:border-[#065E46] hover:shadow-sm p-3 flex flex-col items-center text-center justify-between transition-all"
                      >
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#F8FAF9] mb-2.5">
                          <SafeImage
                            fileId={product.mainImageFileId}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                          />
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="font-display font-semibold text-xs text-[#071A12] line-clamp-2 leading-snug group-hover:text-[#065E46]">
                            {product.name}
                          </div>
                          <div className="font-mono font-bold text-xs text-[#059669] tabular-nums">
                            {Number.isFinite(lowestPrice)
                              ? `Mulai ${formatRupiah(lowestPrice)}`
                              : 'Custom'}
                          </div>
                        </div>
                      </Link>
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
                  onClick={() => setFilterParams('ALL', searchInput)}
                  className={`p-3 rounded-2xl border bg-white flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer ${
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
                      onClick={() => setFilterParams(cat.slug, searchInput)}
                      className={`p-3 rounded-2xl border bg-white flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer ${
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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#065E46] bg-white text-[#065E46] text-xs font-bold hover:bg-[#ECFDF5] disabled:opacity-40 cursor-pointer"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Tahan Order</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT ZONE: Checkout Panel */}
          <aside className="xl:col-span-4 space-y-3 xl:sticky xl:top-20">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-[#071A12]">Checkout</h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {posCart.length} item
                </span>
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
                    Klik barang di sebelah kiri untuk membuka halaman spesifikasi dan memasukkannya ke
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
                          onClick={() => removeItem(item.cartItemId)}
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
                          <Link
                            to={`/kasir/produk/${item.productSlug}?edit=${encodeURIComponent(
                              item.cartItemId
                            )}`}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#065E46] hover:underline mt-0.5"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Ubah Spec</span>
                          </Link>
                        </div>
                      </div>

                      <div className="col-span-4 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustItemQty(item.cartItemId, -5)}
                          className="w-6 h-6 rounded-full border border-[#065E46] text-[#065E46] flex items-center justify-center hover:bg-[#065E46] hover:text-white cursor-pointer shrink-0"
                          aria-label="Kurangi 5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (Number.isFinite(val) && val >= 1) {
                              setItemQty(item.cartItemId, val);
                            }
                          }}
                          aria-label={`Jumlah ${item.productName}`}
                          className="font-mono font-bold text-slate-900 w-12 h-7 rounded-lg border border-slate-200 bg-[#F8FAF9] text-center text-xs tabular-nums focus:outline-none focus:bg-white focus:border-[#065E46]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustItemQty(item.cartItemId, 5)}
                          className="w-6 h-6 rounded-full border border-[#065E46] text-[#065E46] flex items-center justify-center hover:bg-[#065E46] hover:text-white cursor-pointer shrink-0"
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
                  <span className="font-display font-bold text-base text-[#071A12]">Total</span>
                  <span className="font-mono font-bold text-xl text-[#065E46] tabular-nums">
                    {formatRupiah(posTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Green Pay Button -> Navigates to dedicated /kasir/bayar page */}
            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={() => navigate('/kasir/bayar')}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Bayar ({formatRupiah(posTotal)}) &rarr;
            </button>
          </aside>
        </div>
      </div>
    </CashierLayout>
  );
}
