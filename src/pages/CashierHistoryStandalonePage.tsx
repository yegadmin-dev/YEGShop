import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, Eye, Plus, RefreshCw, Search } from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderAdminCashierRecord } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function CashierHistoryStandalonePage() {
  const { settings } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [search, setSearch] = useState(urlQuery);
  const [records, setRecords] = useState<OrderAdminCashierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getCashierTerminalHistory();
      setRecords(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat transaksi kasir.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) next.set('q', val.trim());
    else next.delete('q');
    setSearchParams(next);
  };

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
    <CashierLayout
      title="Riwayat Transaksi Kasir"
      subtitle="Daftar transaksi POS yang tersimpan dan cetak ulang struk JPG"
    >
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari ID POS, pelanggan, instansi, atau nama kasir..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
            />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/kasir"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Transaksi Baru</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
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

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-[#F8FAF9] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-600">Belum ada transaksi kasir yang tercatat.</p>
              <Link
                to="/kasir"
                className="inline-block px-4 py-2 rounded-xl bg-[#065E46] text-white text-xs font-semibold"
              >
                Buka Terminal Kasir
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID POS / Antrean</th>
                    <th className="py-3 px-4 font-semibold">Pelanggan</th>
                    <th className="py-3 px-4 font-semibold">Kasir</th>
                    <th className="py-3 px-4 font-semibold">Metode &amp; Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Qty</th>
                    <th className="py-3 px-4 text-right font-semibold">Total</th>
                    <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.orderId} className="hover:bg-[#F8FAF9]">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#065E46]">{r.orderId}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {r.queueNumber} · {formatDateTimeId(r.timestamp)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#071A12]">{r.customerName}</div>
                        <div className="text-slate-500">{r.institution || 'Walk-in'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{r.cashierName}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{r.paymentMethod}</div>
                        <div className="text-[11px] text-[#059669]">{r.paymentStatus}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {r.totalQty} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#071A12] tabular-nums whitespace-nowrap">
                        {formatRupiah(r.totalTransaction)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/kasir/riwayat/${r.orderId}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:border-[#065E46] inline-flex items-center gap-1"
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
                            className="px-2.5 py-1.5 rounded-lg bg-[#065E46] text-white font-semibold hover:bg-[#054735] inline-flex items-center gap-1 cursor-pointer"
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
    </CashierLayout>
  );
}
