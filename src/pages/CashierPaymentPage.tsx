import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatRupiah, getTodayIsoDate } from '../shared/pricing.ts';
import type { PaymentMethod } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function CashierPaymentPage() {
  const navigate = useNavigate();
  const { settings, notify } = useStore();
  const {
    posCart,
    draft,
    lastReceipt,
    subtotalBase,
    subtotalAddons,
    posTotal,
    updateDraft,
    resetAfterPayment,
    clearLastReceipt,
  } = useCashier();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  const defaultMinDp = Math.ceil(posTotal * 0.5);

  const paidAmount = useMemo(() => {
    if (draft.paymentStatus === 'Belum Dibayar') return 0;
    if (draft.paymentStatus === 'Lunas') return posTotal;
    const val = Number(draft.dpInput);
    if (Number.isFinite(val) && val > 0 && val <= posTotal) return Math.round(val);
    return defaultMinDp;
  }, [draft.paymentStatus, posTotal, draft.dpInput, defaultMinDp]);

  const cashReceived = useMemo(() => {
    if (draft.paymentMethod !== 'Tunai') return paidAmount;
    const val = Number(draft.cashReceivedInput);
    return Number.isFinite(val) && val > 0 ? Math.round(val) : paidAmount;
  }, [draft.paymentMethod, draft.cashReceivedInput, paidAmount]);

  const changeAmount =
    draft.paymentMethod === 'Tunai' && cashReceived >= paidAmount ? cashReceived - paidAmount : 0;

  const handleCompletePayment = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (posCart.length === 0) {
      setError('Daftar checkout masih kosong.');
      return;
    }
    if (!draft.customerName.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await yegApi.createCashierTerminalOrder({
        sourceOrderId: draft.sourceOrderId?.trim() || undefined,
        customerName: draft.customerName.trim(),
        whatsapp: draft.whatsapp.trim(),
        institution: draft.institution.trim(),
        cashierName: draft.cashierName.trim() || 'Kasir Workshop YEG',
        deadline: draft.deadline,
        paymentMethod: draft.paymentMethod,
        paymentStatus: draft.paymentStatus,
        dpAmount: paidAmount,
        cashReceived: draft.paymentMethod === 'Tunai' ? cashReceived : paidAmount,
        transactionNotes: draft.notes.trim(),
        idempotencyKey,
        items: posCart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          specifications: c.specifications,
          addons: c.addons,
          logoFileName: c.logoFileName,
          logoPreviewDataUrl: c.logoPreviewDataUrl,
        })),
      });

      resetAfterPayment({ order: res.order, items: res.items });
      setIdempotencyKey(`POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      notify(`Transaksi Kasir ${res.order.orderId} berhasil disimpan.`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show receipt state if payment just succeeded & cart is empty
  if (posCart.length === 0 && lastReceipt) {
    const r = lastReceipt.order;
    return (
      <CashierLayout
        title="Struk Transaksi Berhasil"
        subtitle="Simpan atau cetak struk resmi untuk diserahkan ke pelanggan"
      >
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="bg-[#06150E] text-white rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-7 h-7 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-xs text-[#10B981]">
                  {r.orderId} · Antrean {r.queueNumber}
                </div>
                <h1 className="font-display font-bold text-xl sm:text-2xl mt-0.5">
                  Transaksi Tersimpan — {r.customerName}
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Metode: {r.paymentMethod} ({r.paymentStatus}) · Kasir: {r.cashierName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15 font-mono text-xs tabular-nums">
              <div>
                <div className="text-slate-300 text-[11px]">Total Tagihan</div>
                <div className="font-bold text-base mt-0.5">{formatRupiah(r.totalTransaction)}</div>
              </div>
              <div>
                <div className="text-slate-300 text-[11px]">Dibayar</div>
                <div className="font-bold text-base mt-0.5">{formatRupiah(r.dpAmount)}</div>
              </div>
              <div>
                <div className="text-slate-300 text-[11px]">Sisa Pelunasan</div>
                <div className="font-bold text-base mt-0.5">{formatRupiah(r.remainingAmount)}</div>
              </div>
              <div>
                <div className="text-slate-300 text-[11px]">Kembalian</div>
                <div className="font-bold text-base text-[#10B981] mt-0.5">
                  {formatRupiah(r.changeAmount)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  downloadReceiptJpg({
                    orderId: r.orderId,
                    queueNumber: r.queueNumber,
                    sourceLabel: settings?.demoMode ? 'KASIR POS (DEMO)' : 'KASIR POS',
                    timestamp: r.timestamp,
                    deadline: r.deadline,
                    customerName: r.customerName,
                    whatsapp: r.whatsapp,
                    institution: r.institution,
                    items: lastReceipt.items,
                    subtotal: r.productSubtotal,
                    totalAddons: r.totalAddons,
                    totalTransaction: r.totalTransaction,
                    paidAmount: r.dpAmount,
                    remainingAmount: r.remainingAmount,
                    paymentMethod: r.paymentMethod,
                    paymentStatus: r.paymentStatus,
                    cashReceived: r.cashReceived,
                    changeAmount: r.changeAmount,
                    cashierName: r.cashierName,
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] text-[#06150E] text-xs font-bold hover:bg-[#34D399] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Struk JPG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLastReceipt();
                  navigate('/kasir');
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#06150E] text-xs font-bold hover:bg-emerald-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Transaksi Baru</span>
              </button>
              <Link
                to="/kasir/riwayat"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/30 text-white text-xs font-semibold hover:bg-white/10"
              >
                Lihat Riwayat Kasir
              </Link>
            </div>
          </div>
        </div>
      </CashierLayout>
    );
  }

  if (posCart.length === 0) {
    return (
      <CashierLayout
        title="Pembayaran Kasir POS"
        subtitle="Belum ada item di keranjang checkout kasir"
      >
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
          <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h1 className="font-display font-bold text-lg text-[#071A12]">
              Keranjang Checkout Masih Kosong
            </h1>
            <p className="text-xs text-slate-600">
              Pilih produk di Terminal Kasir terlebih dahulu sebelum masuk ke halaman pembayaran.
            </p>
          </div>
          <Link
            to="/kasir"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Terminal Kasir</span>
          </Link>
        </div>
      </CashierLayout>
    );
  }

  return (
    <CashierLayout
      title="Penyelesaian Pembayaran Kasir POS"
      subtitle="Lengkapi identitas pelanggan, pilih metode pembayaran, dan cetak struk"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/kasir"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali Ubah Keranjang</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Payment Form */}
          <form
            onSubmit={handleCompletePayment}
            className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5"
          >
            {draft.sourceOrderId && (
              <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#065E46]/30 text-xs text-[#071A12]">
                Tersinkron ke Order Publik{' '}
                <strong className="font-mono text-[#065E46]">#{draft.sourceOrderId}</strong>.
                Menyimpan pembayaran ini akan otomatis memperbarui antrean &amp; nominal pesanan
                tersebut.
              </div>
            )}

            <div className="border-b border-slate-100 pb-3">
              <h1 className="font-display font-bold text-lg text-slate-900">
                Data Pelanggan &amp; Pembayaran
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Total Tagihan: {formatRupiah(posTotal)} ({posCart.length} jenis item)
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={draft.customerName}
                  onChange={(e) => updateDraft({ customerName: e.target.value })}
                  placeholder="Contoh: Bpk. Hendra Kusuma"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. WhatsApp (Opsional)
                </label>
                <input
                  type="tel"
                  value={draft.whatsapp}
                  onChange={(e) => updateDraft({ whatsapp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sekolah / Instansi
                </label>
                <input
                  type="text"
                  value={draft.institution}
                  onChange={(e) => updateDraft({ institution: e.target.value })}
                  placeholder="Nama sekolah / umum"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Deadline Selesai
                </label>
                <input
                  type="date"
                  min={getTodayIsoDate()}
                  value={draft.deadline}
                  onChange={(e) => updateDraft({ deadline: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={draft.paymentMethod}
                  onChange={(e) => updateDraft({ paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="SeaBank">SeaBank</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Pembayaran
                </label>
                <select
                  value={draft.paymentStatus}
                  onChange={(e) =>
                    updateDraft({
                      paymentStatus: e.target.value as 'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar',
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="DP Terverifikasi">DP Terverifikasi</option>
                  <option value="Belum Dibayar">Belum Dibayar</option>
                </select>
              </div>
            </div>

            {draft.paymentStatus === 'DP Terverifikasi' && (
              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal DP Diterima (Default 50%: {formatRupiah(defaultMinDp)})
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, posTotal)}
                  value={draft.dpInput}
                  onChange={(e) => updateDraft({ dpInput: e.target.value })}
                  placeholder={String(defaultMinDp)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-sm"
                />
              </div>
            )}

            {draft.paymentMethod === 'Tunai' && draft.paymentStatus !== 'Belum Dibayar' && (
              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Uang Tunai Diterima (Tagihan sekarang: {formatRupiah(paidAmount)})
                </label>
                <input
                  type="number"
                  min={0}
                  value={draft.cashReceivedInput}
                  onChange={(e) => updateDraft({ cashReceivedInput: e.target.value })}
                  placeholder={String(paidAmount)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kasir</label>
                <input
                  type="text"
                  value={draft.cashierName}
                  onChange={(e) => updateDraft({ cashierName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={draft.notes}
                  onChange={(e) => updateDraft({ notes: e.target.value })}
                  placeholder="Opsional"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Nominal Dibayar Sekarang</span>
                <span className="font-mono font-bold text-[#065E46] tabular-nums">
                  {formatRupiah(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sisa Pelunasan</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatRupiah(Math.max(0, posTotal - paidAmount))}
                </span>
              </div>
              {draft.paymentMethod === 'Tunai' && changeAmount > 0 && (
                <div className="flex justify-between text-[#059669] font-bold">
                  <span>Kembalian Tunai</span>
                  <span className="font-mono tabular-nums">{formatRupiah(changeAmount)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Memproses Transaksi...' : 'Konfirmasi & Simpan Transaksi'}
            </button>
          </form>

          {/* Itemized Summary Sidebar */}
          <aside className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-display font-bold text-base text-[#071A12]">Rincian Item Checkout</h2>
            <div className="divide-y divide-slate-100">
              {posCart.map((item) => (
                <div key={item.cartItemId} className="py-3 space-y-1 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#071A12]">
                        {item.productName} ({item.qty} pcs)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {Object.entries(item.specifications || {})
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                      {item.addonBreakdown.length > 0 && (
                        <div className="text-[11px] text-[#059669]">
                          Add-on: {item.addonBreakdown.map((a) => a.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="font-mono font-bold text-[#071A12] tabular-nums whitespace-nowrap">
                      {formatRupiah(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Produk</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatRupiah(subtotalBase)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Add-ons Custom</span>
                <span className="font-mono font-semibold text-[#059669] tabular-nums">
                  +{formatRupiah(subtotalAddons)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="font-display font-bold text-base text-[#071A12]">Total</span>
                <span className="font-mono font-bold text-xl text-[#065E46] tabular-nums">
                  {formatRupiah(posTotal)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </CashierLayout>
  );
}
