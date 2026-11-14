import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ClipboardList,
  CreditCard,
  Factory,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { yegApi } from '../services/api.ts';
import { formatDateShort, formatRupiah } from '../shared/pricing.ts';
import type { OrderWaitingRecord, ProductionRecord } from '../shared/types.ts';

interface DashboardSummary {
  totalPublicOrders: number;
  totalCashierOrders: number;
  pendingConfirmationCount: number;
  verifiedPaymentsCount: number;
  inProductionCount: number;
  completedCount: number;
  totalPublicValue: number;
  totalCashierValue: number;
}

export function AdminDashboardPage() {
  const { settings } = useStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderWaitingRecord[]>([]);
  const [productionQueue, setProductionQueue] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, orders, prod] = await Promise.all([
        yegApi.getDashboard(),
        yegRepositories.orders.listPublicOrders(),
        yegApi.getProductionQueue(),
      ]);
      setSummary(dash);
      setRecentOrders(orders.slice(0, 5));
      setProductionQueue(prod.items.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminLayout
      title="Dashboard Operasional YEGShop"
      subtitle="Ringkasan pesanan publik, transaksi kasir POS, dan antrean workshop"
    >
      <div className="space-y-3 sm:space-y-6">
        {/* Explicit DEMO Mode Banner */}
        {(settings?.demoMode ?? true) && (
          <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-[#EFF8FF] border border-[#0284C7]/35 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#071A12]">
            <div>
              <strong className="font-semibold text-[#0369A1]">Lingkungan Data DEMO:</strong> Seluruh angka,
              antrean, dan transaksi yang tampil saat ini adalah data simulasi pengujian — bukan
              transaksi produksi nyata.
            </div>
            <span className="font-mono font-bold text-[#065E46]">
              Sumber: {yegRepositories.mode}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold text-red-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          </div>
        )}

        {/* KPI Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg sm:rounded-xl border border-slate-200 h-20 sm:h-28 animate-pulse"
              />
            ))}
          </div>
        ) : (
          summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-slate-500">
                  <span className="truncate">Pesanan Publik</span>
                  <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#065E46] shrink-0" />
                </div>
                <div className="font-mono font-bold text-lg sm:text-2xl text-[#071A12] tabular-nums">
                  {summary.totalPublicOrders}
                </div>
                <div className="font-mono text-[10px] sm:text-xs text-[#059669] tabular-nums truncate">
                  {formatRupiah(summary.totalPublicValue)}
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-slate-500">
                  <span className="truncate">Kasir POS</span>
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7] shrink-0" />
                </div>
                <div className="font-mono font-bold text-lg sm:text-2xl text-[#071A12] tabular-nums">
                  {summary.totalCashierOrders}
                </div>
                <div className="font-mono text-[10px] sm:text-xs text-[#059669] tabular-nums truncate">
                  {formatRupiah(summary.totalCashierValue)}
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-slate-500">
                  <span className="truncate">Tunggu Konfirmasi</span>
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                </div>
                <div className="font-mono font-bold text-lg sm:text-2xl text-[#071A12] tabular-nums">
                  {summary.pendingConfirmationCount}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Sah: {summary.verifiedPaymentsCount} bayar
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-slate-500">
                  <span className="truncate">Antrean Produksi</span>
                  <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#15803D] shrink-0" />
                </div>
                <div className="font-mono font-bold text-lg sm:text-2xl text-[#071A12] tabular-nums">
                  {summary.inProductionCount}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Siap QC: {summary.completedCount}
                </div>
              </div>
            </div>
          )
        )}

        {/* Quick Operational Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Link
            to="/admin/orders"
            className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-semibold text-slate-800 hover:border-[#065E46] hover:text-[#065E46] transition-colors truncate"
          >
            Pesanan Publik &rarr;
          </Link>
          <Link
            to="/kasir"
            className="bg-[#065E46] rounded-lg sm:rounded-xl border border-[#065E46] p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-bold text-white hover:bg-[#054735] transition-colors truncate"
          >
            Buka Kasir POS &rarr;
          </Link>
          <Link
            to="/admin/payments"
            className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-semibold text-slate-800 hover:border-[#065E46] hover:text-[#065E46] transition-colors truncate"
          >
            Verifikasi Bayar &rarr;
          </Link>
          <Link
            to="/admin/production"
            className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-semibold text-slate-800 hover:border-[#065E46] hover:text-[#065E46] transition-colors truncate"
          >
            Antrean Produksi &rarr;
          </Link>
        </div>

        {/* Recent Public Orders & Production Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
          <section className="lg:col-span-7 bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                Pesanan Publik Terbaru
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/admin/orders"
                  className="text-[11px] sm:text-xs font-semibold text-[#065E46] hover:underline whitespace-nowrap"
                >
                  Lihat Semua
                </Link>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-32 sm:h-40 bg-[#F8FAF9] rounded-lg animate-pulse" />
            ) : recentOrders.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-5 text-center">
                Belum ada pesanan publik.
              </p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-max sm:min-w-full text-left text-[11px] sm:text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-semibold whitespace-nowrap">Order</th>
                      <th className="py-2 pr-3 font-semibold whitespace-nowrap">Pemesan</th>
                      <th className="py-2 pr-3 font-semibold whitespace-nowrap">Status</th>
                      <th className="py-2 text-right font-semibold whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td className="py-2 pr-3 font-mono font-bold text-[#065E46] whitespace-nowrap">
                          <Link
                            to={`/admin/orders/${o.orderId}`}
                            className="hover:underline"
                          >
                            {o.orderId}
                          </Link>
                          <div className="text-[10px] sm:text-[11px] font-normal text-slate-500">
                            {o.queueNumber}
                          </div>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{o.customerName}</div>
                          <div className="text-slate-500">{o.institution || '-'}</div>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{o.orderStatus}</div>
                          <div className="text-slate-500">{o.paymentStatus}</div>
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatRupiah(o.totalTransaction)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="lg:col-span-5 bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                Antrean Produksi
              </h2>
              <Link
                to="/status"
                className="text-[11px] sm:text-xs font-semibold text-[#065E46] hover:underline whitespace-nowrap"
              >
                Lacak Publik
              </Link>
            </div>

            {loading ? (
              <div className="h-32 sm:h-40 bg-[#F8FAF9] rounded-lg animate-pulse" />
            ) : productionQueue.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-5 text-center">
                Antrean produksi kosong.
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {productionQueue.map((p) => (
                  <div
                    key={p.productionId}
                    className="p-2.5 sm:p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 space-y-0.5 sm:space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                      <span className="font-mono font-bold text-[#065E46]">
                        {p.queueNumber} · {p.orderId}
                      </span>
                      <span className="font-mono text-slate-500">
                        {formatDateShort(p.deadline)}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-slate-900 truncate">
                      {p.customerName}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 line-clamp-1">
                      {p.productSummary}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#059669]">
                      Tahap: {p.stage} · {p.totalQty} pcs
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
