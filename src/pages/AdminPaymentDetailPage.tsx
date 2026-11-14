import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { PaymentRecord, PublicPaymentStatus } from '../shared/types.ts';

export function AdminPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { notify } = useStore();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    yegRepositories.payments
      .listPayments()
      .then((list) => {
        if (!mounted) return;
        const found = list.find((p) => p.paymentId === paymentId) || null;
        if (!found) setError(`Data pembayaran ${paymentId || ''} tidak ditemukan.`);
        setPayment(found);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat detail pembayaran.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [paymentId]);

  const handleVerify = async (status: PublicPaymentStatus) => {
    if (!payment) return;
    setUpdating(true);
    try {
      const updated = await yegRepositories.payments.verifyPayment(
        payment.paymentId,
        status,
        'Mochamad Ridhwan M.'
      );
      setPayment(updated);
      notify(`Status pembayaran ${updated.orderId} diubah menjadi ${status}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout
      title={payment ? `Bukti Bayar ${payment.orderId}` : 'Detail Bukti Pembayaran'}
      subtitle="Periksa bukti transfer atau transaksi kasir lalu konfirmasi status pembayaran"
    >
      <div className="max-w-xl mx-auto space-y-3 sm:space-y-5">
        <Link
          to="/admin/payments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Kembali ke Verifikasi Pembayaran</span>
        </Link>

        {loading ? (
          <div className="h-60 sm:h-72 bg-white rounded-xl sm:rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !payment ? (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-red-200 p-5 sm:p-8 text-center space-y-3">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {error || 'Pembayaran tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 space-y-3.5 sm:space-y-5">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#065E46]">
                  {payment.orderId} · {payment.paymentId}
                </div>
                <h1 className="font-display font-bold text-base sm:text-xl text-slate-900 mt-0.5">
                  {payment.customerName}
                </h1>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {payment.method} ({payment.paymentType}) · {formatDateTimeId(payment.createdAt)}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-xs sm:text-sm font-bold text-[#065E46]">
                  {formatRupiah(payment.amount)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500">
                  Total: {formatRupiah(payment.totalTransaction)}
                </div>
              </div>
            </div>

            {payment.proofDataUrl ? (
              <img
                src={payment.proofDataUrl}
                alt={`Bukti ${payment.orderId}`}
                className="w-full max-h-80 rounded-xl border border-slate-200 object-contain bg-[#F8FAF9]"
              />
            ) : (
              <div className="p-6 rounded-xl bg-[#F8FAF9] border border-slate-200 text-center text-xs text-slate-600">
                ID Referensi Bukti:{' '}
                <span className="font-mono font-semibold">{payment.proofFileId}</span>
                <div className="mt-1 text-slate-500">
                  (Data seed demo / transaksi tunai POS tanpa unggahan gambar)
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Saat Ini:</span>
              <span className="font-bold text-[#065E46]">{payment.status}</span>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={updating}
                onClick={() => void handleVerify('Ditolak')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak</span>
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => void handleVerify('DP Terverifikasi')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#0284C7] text-[#0284C7] text-xs font-bold hover:bg-[#EFF8FF] disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verifikasi DP</span>
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => void handleVerify('Lunas')}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verifikasi Lunas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
