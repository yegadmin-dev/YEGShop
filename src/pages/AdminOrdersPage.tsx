import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderWaitingRecord, OrderWorkflowStatus } from '../shared/types.ts';

const ORDER_STATUSES: OrderWorkflowStatus[] = [
  'Menunggu konfirmasi admin',
  'Diproses',
  'Dalam Produksi',
  'Quality Control',
  'Siap Diambil / Dikirim',
  'Selesai',
  'Dibatalkan',
];

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderWaitingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const statusFilter = searchParams.get('status') || 'ALL';
  const search = searchParams.get('q') || '';

  const updateParams = (nextQ: string, nextStatus: string) => {
    const next = new URLSearchParams();
    if (nextQ.trim()) next.set('q', nextQ);
    if (nextStatus && nextStatus !== 'ALL') next.set('status', nextStatus);
    setSearchParams(next, { replace: true });
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await yegRepositories.orders.listPublicOrders();
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pesanan publik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
      const matchSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.institution.toLowerCase().includes(q) ||
        o.whatsapp.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <AdminLayout
      title="Manajemen Pesanan Publik"
      subtitle="Kelola antrean Orders_Waiting dari toko online YEGShop"
    >
      <div className="space-y-3 sm:space-y-5">
        {/* Toolbar */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => updateParams(e.target.value, statusFilter)}
                placeholder="Cari Order ID, nama, sekolah, atau WA..."
                className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-[#065E46]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => updateParams(search, e.target.value)}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#065E46]"
            >
              <option value="ALL">Semua Status Pesanan</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            <span className="font-mono text-[11px] sm:text-xs text-slate-500 tabular-nums">
              {filtered.length} pesanan
            </span>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
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
              onClick={() => void loadOrders()}
              className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden min-w-0">
          {loading ? (
            <div className="p-4 sm:p-6 space-y-2.5 sm:space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 sm:h-12 bg-[#F8FAF9] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 sm:p-10 text-center space-y-2">
              <p className="font-display font-bold text-sm sm:text-base text-slate-900">
                Tidak Ada Pesanan Publik yang Cocok
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Pesanan baru dari halaman Checkout publik akan langsung muncul di tabel ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-max sm:min-w-full text-left text-[11px] sm:text-xs">
                <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Order / Antrean</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Pelanggan &amp; Instansi</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Deadline</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Pembayaran</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 font-semibold whitespace-nowrap">Status Order</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Total</th>
                    <th className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-semibold whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((o) => (
                    <tr key={o.orderId} className="hover:bg-[#F8FAF9]/70">
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#065E46]">{o.orderId}</div>
                        <div className="font-mono text-[10px] sm:text-[11px] text-slate-500">
                          {o.queueNumber} · {formatDateTimeId(o.timestamp)}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{o.customerName}</div>
                        <div className="text-slate-500">
                          {o.institution || 'Umum'} · <span className="font-mono">{o.whatsapp}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 font-mono text-slate-800 whitespace-nowrap">
                        {formatDateShort(o.deadline)}
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {o.paymentMethod} ({o.paymentType})
                        </div>
                        <div
                          className={`text-[10px] sm:text-[11px] font-medium ${
                            o.paymentStatus === 'Lunas' || o.paymentStatus === 'DP Terverifikasi'
                              ? 'text-[#059669]'
                              : o.paymentStatus === 'Ditolak'
                              ? 'text-red-600'
                              : 'text-amber-700'
                          }`}
                        >
                          {o.paymentStatus}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 font-medium text-slate-800 whitespace-nowrap">
                        {o.orderStatus}
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatRupiah(o.totalTransaction)}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          DP/Bayar: {formatRupiah(o.dpAmount)}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/orders/${o.orderId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg bg-[#065E46] text-white font-semibold hover:bg-[#054735]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Kelola</span>
                        </Link>
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
