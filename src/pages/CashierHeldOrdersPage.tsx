import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupiah } from '../shared/pricing.ts';

export function CashierHeldOrdersPage() {
  const navigate = useNavigate();
  const { notify } = useStore();
  const { heldOrders, restoreHeldOrder, deleteHeldOrder } = useCashier();

  const handleRestore = (id: string, label: string) => {
    const ok = restoreHeldOrder(id);
    if (ok) {
      notify(`Pesanan "${label}" dimuat kembali ke Checkout.`, 'success');
      navigate('/kasir');
    }
  };

  return (
    <CashierLayout
      title="Pesanan Kasir Ditahan"
      subtitle="Daftar sementara antrean transaksi yang ditunda oleh kasir"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/kasir"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:border-[#065E46]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Terminal Kasir</span>
          </Link>
        </div>

        {heldOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
            <PauseCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h1 className="font-display font-bold text-lg text-[#071A12]">
              Tidak Ada Pesanan Ditahan
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Gunakan tombol &ldquo;Tahan Order&rdquo; di Terminal Kasir jika pelanggan masih
              menyiapkan data atau ingin melanjutkan nanti.
            </p>
            <Link
              to="/kasir"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold"
            >
              Buka Terminal Kasir
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {heldOrders.map((held) => {
              const total = held.items.reduce((s, i) => s + i.lineTotal, 0);
              const totalQty = held.items.reduce((s, i) => s + i.qty, 0);
              return (
                <div
                  key={held.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display font-bold text-base text-[#071A12]">
                          {held.label}
                        </h2>
                        <div className="font-mono text-[11px] text-slate-500">
                          Disimpan pukul {held.savedAt} · {totalQty} pcs
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#065E46] tabular-nums">
                        {formatRupiah(total)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 rounded-xl bg-[#F8FAF9] border border-slate-200 px-3">
                      {held.items.map((item) => (
                        <div
                          key={item.cartItemId}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {item.productName} ({item.qty} pcs)
                          </span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                            {formatRupiah(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRestore(held.id, held.label)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Muat ke Checkout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteHeldOrder(held.id);
                        notify(`Antrean "${held.label}" dihapus.`, 'info');
                      }}
                      className="p-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                      aria-label="Hapus pesanan ditahan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
