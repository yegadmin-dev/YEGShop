import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Edit3, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatRupiah } from '../shared/pricing.ts';
import type { Category, Product } from '../shared/types.ts';

export function AdminCatalogProductsPage() {
  const { notify, reloadCatalog } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getAdminCatalogPreview();
      setCategories(res.categories);
      setProducts(res.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar produk.');
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) next.set('q', val.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <AdminLayout
      title="Katalog Produk"
      subtitle="Kelola produk aktif, estimasi pengerjaan, dan status unggulan YEGShop"
    >
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari nama produk atau ID..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
              />
            </div>
            <span className="text-xs text-slate-500">
              {filtered.length} produk · {categories.length} kategori
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/catalog/addons"
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46]"
            >
              Kelola Add-ons Custom &rarr;
            </Link>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefreshCache()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Cache</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Tidak ada produk yang cocok dengan pencarian Anda.
          </div>
        ) : (
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
                  {filtered.map((p) => {
                    const lowest = p.priceRules.reduce(
                      (min, r) => (r.active && r.unitPrice < min ? r.unitPrice : min),
                      Infinity
                    );
                    return (
                      <tr key={p.productId} className="hover:bg-[#F8FAF9]/70">
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
                            <span className="ml-2 text-[11px] text-[#0284C7] font-semibold">· Unggulan</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#065E46] tabular-nums">
                          {Number.isFinite(lowest) ? formatRupiah(lowest) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/catalog/products/${p.productId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
