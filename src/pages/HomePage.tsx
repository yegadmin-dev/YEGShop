import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupiah } from '../shared/pricing.ts';
import type { Product } from '../shared/types.ts';

function getLowestTierPrice(product: Product): number {
  const activePrices = product.priceRules.filter((r) => r.active).map((r) => r.unitPrice);
  return activePrices.length > 0 ? Math.min(...activePrices) : 0;
}

const DECK_PALETTE = [
  { bg: 'bg-[#065E46]', accent: 'text-emerald-100', ring: 'ring-[#10B981]/50' },
  { bg: 'bg-[#0284C7]', accent: 'text-sky-100', ring: 'ring-sky-300/60' },
  { bg: 'bg-[#06150E]', accent: 'text-[#10B981]', ring: 'ring-[#10B981]/50' },
  { bg: 'bg-[#15803D]', accent: 'text-emerald-100', ring: 'ring-emerald-300/50' },
  { bg: 'bg-[#059669]', accent: 'text-emerald-50', ring: 'ring-emerald-200/60' },
];

function getCircularOffset(index: number, activeIndex: number, length: number): number {
  if (length <= 1) return 0;
  let diff = index - activeIndex;
  const half = Math.floor(length / 2);
  if (diff > half) diff -= length;
  if (diff < -half) diff += length;
  return diff;
}

export function HomePage() {
  const navigate = useNavigate();
  const { products, loadingCatalog, catalogError, reloadCatalog, settings } = useStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [deckPaused, setDeckPaused] = useState(false);

  const deckProducts = useMemo(() => {
    const featured = products.filter((p) => p.featured || p.bestSeller);
    const pool = featured.length >= 5 ? featured : products;
    return pool.slice(0, 5);
  }, [products]);

  const featuredProducts = useMemo(
    () => (products.filter((p) => p.featured || p.bestSeller).length > 0
      ? products.filter((p) => p.featured || p.bestSeller)
      : products
    ).slice(0, 8),
    [products]
  );

  const mobileDisplayProducts = useMemo(() => featuredProducts.slice(0, 6), [featuredProducts]);

  // Keep activeIndex in bounds when catalog updates
  useEffect(() => {
    if (deckProducts.length > 0 && activeIndex >= deckProducts.length) {
      setActiveIndex(0);
    }
  }, [deckProducts.length, activeIndex]);

  // Auto-switch hero card deck every 10 seconds (pauses on hover)
  useEffect(() => {
    if (deckProducts.length <= 1 || deckPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % deckProducts.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [deckProducts.length, deckPaused]);

  const activeProduct = deckProducts[activeIndex] || null;
  const previewIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;
  const previewProduct = deckProducts[previewIndex] || activeProduct;
  const previewPrice = previewProduct ? getLowestTierPrice(previewProduct) : 0;

  const handlePrevDeck = () => {
    if (deckProducts.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + deckProducts.length) % deckProducts.length);
  };

  const handleNextDeck = () => {
    if (deckProducts.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % deckProducts.length);
  };

  const handleCardClick = (idx: number, product: Product) => {
    if (idx === activeIndex) {
      navigate(`/product/${product.slug}`);
    } else {
      setActiveIndex(idx);
    }
  };

  return (
    <PublicLayout>
      {/* =====================================================================
          HERO STAGE: CENTERED DISPLAY HEADLINE + 5-CARD FANNED INTERACTIVE DECK
          ===================================================================== */}
      <section className="relative overflow-hidden bg-white text-[#06150E] border-b border-slate-200">
        {/* Subtle Scroll-Parallax Geometric Backdrop on White */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"
        >
          <div className="yeg-scroll-parallax-soft mx-auto max-w-4xl h-[420px] rounded-full bg-gradient-to-b from-[#ECFDF5]/70 via-[#EFF8FF]/40 to-transparent blur-3xl opacity-80" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-10 sm:pt-10 sm:pb-12">
          {/* Headline Block */}
          <RevealBlock className="text-center max-w-3xl mx-auto space-y-2.5 sm:space-y-3">
            <p className="text-xs font-semibold text-[#059669] tracking-wide">
              Your Expression, Our Creation.{settings?.demoMode ? ' · Mode Demo' : ''}
            </p>
            <h1
              className="font-display font-extrabold text-3xl sm:text-5xl lg:text-[54px] tracking-tight leading-[1.06] text-[#06150E]"
              style={{ textWrap: 'balance' }}
            >
              Karya Cetak{' '}
              <span className="text-[#0284C7]">YEG</span>{' '}
              <span className="text-[#065E46]">Production</span>
            </h1>
          </RevealBlock>

          {/* 5-Card Fanned Interactive Deck */}
          <RevealBlock delayMs={80} className="mt-6 sm:mt-8">
            {loadingCatalog || deckProducts.length === 0 ? (
              <div className="h-[300px] sm:h-[360px] flex items-center justify-center gap-4">
                <div className="w-56 sm:w-64 h-72 rounded-3xl bg-slate-100 border border-slate-200 animate-pulse" />
              </div>
            ) : (
              <div
                onMouseEnter={() => setDeckPaused(true)}
                onMouseLeave={() => {
                  setDeckPaused(false);
                  setHoveredIndex(null);
                }}
                className="relative"
              >
                {/* Deck Stage Container */}
                <div className="relative h-[300px] sm:h-[355px] lg:h-[380px] flex items-center justify-center select-none">
                  {deckProducts.map((product, idx) => {
                    const offset = getCircularOffset(idx, activeIndex, deckProducts.length);
                    const absOffset = Math.abs(offset);
                    const isCenter = offset === 0;
                    const isHovered = hoveredIndex === idx;
                    const someoneElseHovered = hoveredIndex !== null && hoveredIndex !== idx;
                    const palette = DECK_PALETTE[idx % DECK_PALETTE.length];
                    const lowestPrice = getLowestTierPrice(product);

                    // Compute smooth desktop + mobile fanned 3D transforms
                    const translateXPercent = offset * 68;
                    const translateY = isHovered
                      ? -22
                      : absOffset === 0
                      ? -4
                      : absOffset === 1
                      ? 16
                      : 36;
                    const rotateDeg = isHovered ? 0 : offset * 7;
                    const scale = isHovered
                      ? 1.07
                      : isCenter
                      ? someoneElseHovered
                        ? 0.96
                        : 1
                      : absOffset === 1
                      ? 0.9
                      : 0.8;

                    const zIndex = isHovered
                      ? 40
                      : isCenter
                      ? 30
                      : absOffset === 1
                      ? 20
                      : 10;

                    // Hide furthest outer wings on small mobile screens to keep crisp mobile framing
                    const mobileVisibility =
                      absOffset >= 2 ? 'hidden sm:flex' : 'flex';

                    return (
                      <button
                        key={product.productId}
                        type="button"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() =>
                          setHoveredIndex((prev) => (prev === idx ? null : prev))
                        }
                        onFocus={() => {
                          setDeckPaused(true);
                          setHoveredIndex(idx);
                        }}
                        onBlur={() => {
                          setDeckPaused(false);
                          setHoveredIndex(null);
                        }}
                        onClick={() => handleCardClick(idx, product)}
                        aria-label={`${product.name} — mulai ${formatRupiah(lowestPrice)}`}
                        style={{
                          transform: `translate3d(${translateXPercent}%, ${translateY}px, 0) rotate(${rotateDeg}deg) scale(${scale})`,
                          zIndex,
                        }}
                        className={`${mobileVisibility} absolute w-[205px] sm:w-[235px] lg:w-[260px] h-[265px] sm:h-[310px] lg:h-[330px] rounded-3xl ${palette.bg} text-white p-4 sm:p-5 flex-col justify-between text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer focus-visible:outline-none focus-visible:ring-4 ${palette.ring} ${
                          isHovered
                            ? 'shadow-[0_28px_50px_-14px_rgba(6,21,14,0.42)] ring-2 ring-white/80'
                            : isCenter
                            ? 'shadow-[0_22px_40px_-14px_rgba(6,21,14,0.34)]'
                            : 'shadow-[0_14px_26px_-12px_rgba(6,21,14,0.25)] opacity-95 hover:opacity-100'
                        }`}
                      >
                        {/* Top Card Metadata (Zero-Pill Clean Typography) */}
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-[11px] font-semibold leading-tight truncate ${palette.accent}`}
                            >
                              {product.categoryName}
                            </span>
                            <span className="text-[11px] font-bold text-white/95 tabular-nums shrink-0">
                              {formatRupiah(lowestPrice)}
                            </span>
                          </div>
                          <h2 className="font-display font-extrabold text-base sm:text-lg lg:text-xl text-white leading-tight line-clamp-2">
                            {product.name}
                          </h2>
                        </div>

                        {/* Product Photo Frame Inside Card */}
                        <div className="relative flex-1 mt-3 rounded-2xl overflow-hidden bg-white/10 border border-white/15">
                          <SafeImage
                            fileId={product.mainImageFileId}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent"
                          />
                          <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between text-[11px] font-semibold text-white/95 tabular-nums">
                            <span>Min. {product.minOrderQty} pcs</span>
                            <span>{isCenter ? 'Klik Konfigurasi ->' : 'Tampilkan'}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Deck Controls, 10s Progress Bar & Active Product Readout */}
                {previewProduct && (
                  <div className="mt-4 max-w-2xl mx-auto space-y-3.5 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handlePrevDeck}
                        aria-label="Kartu sebelumnya"
                        className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:border-[#065E46] text-[#06150E] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex-1 max-w-xs space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {deckProducts.map((p, idx) => {
                            const active = idx === activeIndex;
                            return (
                              <button
                                key={p.productId}
                                type="button"
                                onClick={() => setActiveIndex(idx)}
                                aria-label={`Pilih ${p.name}`}
                                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                  active
                                    ? 'w-7 bg-[#065E46]'
                                    : 'w-2 bg-slate-300 hover:bg-[#0284C7]'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Smooth 10-second Auto-Switch Countdown Progress */}
                        <div
                          aria-hidden="true"
                          className="h-1 w-full rounded-full bg-slate-100 overflow-hidden"
                        >
                          <div
                            key={`${activeIndex}-${deckPaused ? 'paused' : 'play'}`}
                            style={{
                              animation: deckPaused
                                ? 'none'
                                : 'yegDeckTimerBar 10s linear forwards',
                              transformOrigin: 'left center',
                            }}
                            className="h-full bg-gradient-to-r from-[#065E46] via-[#10B981] to-[#0284C7]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextDeck}
                        aria-label="Kartu berikutnya"
                        className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:border-[#065E46] text-[#06150E] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-600 tabular-nums">
                      <span className="font-bold text-[#06150E]">{previewProduct.name}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>Mulai {formatRupiah(previewPrice)}/pcs (Tier 101+)</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>Estimasi {previewProduct.estimatedDays}</span>
                    </div>

                    {/* Primary Slow-Loop CTAs */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-1">
                      <Link
                        to={`/product/${previewProduct.slug}`}
                        className="yeg-cta-loop inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-[#065E46] hover:bg-[#054735] text-white font-display font-bold text-xs sm:text-sm shadow-[0_4px_0_#06150E] active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
                      >
                        <span>Pesan Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        to="/status"
                        className="yeg-cta-loop inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-display font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
                      >
                        <ClipboardList className="w-4 h-4" />
                        <span>Cek Pemesanan</span>
                      </Link>
                      <Link
                        to="/about"
                        className="yeg-hover-lift inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#F8FAF9] border border-slate-200 hover:border-[#065E46] text-[#06150E] font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
                      >
                        <Info className="w-4 h-4 text-[#15803D]" />
                        <span>About YEG</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </RevealBlock>
        </div>
      </section>

      {/* =====================================================================
          HIGHLIGHT METRICS & DIRECT PUBLIC MENU BAR
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <RevealBlock delayMs={40}>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <Link
              to="/catalog"
              className="yeg-hover-lift rounded-2xl bg-[#ECFDF5] border border-emerald-100 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="font-display font-extrabold text-xl sm:text-3xl text-[#065E46] tabular-nums">
                  {products.length || 6} Produk
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#06150E] mt-0.5">
                  Semua Kategori Cetak
                </div>
              </div>
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#065E46] shrink-0" />
            </Link>

            <div className="yeg-hover-lift rounded-2xl bg-[#EFF8FF] border border-sky-100 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-display font-extrabold text-xl sm:text-3xl text-[#0284C7] tabular-nums">
                  13 Warna
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-0.5">
                  Kulit ASE &amp; Hotprint
                </div>
              </div>
              <span className="text-xs font-bold text-[#0284C7] tabular-nums">3 Tier</span>
            </div>

            <Link
              to="/status"
              className="yeg-hover-lift rounded-2xl bg-[#F8FAF9] border border-slate-200 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="font-display font-extrabold text-xl sm:text-3xl text-[#15803D] tabular-nums">
                  DP {settings?.minDpPercent || 50}%
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-0.5">
                  Pantau 5 Tahap QC
                </div>
              </div>
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-[#15803D] shrink-0" />
            </Link>
          </div>
        </RevealBlock>
      </section>

      {/* Error State if Catalog Failed */}
      {catalogError && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <RevealBlock>
            <div className="bg-white border border-red-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-sm text-slate-900">
                    Gagal Memuat Katalog Produk
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{catalogError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void reloadCatalog()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
            </div>
          </RevealBlock>
        </section>
      )}

      {/* =====================================================================
          FEATURED PRODUCTS GRID (COMPACT 2–3 COLUMNS ON MOBILE, 4 ON DESKTOP)
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 bg-white">
        <RevealBlock className="flex flex-wrap items-end justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-2xl text-[#06150E]">
              Produk Unggulan &amp; Paling Sering Dipesan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Klik produk untuk mengatur jumlah lembar, warna bahan, dan add-on secara langsung.
            </p>
          </div>
          <Link
            to="/catalog"
            className="yeg-hover-lift inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#065E46] hover:underline whitespace-nowrap"
          >
            <span>Semua Kategori</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </RevealBlock>

        {loadingCatalog ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 h-52 sm:h-72 animate-pulse"
              />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
            Belum ada produk unggulan yang tersedia.
          </div>
        ) : (
          <RevealBlock delayMs={60}>
            {/* Mobile shows compact 6 items in 2/3-col grid, Desktop shows up to 8 items in 4-col grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:hidden gap-2.5">
              {mobileDisplayProducts.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
            <div className="hidden lg:grid grid-cols-4 gap-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          </RevealBlock>
        )}
      </section>

      {/* =====================================================================
          PROCESS FLOW & WORKSHOP PUBLIC TRACKING BANNER
          ===================================================================== */}
      <section className="bg-white border-t border-slate-200 py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealBlock className="max-w-2xl mb-6 lg:mb-8">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#06150E]">
              Alur Pemesanan Mudah &amp; Terpantau
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Dari konfigurasi spesifikasi hingga pelacakan tahap produksi di workshop YEG Production.
            </p>
          </RevealBlock>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <RevealBlock delayMs={40} direction="up">
              <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-[#065E46]">01. Konfigurasi</div>
                <h3 className="font-display font-bold text-base text-[#06150E]">
                  Pilih Spesifikasi &amp; Add-on
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tentukan jumlah pesanan, warna bahan, isi lembar, serta add-on seperti sudut siku
                  atau lapisan busa dengan kalkulasi harga otomatis.
                </p>
              </div>
            </RevealBlock>

            <RevealBlock delayMs={100} direction="up">
              <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-[#0284C7]">02. Checkout</div>
                <h3 className="font-display font-bold text-base text-[#06150E]">
                  Pembayaran DP / Lunas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bayar melalui transfer SeaBank atau QRIS, unggah bukti transfer, dan unduh struk
                  antrean resmi dalam format JPG.
                </p>
              </div>
            </RevealBlock>

            <RevealBlock delayMs={160} direction="up">
              <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-[#15803D]">03. Pelacakan</div>
                <h3 className="font-display font-bold text-base text-[#06150E]">
                  Pantau Tahap Produksi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan Order ID atau nomor WhatsApp pada halaman Cek Pemesanan untuk melihat
                  progres potong bahan, hotprint, hingga QC siap kirim.
                </p>
              </div>
            </RevealBlock>
          </div>

          <RevealBlock delayMs={120} direction="scale" className="mt-8">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#06150E] text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">Tentang YEG Production &amp; Pelacakan</span>{' '}
                  <span className="text-slate-300">
                    Kenali alur kerja workshop kami atau pantau progres pesanan Anda kapan saja.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/status"
                  className="yeg-cta-loop px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs transition-colors whitespace-nowrap"
                >
                  Cek Pemesanan
                </Link>
                <Link
                  to="/about"
                  className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs transition-colors whitespace-nowrap"
                >
                  About YEG
                </Link>
              </div>
            </div>
          </RevealBlock>
        </div>
      </section>
    </PublicLayout>
  );
}
