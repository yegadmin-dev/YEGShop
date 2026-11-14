import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatRupiah } from '../shared/pricing.ts';

interface ReportsData {
  totalRevenueAllChannels: number;
  publicRevenue: number;
  cashierRevenue: number;
  totalOrdersCount: number;
  verifiedPaidAmount: number;
  outstandingReceivable: number;
  topProducts: Array<{ productName: string; totalQty: number; totalRevenue: number }>;
  paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
}

export function AdminReportsPage() {
  const { settings } = useStore();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getReports();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan penjualan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['Metrik', 'Nilai'],
      ['Total Omzet Semua Kanal', String(data.totalRevenueAllChannels)],
      ['Omzet Kanal Publik', String(data.publicRevenue)],
      ['Omzet Kanal Kasir POS', String(data.cashierRevenue)],
      ['Total Pembayaran Terverifikasi', String(data.verifiedPaidAmount)],
      ['Sisa Piutang Belum Lunas', String(data.outstandingReceivable)],
      [''],
      ['Produk Terlaris', 'Total Qty (pcs)', 'Total Pendapatan (IDR)'],
      ...data.topProducts.map((p) => [p.productName, String(p.totalQty), String(p.totalRevenue)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan-YEGShop-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Laporan Penjualan & Rekap Kanal"
      subtitle="Ringkasan omzet gabungan kanal Publik dan Kasir POS YEGShop"
    >
      <div className="space-y-6">
        {(settings?.demoMode ?? true) && (
          <div className="p-3.5 rounded-xl bg-[#EFF8FF] border border-[#0284C7]/35 text-xs text-[#071A12]">
            <strong className="text-[#0369A1]">Data Simulasi DEMO:</strong> Angka laporan dihitung dari pesanan uji coba pada
            penyimpanan demo lokal.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => void loadReports()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
                  <div className="text-xs text-slate-500">Total Omzet Gabungan</div>
                  <div className="font-mono font-bold text-xl text-[#065E46] tabular-nums">
                    {formatRupiah(data.totalRevenueAllChannels)}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {data.totalOrdersCount} transaksi total
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
                  <div className="text-xs text-slate-500">Omzet Order Publik</div>
                  <div className="font-mono font-bold text-xl text-slate-900 tabular-nums">
                    {formatRupiah(data.publicRevenue)}
                  </div>
                  <div className="text-xs text-slate-500">Kanal Checkout Online</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
                  <div className="text-xs text-slate-500">Omzet Kasir POS</div>
                  <div className="font-mono font-bold text-xl text-slate-900 tabular-nums">
                    {formatRupiah(data.cashierRevenue)}
                  </div>
                  <div className="text-xs text-slate-500">Kanal Workshop Walk-in</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
                  <div className="text-xs text-slate-500">Dana Terverifikasi / Piutang</div>
                  <div className="font-mono font-bold text-xl text-[#059669] tabular-nums">
                    {formatRupiah(data.verifiedPaidAmount)}
                  </div>
                  <div className="font-mono text-xs text-amber-700 tabular-nums">
                    Sisa tagihan: {formatRupiah(data.outstandingReceivable)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Produk Paling Banyak Dipesan
                  </h2>
                  {data.topProducts.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data penjualan produk.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-2 pr-3 font-semibold">Nama Produk</th>
                            <th className="py-2 pr-3 text-right font-semibold">Qty (pcs)</th>
                            <th className="py-2 text-right font-semibold">Total Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.topProducts.map((tp) => (
                            <tr key={tp.productName}>
                              <td className="py-2.5 pr-3 font-semibold text-slate-900">
                                {tp.productName}
                              </td>
                              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                                {tp.totalQty}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-[#065E46] tabular-nums">
                                {formatRupiah(tp.totalRevenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Rincian Metode Pembayaran
                  </h2>
                  {data.paymentMethodBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data pembayaran.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.paymentMethodBreakdown.map((pm) => (
                        <div
                          key={pm.method}
                          className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{pm.method}</div>
                            <div className="text-slate-500 font-mono">{pm.count} transaksi</div>
                          </div>
                          <div className="font-mono font-bold text-[#065E46] tabular-nums">
                            {formatRupiah(pm.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
