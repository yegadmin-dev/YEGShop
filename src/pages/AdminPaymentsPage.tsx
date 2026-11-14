import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, RefreshCw, XCircle } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { PaymentRecord, PublicPaymentStatus } from '../shared/types.ts';

export function AdminPaymentsPage() {
  const { notify } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sourceFilter = (searchParams.get('source') as 'ALL' | 'PUBLIC' | 'ADMIN_CASHIER') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';

  const updateParams = (nextSource: string, nextStatus: string) => {
    const next = new URLSearchParams();
    if (nextSource && nextSource !== 'ALL') next.set('source', nextSource);
    if (nextStatus && nextStatus !== 'ALL') next.set('status', nextStatus);
    setSearchParams(next, { replace: true });
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await yegRepositories.payments.listPayments();
      setPayments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pembayaran.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleVerify = async (paymentId: string, status: PublicPaymentStatus) => {
    setUpdatingId(paymentId);
    try {
      const updated = await yegRepositories.payments.verifyPayment(
        paymentId,
        status,
        'Mochamad Ridhwan M.'
      );
      setPayments((prev) => prev.map((p) => (p.paymentId === updated.paymentId ? updated : p)));
      notify(`Status pembayaran ${updated.orderId} diubah menjadi ${status}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const matchSource = sourceFilter === 'ALL' || p.source === sourceFilter;
        const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchSource && matchStatus;
      }),
    [payments, sourceFilter, statusFilter]
  );

  return (
    <AdminLayout
      title="Verifikasi Pembayaran"
      subtitle="Periksa bukti transfer SeaBank, QRIS, dan status pembayaran seluruh kanal"
    >
      <div className="space-y-3 sm:space-y-5">
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {(['ALL', 'PUBLIC', 'ADMIN_CASHIER'] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => updateParams(src, statusFilter)}
                className={`px-2.5 py-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold border cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-[#065E46] text-white border-[#065E46]'
                    : 'bg-[#F8FAF9] text-slate-700 border-slate-200'
                }`}
              >
                {src === 'ALL' ? 'Semua Kanal' : src === 'PUBLIC' ? 'Order Publik' : 'Kasir POS'}
              </button>
            ))}

            <select
              value={statusFilter}
              onChange={(e) => updateParams(sourceFilter, e.target.value)}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-slate-300 bg-white text-[11px] sm:text-xs font-medium text-slate-800"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu verifikasi pembayaran">Menunggu verifikasi pembayaran</option>
              <option value="DP Terverifikasi">DP Terverifikasi</option>
              <option value="Lunas">Lunas</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Belum Dibayar">Belum Dibayar</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadPayments()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {error && (
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2.5 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadPayments()}
              className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden min-w-0">
          {loading ? (
            <div className="p-4 sm:p-6 space-y-2.5 sm:space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 sm:h-12 bg-[#F8FAF9] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 sm:p-10 text-center text-xs sm:text-sm text-slate-500">
              Tidak ada data pembayaran untuk filter yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-max sm:min-w-full text-left text-[11px] sm:text-xs">
                <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Order</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Pelanggan</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Metode</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Nominal Bayar</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Status</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const busy = updatingId === p.paymentId;
                    return (
                      <tr key={p.paymentId} className="hover:bg-[#F8FAF9]/70">
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-[#065E46]">{p.orderId}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500">
                            {p.source === 'PUBLIC' ? 'Publik' : 'Kasir POS'} ·{' '}
                            {formatDateTimeId(p.createdAt)}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {p.customerName}
                        </td>
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                          {p.method} ({p.paymentType})
                        </td>
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-bold text-slate-900">{formatRupiah(p.amount)}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500">
                            dari {formatRupiah(p.totalTransaction)}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                          <div
                            className={`font-semibold ${
                              p.status === 'Lunas' || p.status === 'DP Terverifikasi'
                                ? 'text-[#059669]'
                                : p.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-700'
                            }`}
                          >
                            {p.status}
                          </div>
                          {p.verifiedBy && (
                            <div className="text-[10px] sm:text-[11px] text-slate-500">
                              Oleh {p.verifiedBy}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              to={`/admin/payments/${p.paymentId}`}
                              className="px-2 py-1.5 sm:px-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:border-[#065E46] inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Bukti</span>
                            </Link>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void handleVerify(
                                  p.paymentId,
                                  p.paymentType === 'DP' ? 'DP Terverifikasi' : 'Lunas'
                                )
                              }
                              className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-[#065E46] text-white font-semibold hover:bg-[#054735] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{p.paymentType === 'DP' ? 'Sah DP' : 'Lunas'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleVerify(p.paymentId, 'Ditolak')}
                              className="px-2 py-1.5 sm:px-2.5 rounded-lg border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
