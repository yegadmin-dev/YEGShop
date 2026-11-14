import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { yegApi } from '../services/api.ts';
import type { Product } from '../shared/types.ts';

export function AdminProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { notify, reloadCatalog } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    yegApi
      .getAdminCatalogPreview()
      .then((res) => {
        if (!mounted) return;
        const found = res.products.find((p) => p.productId === productId) || null;
        if (!found) {
          setError(`Produk ${productId || ''} tidak ditemukan.`);
        }
        setProduct(found ? { ...found } : null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat data produk.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [productId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    try {
      const saved = await yegRepositories.products.save(product);
      await reloadCatalog();
      notify(`Produk ${saved.name} diperbarui.`, 'success');
      navigate('/admin/catalog/products');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan produk.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={product ? `Edit Produk: ${product.name}` : 'Edit Produk'}
      subtitle="Ubah informasi produk, minimum pemesanan, dan status visibilitas"
    >
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          to="/admin/catalog/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Produk</span>
        </Link>

        {loading ? (
          <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !product ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">
              {error || 'Produk tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5"
          >
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-16 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <SafeImage
                  fileId={product.mainImageFileId}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-mono text-xs text-[#059669] font-bold">
                  {product.productId} · {product.categoryName}
                </div>
                <h1 className="font-display font-bold text-lg text-slate-900">{product.name}</h1>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={product.shortDescription}
                  onChange={(e) => setProduct({ ...product, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimasi Hari</label>
                  <input
                    type="text"
                    value={product.estimatedDays}
                    onChange={(e) => setProduct({ ...product, estimatedDays: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Order (pcs)</label>
                  <input
                    type="number"
                    min={1}
                    value={product.minOrderQty}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        minOrderQty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-5 pt-1">
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={product.active}
                    onChange={(e) => setProduct({ ...product, active: e.target.checked })}
                  />
                  <span>Produk Aktif di Katalog</span>
                </label>
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={product.featured}
                    onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                  />
                  <span>Tampilkan di Beranda (Unggulan)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Link
                to="/admin/catalog/products"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Produk'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
