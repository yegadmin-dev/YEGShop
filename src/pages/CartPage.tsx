import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupiah } from '../shared/pricing.ts';

export function CartPage() {
  const { cart, updateCartItem, removeCartItem, clearCart, cartTotal } = useStore();
  const navigate = useNavigate();

  const totalBase = cart.reduce((sum, item) => sum + item.lineBaseSubtotal, 0);
  const totalAddons = cart.reduce((sum, item) => sum + item.lineAddonsSubtotal, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
              Keranjang Belanja
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Periksa rincian spesifikasi, add-on, dan kuantitas sebelum lanjut ke checkout.
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="px-3.5 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
            >
              Kosongkan Keranjang
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <RevealBlock className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#065E46]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display font-bold text-lg text-[#071A12]">
                Keranjang Anda Masih Kosong
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Pilih produk Map Rapor K-13, Map Full-Colour, atau produk percetakan lainnya dari
                katalog kami.
              </p>
            </div>
            <Link
              to="/catalog"
              className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-sm font-semibold hover:bg-[#054735]"
            >
              <span>Jelajahi Katalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </RevealBlock>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items Compact Grid (2-up mobile, 3-up wide tablet, 2-up desktop) */}
            <RevealBlock className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 sm:gap-4">
              {cart.map((item) => {
                const specEntries = Object.entries(item.specifications || {}).filter(
                  ([, v]) => v && v.trim() !== ''
                );

                return (
                  <div
                    key={item.cartItemId}
                    className="yeg-hover-lift bg-white rounded-xl border border-slate-200 p-2.5 sm:p-4 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-2">
                      <div className="relative">
                        <Link
                          to={`/product/${item.productSlug}`}
                          className="block w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-[#F8FAF9]"
                        >
                          <SafeImage
                            fileId={item.imageFileId}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.cartItemId)}
                          aria-label={`Hapus ${item.productName}`}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/95 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <Link
                          to={`/product/${item.productSlug}`}
                          className="font-display font-bold text-xs sm:text-sm text-[#071A12] hover:text-[#065E46] line-clamp-2 leading-snug"
                        >
                          {item.productName}
                        </Link>
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-mono truncate">
                          {item.tierLabel} · {formatRupiah(item.unitBasePrice)}/pcs
                        </div>
                      </div>

                      {specEntries.length > 0 && (
                        <div className="text-[10px] sm:text-xs text-slate-600 bg-[#F8FAF9] rounded-lg p-2 border border-slate-200 space-y-0.5">
                          {specEntries.slice(0, 2).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="font-semibold text-slate-700 capitalize">{k}:</span>{' '}
                              <span>{v}</span>
                            </div>
                          ))}
                          {specEntries.length > 2 && (
                            <div className="text-[10px] text-slate-500">
                              +{specEntries.length - 2} spesifikasi lain
                            </div>
                          )}
                        </div>
                      )}

                      {item.addonBreakdown.length > 0 && (
                        <div className="text-[10px] sm:text-xs text-[#059669] font-medium truncate">
                          +{item.addonBreakdown.length} add-on (
                          {formatRupiah(item.lineAddonsSubtotal)})
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItem(item.cartItemId, {
                                ...item,
                                qty: Math.max(1, item.qty - 5),
                              })
                            }
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-[#F8FAF9] flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                            aria-label="Kurangi 5 pcs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={50000}
                            value={item.qty}
                            onChange={(e) =>
                              updateCartItem(item.cartItemId, {
                                ...item,
                                qty: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-12 sm:w-14 h-7 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItem(item.cartItemId, {
                                ...item,
                                qty: item.qty + 5,
                              })
                            }
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-[#F8FAF9] flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                            aria-label="Tambah 5 pcs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          {formatRupiah(item.unitTotalPrice)}/pc
                        </span>
                        <span className="font-mono font-bold text-xs sm:text-base text-[#065E46] tabular-nums">
                          {formatRupiah(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </RevealBlock>

            {/* Order Summary */}
            <RevealBlock delayMs={60} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-4 lg:sticky lg:top-32">
              <h2 className="font-display font-bold text-lg text-slate-900">
                Ringkasan Keranjang
              </h2>
              <div className="space-y-2 text-sm border-b border-slate-100 pb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Total Kuantitas ({cart.length} item)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {totalQty} pcs
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Produk Dasar</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(totalBase)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Add-ons Custom</span>
                  <span className="font-mono font-semibold text-[#059669] tabular-nums">
                    +{formatRupiah(totalAddons)}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#071A12]">Total Estimasi</span>
                <span className="font-mono font-bold text-2xl text-[#065E46] tabular-nums">
                  {formatRupiah(cartTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="yeg-cta-loop w-full py-3.5 px-5 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lanjut ke Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/catalog"
                className="block w-full text-center py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#065E46]"
              >
                Tambah Produk Lain
              </Link>
            </RevealBlock>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
