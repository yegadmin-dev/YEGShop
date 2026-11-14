import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderAdminCashierRecord } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function CashierHistoryDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { settings } = useStore();
  const [record, setRecord] = useState<OrderAdminCashierRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    yegApi
      .getCashierTerminalHistory()
      .then((res) => {
        if (!mounted) return;
        const found = res.items.find((i) => i.orderId === orderId) || null;
        if (!found) {
          setError(`Transaksi ${orderId || ''} tidak ditemukan.`);
        }
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
    <CashierLayout
      title={record ? `Detail Transaksi ${record.orderId}` : 'Detail Transaksi Kasir'}
      subtitle="Rincian item, spesifikasi, dan cetak ulang struk transaksi POS"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <Link
          to="/kasir/riwayat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Kasir</span>
        </Link>

        {loading ? (
          <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ) : error || !record ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">
              {error || 'Transaksi tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="font-mono text-xs font-bold text-[#065E46]">
                  {record.orderId} · Antrean {record.queueNumber}
                </div>
                <h1 className="font-display font-bold text-xl text-[#071A12] mt-0.5">
                  {record.customerName}
                </h1>
                <div className="text-xs text-slate-500 mt-0.5">
                  {record.institution || 'Walk-in'} · Kasir: {record.cashierName} ·{' '}
                  {formatDateTimeId(record.timestamp)}
                </div>
              </div>
              <div className="text-left sm:text-right text-xs">
                <div className="font-semibold text-[#071A12]">{record.paymentMethod}</div>
                <div className="font-semibold text-[#059669]">{record.paymentStatus}</div>
                <div className="font-mono text-slate-500">
                  Deadline: {formatDateShort(record.deadline)}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-[#F8FAF9]">
              {(record.items || []).map((item) => (
                <div key={item.itemId} className="p-3.5 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#071A12]">
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
                      Add-on:{' '}
                      {item.addons
                        .map((a) => (a.selectedOption ? `${a.name} (${a.selectedOption})` : a.name))
                        .join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="text-xs font-mono tabular-nums space-x-3 text-slate-700">
                <span>Total: {formatRupiah(record.totalTransaction)}</span>
                <span>·</span>
                <span>Dibayar: {formatRupiah(record.dpAmount)}</span>
                <span>·</span>
                <span>Sisa: {formatRupiah(record.remainingAmount)}</span>
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Struk JPG</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
