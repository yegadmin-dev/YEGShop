import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatDateShort } from '../shared/pricing.ts';
import type { AiProductionAnalysis, ProductionRecord, ProductionStage } from '../shared/types.ts';

const STAGES: ProductionStage[] = [
  'Antrean Masuk',
  'Potong Bahan',
  'Hotprint Emboss',
  'Rakit & Jahit Siku',
  'QC & Siap Kirim',
];

export function AdminProductionPage() {
  const { notify } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const stageFilter = searchParams.get('stage') || 'ALL';

  const [items, setItems] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  // Optional AI Operational Analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiProductionAnalysis | null>(null);

  const setStageTab = (nextStage: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextStage === 'ALL') next.delete('stage');
    else next.set('stage', nextStage);
    setSearchParams(next, { replace: true });
  };

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await yegApi.getProductionQueue();
      setItems(res.items);
      const nextNotes: Record<string, string> = {};
      for (const item of res.items) {
        nextNotes[item.productionId] = item.notes || '';
      }
      setNotesDraft(nextNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat antrean produksi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleStageChange = async (
    productionId: string,
    stage: ProductionStage,
    customNotes?: string
  ) => {
    setUpdatingId(productionId);
    try {
      const res = await yegApi.updateProductionStage(
        productionId,
        stage,
        customNotes !== undefined ? customNotes : notesDraft[productionId]
      );
      setItems((prev) =>
        prev.map((p) => (p.productionId === res.item.productionId ? res.item : p))
      );
      notify(`Antrean ${res.item.queueNumber} dipindah ke tahap ${stage}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memindahkan tahap produksi.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const analysis = await yegApi.analyzeProductionAi();
      setAiAnalysis(analysis);
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : 'Analis AI tidak tersedia (pastikan GEMINI_API_KEY aktif).',
        'error'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const visibleStages = stageFilter === 'ALL' ? STAGES : STAGES.filter((s) => s === stageFilter);

  return (
    <AdminLayout
      title="Antrean Produksi Workshop"
      subtitle="Pantau dan pindahkan tahap pengerjaan mulai Antrean Masuk hingga QC & Siap Kirim"
    >
      <div className="space-y-3 sm:space-y-5">
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="text-[11px] sm:text-xs text-slate-600">
              Perubahan tahap di sini otomatis memperbarui status di halaman{' '}
              <strong>Pelacakan Pesanan Publik</strong>.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleRunAiAnalysis()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#0284C7] text-white text-[11px] sm:text-xs font-semibold hover:bg-[#0369A1] disabled:opacity-60 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
              </button>
              <button
                type="button"
                onClick={() => void loadQueue()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-700 hover:border-[#065E46] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStageTab('ALL')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === 'ALL'
                  ? 'bg-[#065E46] text-white'
                  : 'bg-[#F8FAF9] text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Tahap ({items.length})
            </button>
            {STAGES.map((st) => {
              const count = items.filter((i) => i.stage === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStageTab(st)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    stageFilter === st
                      ? 'bg-[#065E46] text-white'
                      : 'bg-[#F8FAF9] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {aiAnalysis && (
          <div className="bg-[#EFF8FF] rounded-lg sm:rounded-xl border border-[#0284C7]/35 p-3 sm:p-5 space-y-2.5 sm:space-y-3 text-[11px] sm:text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xs sm:text-sm text-[#0369A1]">
                Ringkasan Analisis Operasional AI
              </h2>
              <button
                type="button"
                onClick={() => setAiAnalysis(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <p className="text-slate-700 leading-relaxed">{aiAnalysis.executiveSummary}</p>
            {aiAnalysis.bottleneckAlerts.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-semibold">Perhatian Bottleneck:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {aiAnalysis.bottleneckAlerts.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2.5 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 sm:h-56 bg-white rounded-lg sm:rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-6 sm:p-10 text-center text-xs sm:text-sm text-slate-500">
            Antrean produksi workshop masih kosong.
          </div>
        ) : (
          <div
            className={`${
              visibleStages.length === 1
                ? 'grid grid-cols-1 gap-3 sm:gap-4 max-w-2xl'
                : 'flex lg:grid lg:grid-cols-5 gap-2.5 sm:gap-4 overflow-x-auto pb-2 lg:overflow-visible items-start'
            }`}
          >
            {visibleStages.map((stage) => {
              const stageIndex = STAGES.indexOf(stage);
              const stageItems = items.filter((i) => i.stage === stage);
              const nextStage = STAGES[stageIndex + 1];

              return (
                <section
                  key={stage}
                  className={`bg-white rounded-lg sm:rounded-xl border border-slate-200 p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 ${
                    visibleStages.length > 1 ? 'min-w-[245px] sm:min-w-[270px] lg:min-w-0 shrink-0' : ''
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="font-display font-bold text-[11px] sm:text-xs text-slate-900">{stage}</h2>
                    <span className="font-mono text-[11px] sm:text-xs font-bold text-[#065E46] tabular-nums">
                      {stageItems.length}
                    </span>
                  </div>

                  {stageItems.length === 0 ? (
                    <div className="py-5 text-center text-[11px] text-slate-400">
                      Kosong
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {stageItems.map((item) => {
                        const busy = updatingId === item.productionId;
                        return (
                          <div
                            key={item.productionId}
                            className="p-2.5 sm:p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-[#065E46]">
                                {item.queueNumber} · {item.orderId}
                              </span>
                              <span className="font-mono text-[10px] sm:text-[11px] text-slate-500">
                                {formatDateShort(item.deadline)}
                              </span>
                            </div>

                            <div>
                              <div className="font-semibold text-slate-900 truncate">{item.customerName}</div>
                              <div className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                                {item.productSummary} ·{' '}
                                <span className="font-mono font-semibold">{item.totalQty} pcs</span>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={notesDraft[item.productionId] ?? item.notes}
                              onChange={(e) =>
                                setNotesDraft((prev) => ({
                                  ...prev,
                                  [item.productionId]: e.target.value,
                                }))
                              }
                              placeholder="Catatan workshop..."
                              className="w-full h-7 sm:h-8 px-2 rounded border border-slate-300 bg-white text-[10px] sm:text-[11px]"
                            />

                            <div className="flex flex-col gap-1.5">
                              <select
                                disabled={busy}
                                value={item.stage}
                                onChange={(e) =>
                                  void handleStageChange(
                                    item.productionId,
                                    e.target.value as ProductionStage
                                  )
                                }
                                className="w-full h-7 sm:h-8 px-2 rounded border border-slate-300 bg-white text-[10px] sm:text-[11px] font-medium"
                              >
                                {STAGES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>

                              {nextStage && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleStageChange(item.productionId, nextStage)}
                                  className="w-full py-1.5 px-2 rounded bg-[#065E46] text-white text-[10px] sm:text-[11px] font-semibold hover:bg-[#054735] disabled:opacity-50 inline-flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>Lanjut: {nextStage}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
