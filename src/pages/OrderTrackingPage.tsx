import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, Search } from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { ProductionStage, PublicOrderLookupResult } from '../shared/types.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

const PRODUCTION_STAGES: ProductionStage[] = [
  'Antrean Masuk',
  'Potong Bahan',
  'Hotprint Emboss',
  'Rakit & Jahit Siku',
  'QC & Siap Kirim',
];

export function OrderTrackingPage() {
  const { settings } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PublicOrderLookupResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runLookup = useCallback(async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const items = await yegRepositories.orders.lookupStatus(clean);
      setResults(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal melacak pesanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      void runLookup(initialQuery);
    }
  }, [initialQuery, runLookup]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      setError('Masukkan Order ID atau nomor WhatsApp pemesan.');
      return;
    }
    setSearchParams({ q: clean });
    void runLookup(clean);
  };

  const handleQuickDemoLookup = (sampleId: string) => {
    setQuery(sampleId);
    setSearchParams({ q: sampleId });
    void runLookup(sampleId);
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <RevealBlock className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
            Pelacakan Pesanan &amp; Produksi
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#071A12]">
            Lacak Status Pesanan YEGShop
          </h1>
          <p className="text-sm text-slate-600">
            Masukkan Order ID (misal <span className="font-mono font-semibold">YEG-2501</span>) atau
            nomor WhatsApp yang digunakan saat memesan.
          </p>
        </RevealBlock>

        {settings?.demoMode && (
          <RevealBlock delayMs={40} className="p-4 rounded-xl bg-[#EFF8FF] border border-[#0284C7]/40 space-y-2 text-xs text-[#071A12]">
            <div className="font-semibold">
              Mode Demo Aktif — Data Contoh Simulasi (Bukan Transaksi Produksi)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-700">Coba lacak Order ID Demo:</span>
              {['YEG-2501', 'YEG-2502', 'POS-2501'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleQuickDemoLookup(id)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 font-mono font-semibold text-[#0284C7] hover:border-[#0284C7] cursor-pointer"
                >
                  {id} (DEMO)
                </button>
              ))}
            </div>
          </RevealBlock>
        )}

        <RevealBlock delayMs={70}>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: YEG-2501 atau 081298443210"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0284C7]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="yeg-cta-loop h-11 px-6 rounded-lg bg-[#0284C7] text-white font-display font-bold text-sm hover:bg-[#0369A1] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {loading ? 'Mencari...' : 'Lacak Pesanan'}
            </button>
          </form>
        </RevealBlock>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
            Memeriksa status antrean &amp; produksi pesanan...
          </div>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
            <h2 className="font-display font-bold text-base text-slate-900">
              Pesanan Tidak Ditemukan
            </h2>
            <p className="text-sm text-slate-600">
              Pastikan Order ID atau nomor WhatsApp yang dimasukkan sudah benar.
            </p>
          </div>
        )}

        {!loading &&
          results.map((ord) => {
            const stageIdx = Math.max(0, PRODUCTION_STAGES.indexOf(ord.productionStage));
            return (
              <RevealBlock key={ord.orderId}>
                <article className="yeg-hover-lift bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-[#065E46]">{ord.orderId}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Antrean {ord.queueNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ord.source === 'ADMIN_CASHIER' ? 'Kasir POS' : 'Order Publik'}</span>
                    </div>
                    <h2 className="font-display font-bold text-lg text-[#071A12] mt-1">
                      {ord.customerName}
                    </h2>
                    <div className="text-xs text-slate-500">
                      {ord.institution || 'Umum / Pribadi'} · Dipesan {formatDateTimeId(ord.timestamp)}
                    </div>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <div className="text-xs font-semibold text-[#071A12]">{ord.orderStatus}</div>
                    <div className="text-xs text-[#059669] font-medium">{ord.paymentStatus}</div>
                    <div className="font-mono text-xs text-slate-500">
                      Deadline: {formatDateShort(ord.deadline)}
                    </div>
                  </div>
                </div>

                {/* Production 5-Step Progress */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Tahap Produksi Workshop: <span className="text-[#065E46]">{ord.productionStage}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {PRODUCTION_STAGES.map((stage, idx) => {
                      const done = idx <= stageIdx;
                      return (
                        <div
                          key={stage}
                          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                            done
                              ? 'bg-[#ECFDF5] border-[#065E46] text-[#065E46] font-semibold'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              done ? 'text-[#059669]' : 'text-slate-300'
                            }`}
                          />
                          <span className="leading-tight">{stage}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {ord.items.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <span className="font-semibold text-[#071A12]">{item.productName}</span>{' '}
                        <span className="font-mono text-xs text-slate-500">({item.qty} pcs)</span>
                      </div>
                      <div className="font-mono font-bold text-[#071A12] tabular-nums">
                        {formatRupiah(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 space-x-3 font-mono tabular-nums">
                    <span>Total: {formatRupiah(ord.totalTransaction)}</span>
                    <span>·</span>
                    <span>Dibayar: {formatRupiah(ord.dpAmount)}</span>
                    <span>·</span>
                    <span>Sisa: {formatRupiah(ord.remainingAmount)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadReceiptJpg({
                        orderId: ord.orderId,
                        queueNumber: ord.queueNumber,
                        sourceLabel: settings?.demoMode ? `${ord.source} (DEMO)` : ord.source,
                        timestamp: ord.timestamp,
                        deadline: ord.deadline,
                        customerName: ord.customerName,
                        institution: ord.institution,
                        items: ord.items,
                        subtotal: ord.items.reduce((s, i) => s + i.lineSubtotal, 0),
                        totalAddons: ord.items.reduce((s, i) => s + i.lineAddonsTotal, 0),
                        totalTransaction: ord.totalTransaction,
                        paidAmount: ord.dpAmount,
                        remainingAmount: ord.remainingAmount,
                        paymentMethod: ord.paymentMethod,
                        paymentStatus: ord.paymentStatus,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 hover:border-[#065E46] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Struk JPG</span>
                  </button>
                </div>
                </article>
              </RevealBlock>
            );
          })}
      </div>
    </PublicLayout>
  );
}
