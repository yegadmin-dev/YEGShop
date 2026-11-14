import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { yegApi } from '../services/api.ts';
import type { Addon } from '../shared/types.ts';

export function AdminAddonEditPage() {
  const { addonId } = useParams<{ addonId: string }>();
  const navigate = useNavigate();
  const { notify, reloadCatalog } = useStore();

  const [addon, setAddon] = useState<Addon | null>(null);
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
        const found = res.addons.find((a) => a.addonId === addonId) || null;
        if (!found) {
          setError(`Add-on ${addonId || ''} tidak ditemukan.`);
        }
        setAddon(found ? { ...found } : null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat data add-on.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [addonId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!addon) return;
    setSaving(true);
    try {
      const saved = await yegRepositories.addons.save(addon);
      await reloadCatalog();
      notify(`Add-on ${saved.name} diperbarui.`, 'success');
      navigate('/admin/catalog/addons');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan add-on.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={addon ? `Edit Add-on: ${addon.name}` : 'Edit Add-on Custom'}
      subtitle="Atur harga tambahan per pcs dan status ketersediaan add-on"
    >
      <div className="max-w-xl mx-auto space-y-5">
        <Link
          to="/admin/catalog/addons"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Add-ons</span>
        </Link>

        {loading ? (
          <div className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !addon ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">
              {error || 'Add-on tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 text-xs"
          >
            <div className="border-b border-slate-100 pb-3">
              <div className="font-mono text-[#059669] font-bold">{addon.addonId}</div>
              <h1 className="font-display font-bold text-lg text-slate-900">{addon.name}</h1>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Add-on</label>
              <input
                type="text"
                required
                value={addon.name}
                onChange={(e) => setAddon({ ...addon, name: e.target.value })}
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
                value={addon.pricePerPcs}
                onChange={(e) =>
                  setAddon({
                    ...addon,
                    pricePerPcs: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={3}
                value={addon.description}
                onChange={(e) => setAddon({ ...addon, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={addon.active}
                onChange={(e) => setAddon({ ...addon, active: e.target.checked })}
              />
              <span>Add-on Aktif</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Link
                to="/admin/catalog/addons"
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
                <span>{saving ? 'Menyimpan...' : 'Simpan Add-on'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
