import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Clock, PackageCheck, RefreshCw, ShoppingBag } from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { ProductConfigurator } from '../components/ProductConfigurator.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatRupiah } from '../shared/pricing.ts';
import type { Addon, ConfiguredItemInput, Product } from '../shared/types.ts';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, addons: storeAddons } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [applicableAddons, setApplicableAddons] = useState<Addon[]>([]);
  const [activeImageId, setActiveImageId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedBanner, setAddedBanner] = useState(false);

  const loadProduct = async () => {
    if (!slug) {
      setError('Slug produk tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await yegRepositories.products.getBySlug(slug);
      if (!res) {
        setProduct(null);
        setError('Produk tidak ditemukan atau sudah tidak aktif.');
      } else {
        setProduct(res.product);
        setApplicableAddons(res.addons.length > 0 ? res.addons : storeAddons);
        setActiveImageId(res.product.mainImageFileId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProduct();
    setAddedBanner(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleAddToCart = (config: ConfiguredItemInput) => {
    if (!product) return;
    addToCart(product, config);
    setAddedBanner(true);
  };

  const sampleTiers = product
    ? [
        product.priceRules.find((r) => r.active && r.minQty === 1),
        product.priceRules.find((r) => r.active && r.minQty === 50),
        product.priceRules.find((r) => r.active && r.minQty === 101),
      ].filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#065E46]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
          {product && (
            <div className="text-xs text-slate-500 hidden sm:block">
              <Link to="/" className="hover:underline">
                Beranda
              </Link>{' '}
              /{' '}
              <Link to={`/category/${product.categorySlug}`} className="hover:underline">
                {product.categoryName}
              </Link>{' '}
              / <span className="text-slate-900 font-medium">{product.name}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />
            <div className="lg:col-span-7 h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />
          </div>
        ) : error || !product ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <div>
              <h1 className="font-display font-bold text-lg text-slate-900">
                Produk Tidak Dapat Dimuat
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {error || 'Produk tidak tersedia di katalog saat ini.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadProduct()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
              <Link
                to="/catalog"
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Lihat Produk Lain
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Gallery + Overview + Tier Table */}
            <RevealBlock direction="left" className="lg:col-span-5 space-y-5 lg:sticky lg:top-32">
              <div className="yeg-hover-lift bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="aspect-[4/3] bg-[#F8FAF9]">
                  <SafeImage
                    fileId={activeImageId || product.mainImageFileId}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.galleryFileIds.length > 1 && (
                  <div className="p-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                    {product.galleryFileIds.map((fileId) => (
                      <button
                        key={fileId}
                        type="button"
                        onClick={() => setActiveImageId(fileId)}
                        className={`w-16 h-12 rounded-lg overflow-hidden border shrink-0 cursor-pointer ${
                          (activeImageId || product.mainImageFileId) === fileId
                            ? 'border-[#065E46] ring-2 ring-[#065E46]/20'
                            : 'border-slate-200 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <SafeImage
                          fileId={fileId}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wide text-[#059669]">
                    {product.categoryName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Estimasi {product.estimatedDays}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5" />
                    Min. {product.minOrderQty} pcs
                  </span>
                </div>

                <h1 className="font-display font-bold text-2xl text-[#071A12] leading-snug">
                  {product.name}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">{product.fullDescription}</p>

                {sampleTiers.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-800 mb-2">
                      Referensi Harga Dasar ({sampleTiers[0].variantKey})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {sampleTiers.map((tier) => (
                        <div
                          key={tier.ruleId}
                          className="p-2.5 rounded-lg bg-[#F8FAF9] border border-slate-200 text-center"
                        >
                          <div className="font-mono text-[11px] text-slate-500">
                            {tier.maxQty ? `${tier.minQty}–${tier.maxQty} pcs` : `${tier.minQty}+ pcs`}
                          </div>
                          <div className="font-mono font-bold text-xs sm:text-sm text-[#065E46] tabular-nums mt-0.5">
                            {formatRupiah(tier.unitPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </RevealBlock>

            {/* Right Column: Interactive Configurator */}
            <RevealBlock direction="right" delayMs={60} className="lg:col-span-7 space-y-4">
              {addedBanner && (
                <div className="bg-[#06150E] text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <ShoppingBag className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Item berhasil ditambahkan ke keranjang belanja Anda.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/cart')}
                      className="px-3 py-1.5 rounded-lg bg-white text-[#06150E] text-xs font-bold cursor-pointer"
                    >
                      Lihat Keranjang
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/checkout')}
                      className="yeg-cta-loop px-3 py-1.5 rounded-lg bg-[#10B981] text-[#06150E] text-xs font-bold cursor-pointer"
                    >
                      Lanjut Checkout
                    </button>
                  </div>
                </div>
              )}

              <ProductConfigurator
                product={product}
                allAddons={applicableAddons}
                onSubmit={handleAddToCart}
              />
            </RevealBlock>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
