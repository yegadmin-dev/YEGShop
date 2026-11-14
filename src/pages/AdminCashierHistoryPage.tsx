import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, Eye, Plus, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderAdminCashierRecord } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function AdminCashierHistoryPage() {
  const { settings } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<OrderAdminCashierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const search = searchParams.get('q') || '';

  const updateSearch = (val: string) => {
    const next = new URLSearchParams();
    if (val.trim()) next.set('q', val);
    setSearchParams(next, { replace: true });
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await yegRepositories.orders.listCashierHistory();
      setRecords(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat kasir.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        !q ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.institution || '').toLowerCase().includes(q) ||
        r.cashierName.toLowerCase().includes(q)
    );
  }, [records, search]);

  return (
    <AdminLayout
      title="Riwayat Transaksi Kasir"
      subtitle="Arsip transaksi POS dari Order_Catatan_Admin dan cetak ulang struk JPG"
    >
      <div className="space-y-3 sm:space-y-5">
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Cari ID POS, pelanggan, instansi, atau nama kasir..."
              className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-[#065E46]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/kasir"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#065E46] text-white text-[11px] sm:text-xs font-bold hover:bg-[#054735]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Transaksi Baru</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2.5 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
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
            <div className="p-6 sm:p-10 text-center space-y-3">
              <p className="text-xs sm:text-sm text-slate-600">Belum ada transaksi kasir yang tercatat.</p>
              <Link
                to="/kasir"
                className="inline-block px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735]"
              >
                Buka Kasir POS
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-max sm:min-w-full text-left text-[11px] sm:text-xs">
                <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">ID POS / Antrean</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Pelanggan</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Kasir</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Metode &amp; Status</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Qty</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Total</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.orderId} className="hover:bg-[#F8FAF9]/70">
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#065E46]">{r.orderId}</div>
                        <div className="font-mono text-[10px] sm:text-[11px] text-slate-500">
                          {r.queueNumber} · {formatDateTimeId(r.timestamp)}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{r.customerName}</div>
                        <div className="text-slate-500">{r.institution || 'Walk-in'}</div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-slate-700 whitespace-nowrap">
                        {r.cashierName}
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{r.paymentMethod}</div>
                        <div className="text-[10px] sm:text-[11px] text-[#059669]">{r.paymentStatus}</div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {r.totalQty} pcs
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(r.totalTransaction)}
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/admin/cashier/history/${r.orderId}`}
                            className="px-2 py-1.5 sm:px-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:border-[#065E46] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </Link>
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
                                items: r.items || [],
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
                            className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-[#065E46] text-white font-semibold hover:bg-[#054735] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Struk</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
