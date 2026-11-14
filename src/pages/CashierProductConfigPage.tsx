import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Clock, PackageCheck } from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { ProductConfigurator } from '../components/ProductConfigurator.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import type { Addon, ConfiguredItemInput, Product } from '../shared/types.ts';

export function CashierProductConfigPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const editItemId = searchParams.get('edit') || '';
  const navigate = useNavigate();

  const { addons: storeAddons, notify } = useStore();
  const { posCart, addConfiguredItem, updateConfiguredItem } = useCashier();

  const [product, setProduct] = useState<Product | null>(null);
  const [applicableAddons, setApplicableAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const editingCartItem = useMemo(
    () => (editItemId ? posCart.find((i) => i.cartItemId === editItemId) || null : null),
    [posCart, editItemId]
  );

  useEffect(() => {
    let mounted = true;
    if (!slug) {
      setError('Slug produk tidak ditemukan.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    yegRepositories.products
      .getBySlug(slug)
      .then((res) => {
        if (!mounted) return;
        if (!res) {
          setError('Produk tidak ditemukan atau tidak aktif.');
          setProduct(null);
        } else {
          setProduct(res.product);
          setApplicableAddons(res.addons.length > 0 ? res.addons : storeAddons);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi produk.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug, storeAddons]);

  const handleSubmit = (config: ConfiguredItemInput) => {
    if (!product) return;
    if (editingCartItem) {
      updateConfiguredItem(editingCartItem.cartItemId, product, config);
      notify(`Spesifikasi ${product.name} diperbarui di Checkout.`, 'success');
    } else {
      const added = addConfiguredItem(product, config);
      notify(`${product.name} (${added.qty} pcs) masuk ke Checkout.`, 'success');
    }
    navigate('/kasir');
  };

  return (
    <CashierLayout
      title={product ? `Konfigurasi: ${product.name}` : 'Konfigurasi Produk Kasir'}
      subtitle="Atur kuantitas tier, spesifikasi bahan, warna, dan add-on custom"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/kasir"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Terminal Kasir</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="lg:col-span-8 h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : error || !product ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h1 className="font-display font-bold text-lg text-[#071A12]">
              Produk Tidak Dapat Dimuat
            </h1>
            <p className="text-xs text-slate-600">{error || 'Produk tidak tersedia.'}</p>
            <Link
              to="/kasir"
              className="inline-block px-4 py-2 rounded-xl bg-[#065E46] text-white text-xs font-bold"
            >
              Kembali ke Kasir
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden lg:sticky lg:top-20">
              <div className="aspect-[4/3] bg-[#F8FAF9]">
                <SafeImage
                  fileId={product.mainImageFileId}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#059669]">
                  {product.categoryName}
                </div>
                <h1 className="font-display font-bold text-xl text-[#071A12]">{product.name}</h1>
                <p className="text-xs text-slate-600 leading-relaxed">{product.shortDescription}</p>
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#065E46]" />
                    Estimasi {product.estimatedDays}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-[#065E46]" />
                    Min. {product.minOrderQty} pcs
                  </span>
                </div>
              </div>
            </aside>

            <div className="lg:col-span-8">
              <ProductConfigurator
                key={`${product.productId}-${editingCartItem?.cartItemId || 'new'}`}
                product={product}
                allAddons={applicableAddons}
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
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
