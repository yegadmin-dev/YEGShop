import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Edit3, RefreshCw, Save, X } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { yegApi } from '../services/api.ts';
import { formatRupiah } from '../shared/pricing.ts';
import type { Addon, Category, Product } from '../shared/types.ts';

export function AdminCatalogPage() {
  const { notify, reloadCatalog } = useStore();
  const [tab, setTab] = useState<'products' | 'addons'>('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Edit modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getAdminCatalogPreview();
      setCategories(res.categories);
      setProducts(res.products);
      setAddons(res.addons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pratinjau katalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      const res = await yegApi.refreshCatalogCache();
      await Promise.all([loadPreview(), reloadCatalog()]);
      notify(
        `Cache katalog disegarkan (${res.productCount} produk, ${res.categoryCount} kategori).`,
        'success'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyegarkan cache katalog.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const saved = await yegRepositories.products.save(editingProduct);
      setProducts((prev) => prev.map((p) => (p.productId === saved.productId ? saved : p)));
      await reloadCatalog();
      setEditingProduct(null);
      notify(`Produk ${saved.name} diperbarui.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan produk.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddon = async () => {
    if (!editingAddon) return;
    setSaving(true);
    try {
      const saved = await yegRepositories.addons.save(editingAddon);
      setAddons((prev) => prev.map((a) => (a.addonId === saved.addonId ? saved : a)));
      await reloadCatalog();
      setEditingAddon(null);
      notify(`Add-on ${saved.name} diperbarui.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan add-on.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Katalog & Add-ons"
      subtitle="Kelola produk aktif, estimasi pengerjaan, dan harga add-on custom YEGShop"
    >
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'products'
                  ? 'bg-[#065E46] text-white'
                  : 'bg-[#F8FAF9] text-slate-700 hover:bg-slate-200'
              }`}
            >
              Produk ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('addons')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'addons'
                  ? 'bg-[#065E46] text-white'
                  : 'bg-[#F8FAF9] text-slate-700 hover:bg-slate-200'
              }`}
            >
              Add-ons Custom ({addons.length})
            </button>
            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
              {categories.length} kategori terdaftar
            </span>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void handleRefreshCache()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sinkronkan Cache Katalog</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : tab === 'products' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Produk</th>
                    <th className="py-3 px-4 font-semibold">Kategori</th>
                    <th className="py-3 px-4 font-semibold">Estimasi</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Harga Terendah</th>
                    <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const lowest = p.priceRules.reduce(
                      (min, r) => (r.active && r.unitPrice < min ? r.unitPrice : min),
                      Infinity
                    );
                    return (
                      <tr key={p.productId} className="hover:bg-[#F8FAF9]/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                              <SafeImage
                                fileId={p.mainImageFileId}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="font-mono text-[11px] text-slate-500">
                                {p.productId} · Min {p.minOrderQty} pcs
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{p.categoryName}</td>
                        <td className="py-3 px-4 text-slate-700">{p.estimatedDays}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              p.active ? 'text-[#059669]' : 'text-slate-400'
                            }`}
                          >
                            {p.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          {p.featured && (
                            <span className="ml-2 text-[11px] text-amber-700">· Unggulan</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#065E46] tabular-nums">
                          {Number.isFinite(lowest) ? formatRupiah(lowest) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...p })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((a) => (
              <div
                key={a.addonId}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-sm text-slate-900">{a.name}</h3>
                    <span className="font-mono font-bold text-xs text-[#065E46] tabular-nums">
                      +{formatRupiah(a.pricePerPcs)}/pcs
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{a.description}</p>
                  <div className="text-[11px] font-mono text-slate-500">
                    Berlaku untuk: {a.applicableProducts.join(', ')}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      a.active ? 'text-[#059669]' : 'text-slate-400'
                    }`}
                  >
                    {a.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingAddon({ ...a })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Edit Produk: {editingProduct.productId}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.shortDescription}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, shortDescription: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Estimasi Hari
                    </label>
                    <input
                      type="text"
                      value={editingProduct.estimatedDays}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, estimatedDays: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Min. Order</label>
                    <input
                      type="number"
                      min={1}
                      value={editingProduct.minOrderQty}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          minOrderQty: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingProduct.active}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, active: e.target.checked })
                      }
                    />
                    <span>Produk Aktif di Katalog</span>
                  </label>
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, featured: e.target.checked })
                      }
                    />
                    <span>Tampilkan di Beranda (Unggulan)</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveProduct()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Produk'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Add-on Modal */}
        {editingAddon && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Edit Add-on: {editingAddon.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingAddon(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Add-on</label>
                  <input
                    type="text"
                    value={editingAddon.name}
                    onChange={(e) => setEditingAddon({ ...editingAddon, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Harga Tambahan / pcs (IDR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingAddon.pricePerPcs}
                    onChange={(e) =>
                      setEditingAddon({
                        ...editingAddon,
                        pricePerPcs: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
                  <textarea
                    rows={2}
                    value={editingAddon.description}
                    onChange={(e) =>
                      setEditingAddon({ ...editingAddon, description: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingAddon.active}
                    onChange={(e) => setEditingAddon({ ...editingAddon, active: e.target.checked })}
                  />
                  <span>Add-on Aktif</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAddon(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveAddon()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Add-on'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
