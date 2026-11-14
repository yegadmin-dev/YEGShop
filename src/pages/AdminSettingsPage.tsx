import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { yegApi } from '../services/api.ts';

export function AdminSettingsPage() {
  const { settings, reloadCatalog, notify } = useStore();

  const [storeName, setStoreName] = useState('YEGShop');
  const [adminWhatsapp, setAdminWhatsapp] = useState('6289674849505');
  const [seabankAccountNumber, setSeabankAccountNumber] = useState('901705659816');
  const [seabankAccountName, setSeabankAccountName] = useState('Mochamad Ridhwan Mubarok');
  const [operatingHours, setOperatingHours] = useState('Senin – Sabtu, 08:00 – 17:00 WIB');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [minDpPercent, setMinDpPercent] = useState(50);
  const [defaultCashierName, setDefaultCashierName] = useState('Kasir Workshop YEG');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setStoreName(settings.storeName);
    setAdminWhatsapp(settings.adminWhatsapp);
    setSeabankAccountNumber(settings.seabankAccountNumber);
    setSeabankAccountName(settings.seabankAccountName);
    setOperatingHours(settings.operatingHours);
    setWorkshopAddress(settings.workshopAddress);
    setMinDpPercent(settings.minDpPercent);
    setDefaultCashierName(settings.defaultCashierName || 'Kasir Workshop YEG');
  }, [settings]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await yegApi.updateSettings({
        storeName: storeName.trim(),
        adminWhatsapp: adminWhatsapp.trim(),
        seabankAccountNumber: seabankAccountNumber.trim(),
        seabankAccountName: seabankAccountName.trim(),
        operatingHours: operatingHours.trim(),
        workshopAddress: workshopAddress.trim(),
        minDpPercent: Math.min(100, Math.max(10, Number(minDpPercent) || 50)),
        defaultCashierName: defaultCashierName.trim() || 'Kasir Workshop YEG',
      });
      await reloadCatalog();
      notify('Pengaturan toko YEGShop berhasil disimpan.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Pengaturan Toko & Kesiapan Integrasi"
      subtitle="Konfigurasi identitas pembayaran resmi, kontak WhatsApp, petugas kasir, dan status adapter"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-6 space-y-3 sm:space-y-4"
        >
          <h2 className="font-display font-bold text-sm sm:text-base text-slate-900">
            Pengaturan Operasional Toko
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-[11px] sm:text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Toko</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Petugas / Kasir POS
              </label>
              <input
                type="text"
                required
                value={defaultCashierName}
                onChange={(e) => setDefaultCashierName(e.target.value)}
                placeholder="Contoh: Kasir Shift Pagi / Budi"
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Otomatis dipakai pada terminal kasir &amp; struk transaksi POS.
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                WhatsApp Admin (Format 628xxx)
              </label>
              <input
                type="text"
                value={adminWhatsapp}
                onChange={(e) => setAdminWhatsapp(e.target.value)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 font-mono text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                No. Rekening SeaBank
              </label>
              <input
                type="text"
                value={seabankAccountNumber}
                onChange={(e) => setSeabankAccountNumber(e.target.value)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 font-mono text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                type="text"
                value={seabankAccountName}
                onChange={(e) => setSeabankAccountName(e.target.value)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Minimal DP (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                value={minDpPercent}
                onChange={(e) => setMinDpPercent(Number(e.target.value) || 50)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 font-mono text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Jam Operasional</label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="text-[11px] sm:text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Alamat Workshop</label>
            <textarea
              rows={2}
              value={workshopAddress}
              onChange={(e) => setWorkshopAddress(e.target.value)}
              className="w-full px-2.5 sm:px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </form>

        <aside className="lg:col-span-5 bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-6 space-y-3 sm:space-y-4">
          <h2 className="font-display font-bold text-sm sm:text-base text-slate-900">
            Status Arsitektur Data
          </h2>
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-[#F8FAF9] border border-slate-200 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs">
            <div className="flex items-center gap-2 font-bold text-[#065E46]">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>Adapter Aktif: {yegRepositories.mode}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Seluruh operasi saat ini berjalan melalui 6 repository modular
              (ProductRepository, CategoryRepository, PriceRepository, OrderRepository,
              AddonRepository, PaymentRepository) dengan data simulasi DEMO.
            </p>
          </div>
          <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-600">
            <div className="font-semibold text-slate-900">Kesiapan Cloudflare Worker &amp; Sheets:</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Adapter `CloudflareWorkerAdapter.ts` sudah terpasang dengan kontrak API identik.</li>
              <li>Pemisahan kanal `Orders_Waiting` (Publik) dan `Order_Catatan_Admin` (Kasir POS) aktif.</li>
              <li>Variabel environment produksi (`CLOUDFLARE_WORKER_URL`, `GOOGLE_SHEETS_ID`) diatur di Secrets saat migrasi.</li>
            </ul>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
