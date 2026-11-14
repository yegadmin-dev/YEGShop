import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderAdminCashierRecord } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function AdminCashierOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { settings } = useStore();
  const [record, setRecord] = useState<OrderAdminCashierRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    yegRepositories.orders
      .listCashierHistory()
      .then((list) => {
        if (!mounted) return;
        const found = list.find((r) => r.orderId === orderId) || null;
        if (!found) setError(`Transaksi kasir ${orderId || ''} tidak ditemukan.`);
        setRecord(found);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat detail transaksi kasir.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  return (
    <AdminLayout
      title={record ? `Detail POS ${record.orderId}` : 'Detail Transaksi Kasir'}
      subtitle="Arsip transaksi kasir workshop dan cetak ulang struk JPG"
    >
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-5">
        <Link
          to="/admin/cashier/history"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Kembali ke Riwayat Kasir</span>
        </Link>

        {loading ? (
          <div className="h-60 sm:h-72 bg-white rounded-xl sm:rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !record ? (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-red-200 p-5 sm:p-8 text-center space-y-3">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {error || 'Transaksi tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 space-y-3.5 sm:space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#065E46]">
                  {record.orderId} · Antrean {record.queueNumber}
                </div>
                <h1 className="font-display font-bold text-base sm:text-xl text-slate-900 mt-0.5">
                  {record.customerName}
                </h1>
                <div className="text-[11px] sm:text-xs text-slate-500">
                  {record.institution || 'Walk-in'} · Deadline: {formatDateShort(record.deadline)}{' '}
                  · Kasir: {record.cashierName} · {formatDateTimeId(record.timestamp)}
                </div>
              </div>
              <div className="text-right text-[11px] sm:text-xs">
                <div className="font-semibold text-slate-900">{record.paymentMethod}</div>
                <div className="font-semibold text-[#059669]">{record.paymentStatus}</div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg sm:rounded-xl bg-[#F8FAF9]">
              {(record.items || []).map((item) => (
                <div key={item.itemId} className="p-2.5 sm:p-3.5 text-[11px] sm:text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>
                      {item.productName} ({item.qty} pcs)
                    </span>
                    <span className="font-mono tabular-nums">{formatRupiah(item.lineTotal)}</span>
                  </div>
                  <div className="text-slate-600">
                    {Object.entries(item.specifications || {})
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </div>
                  {item.addons.length > 0 && (
                    <div className="text-[#059669]">
                      Add-on: {item.addons.map((a) => a.name).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 text-xs pt-2 border-t border-slate-100 font-mono tabular-nums">
              <div className="space-x-3 text-slate-700">
                <span>Dibayar: {formatRupiah(record.dpAmount)}</span>
                <span>·</span>
                <span>Sisa: {formatRupiah(record.remainingAmount)}</span>
                <span>·</span>
                <span className="font-bold text-[#065E46]">
                  Total: {formatRupiah(record.totalTransaction)}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  downloadReceiptJpg({
                    orderId: record.orderId,
                    queueNumber: record.queueNumber,
                    sourceLabel: settings?.demoMode ? 'KASIR POS (DEMO)' : 'KASIR POS',
                    timestamp: record.timestamp,
                    deadline: record.deadline,
                    customerName: record.customerName,
                    whatsapp: record.whatsapp,
                    institution: record.institution,
                    items: record.items || [],
                    subtotal: record.productSubtotal,
                    totalAddons: record.totalAddons,
                    totalTransaction: record.totalTransaction,
                    paidAmount: record.dpAmount,
                    remainingAmount: record.remainingAmount,
                    paymentMethod: record.paymentMethod,
                    paymentStatus: record.paymentStatus,
                    cashReceived: record.cashReceived,
                    changeAmount: record.changeAmount,
                    cashierName: record.cashierName,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#065E46] text-white font-bold hover:bg-[#054735] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Struk JPG</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
