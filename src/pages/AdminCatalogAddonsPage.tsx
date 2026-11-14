import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Edit3, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatRupiah } from '../shared/pricing.ts';
import type { Addon } from '../shared/types.ts';

export function AdminCatalogAddonsPage() {
  const { notify, reloadCatalog } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadAddons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getAdminCatalogPreview();
      setAddons(res.addons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar add-on custom.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      await yegApi.refreshCatalogCache();
      await Promise.all([loadAddons(), reloadCatalog()]);
      notify('Cache katalog dan add-ons berhasil disegarkan.', 'success');
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
    return addons.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.addonId.toLowerCase().includes(q)
    );
  }, [addons, search]);

  return (
    <AdminLayout
      title="Add-ons Custom"
      subtitle="Kelola fitur tambahan per pcs (sudut siku, busa, kantong plastik, dll.)"
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
                placeholder="Cari add-on custom..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
              />
            </div>
            <span className="text-xs text-slate-500">{filtered.length} add-on terdaftar</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/catalog/products"
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46]"
            >
              &larr; Katalog Produk
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Tidak ada add-on custom yang cocok.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <div
                key={a.addonId}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display font-bold text-sm text-slate-900">{a.name}</h2>
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
                  <Link
                    to={`/admin/catalog/addons/${a.addonId}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
