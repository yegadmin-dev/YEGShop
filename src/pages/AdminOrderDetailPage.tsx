import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download, ExternalLink, Save } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import {
  buildWhatsAppUrl,
  formatDateShort,
  formatDateTimeId,
  formatRupiah,
} from '../shared/pricing.ts';
import type {
  OrderWaitingRecord,
  OrderWorkflowStatus,
  PublicPaymentStatus,
} from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

const ORDER_STATUSES: OrderWorkflowStatus[] = [
  'Menunggu konfirmasi admin',
  'Diproses',
  'Dalam Produksi',
  'Quality Control',
  'Siap Diambil / Dikirim',
  'Selesai',
  'Dibatalkan',
];

const PAYMENT_STATUSES: PublicPaymentStatus[] = [
  'Menunggu verifikasi pembayaran',
  'DP Terverifikasi',
  'Lunas',
  'Ditolak',
  'Belum Dibayar',
];

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { notify, settings } = useStore();
  const [order, setOrder] = useState<OrderWaitingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftOrderStatus, setDraftOrderStatus] =
    useState<OrderWorkflowStatus>('Menunggu konfirmasi admin');
  const [draftPaymentStatus, setDraftPaymentStatus] =
    useState<PublicPaymentStatus>('Menunggu verifikasi pembayaran');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    yegRepositories.orders
      .listPublicOrders()
      .then((list) => {
        if (!mounted) return;
        const found = list.find((o) => o.orderId === orderId) || null;
        if (!found) {
          setError(`Pesanan ${orderId || ''} tidak ditemukan.`);
        } else {
          setOrder(found);
          setDraftOrderStatus(found.orderStatus);
          setDraftPaymentStatus(found.paymentStatus);
          setDraftNotes(found.adminNotes || '');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat detail pesanan.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const updated = await yegRepositories.orders.updatePublicOrder(order.orderId, {
        orderStatus: draftOrderStatus,
        paymentStatus: draftPaymentStatus,
        adminNotes: draftNotes,
      });
      setOrder(updated);
      notify(`Pesanan ${updated.orderId} berhasil diperbarui.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan pembaruan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={order ? `Kelola Pesanan ${order.orderId}` : 'Detail Pesanan Publik'}
      subtitle="Perbarui status pesanan, verifikasi pembayaran, dan unduh struk"
    >
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-5">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Kembali ke Daftar Pesanan</span>
        </Link>

        {loading ? (
          <div className="h-64 sm:h-80 bg-white rounded-xl sm:rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !order ? (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-red-200 p-5 sm:p-8 text-center space-y-3">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {error || 'Pesanan tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-6 space-y-3.5 sm:space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-4 border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#059669]">
                  {order.orderId} · Antrean {order.queueNumber} ·{' '}
                  {formatDateTimeId(order.timestamp)}
                </div>
                <h1 className="font-display font-bold text-base sm:text-xl text-slate-900 mt-0.5">
                  {order.customerName}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  {order.institution || 'Umum'} · {order.whatsapp} ·{' '}
                  {order.address || 'Ambil di workshop'}
                </p>
              </div>
              <div className="text-left sm:text-right text-[11px] sm:text-xs">
                <div className="text-slate-500">Deadline Selesai</div>
                <div className="font-mono font-bold text-slate-900">
                  {formatDateShort(order.deadline)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-bold text-xs sm:text-sm text-slate-900">Rincian Item</h2>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg sm:rounded-xl bg-[#F8FAF9]">
                {(order.items || []).map((item) => (
                  <div key={item.itemId} className="p-2.5 sm:p-3.5 space-y-1 text-[11px] sm:text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {item.productName} ({item.qty} pcs)
                      </span>
                      <span className="font-mono font-bold text-[#065E46] tabular-nums">
                        {formatRupiah(item.lineTotal)}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {Object.entries(item.specifications || {})
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </div>
                    {item.addons.length > 0 && (
                      <div className="text-[#059669]">
                        Add-on:{' '}
                        {item.addons
                          .map((a) => (a.selectedOption ? `${a.name} (${a.selectedOption})` : a.name))
                          .join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.paymentProofDataUrl && (
              <div className="space-y-2">
                <h2 className="font-display font-bold text-sm text-slate-900">
                  Bukti Pembayaran Terunggah
                </h2>
                <img
                  src={order.paymentProofDataUrl}
                  alt={`Bukti bayar ${order.orderId}`}
                  className="max-h-64 rounded-xl border border-slate-200 object-contain bg-[#F8FAF9]"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Pesanan
                </label>
                <select
                  value={draftOrderStatus}
                  onChange={(e) => setDraftOrderStatus(e.target.value as OrderWorkflowStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Pembayaran
                </label>
                <select
                  value={draftPaymentStatus}
                  onChange={(e) => setDraftPaymentStatus(e.target.value as PublicPaymentStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                >
                  {PAYMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Admin
              </label>
              <textarea
                rows={2}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Catatan internal atau tindak lanjut..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadReceiptJpg({
                      orderId: order.orderId,
                      queueNumber: order.queueNumber,
                      sourceLabel: settings?.demoMode ? 'ORDER PUBLIK (DEMO)' : 'ORDER PUBLIK',
                      timestamp: order.timestamp,
                      deadline: order.deadline,
                      customerName: order.customerName,
                      whatsapp: order.whatsapp,
                      institution: order.institution,
                      items: order.items || [],
                      subtotal: order.subtotal,
                      totalAddons: order.totalAddons,
                      totalTransaction: order.totalTransaction,
                      paidAmount: order.dpAmount,
                      remainingAmount: order.remainingAmount,
                      paymentMethod: order.paymentMethod,
                      paymentStatus: draftPaymentStatus,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Struk JPG</span>
                </button>
                <a
                  href={buildWhatsAppUrl(
                    order.whatsapp,
                    `Halo ${order.customerName}, kami dari YEG Production mengonfirmasi pesanan ${order.orderId} (${order.queueNumber}). Status saat ini: ${draftOrderStatus}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#15803D] text-xs font-semibold text-[#15803D] hover:bg-[#ECFDF5]"
                >
                  <span>Hubungi WA Pemesan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
