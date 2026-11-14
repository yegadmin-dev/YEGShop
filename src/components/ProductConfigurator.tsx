import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  K13_COLORS,
  calculateConfiguredQuote,
  formatRupiah,
} from '../shared/pricing.ts';
import type {
  Addon,
  AiSpecSuggestion,
  ConfiguredItemInput,
  Product,
  SelectedAddonInput,
} from '../shared/types.ts';
import { yegApi } from '../services/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductConfiguratorProps {
  product: Product;
  allAddons: Addon[];
  initialConfig?: Partial<ConfiguredItemInput>;
  submitLabel?: string;
  compactMode?: boolean;
  onSubmit: (config: ConfiguredItemInput) => void;
}

export function ProductConfigurator({
  product,
  allAddons,
  initialConfig,
  submitLabel = 'Tambahkan ke Keranjang',
  compactMode = false,
  onSubmit,
}: ProductConfiguratorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `yegshop_cfg_draft_${compactMode ? 'pos' : 'pub'}_${product.productId}`;

  const savedDraft = useMemo(() => {
    if (initialConfig) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Partial<ConfiguredItemInput>) : null;
    } catch {
      return null;
    }
  }, [initialConfig, storageKey]);

  const effectiveInitial = initialConfig || savedDraft;

  const defaultSpecs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const opt of product.options) {
      if (effectiveInitial?.specifications?.[opt.key] !== undefined) {
        out[opt.key] = effectiveInitial.specifications[opt.key];
      } else if (opt.values.length > 0) {
        out[opt.key] = opt.values[0];
      } else {
        out[opt.key] = '';
      }
    }
    return out;
  }, [product, effectiveInitial]);

  const [qty, setQty] = useState<number>(effectiveInitial?.qty || Math.max(50, product.minOrderQty));
  const [specs, setSpecs] = useState<Record<string, string>>(defaultSpecs);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddonInput[]>(
    effectiveInitial?.addons || []
  );
  const [logoFileName, setLogoFileName] = useState<string | undefined>(
    effectiveInitial?.logoFileName
  );
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | undefined>(
    effectiveInitial?.logoPreviewDataUrl
  );

  // AI Spec Consultant state synced with URL (?ai=1)
  const aiOpen = searchParams.get('ai') === '1';
  const setAiOpen = (nextVal: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof nextVal === 'function' ? nextVal(aiOpen) : nextVal;
    const next = new URLSearchParams(searchParams);
    if (resolved) next.set('ai', '1');
    else next.delete('ai');
    setSearchParams(next, { replace: true });
  };
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiBudget, setAiBudget] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiSpecSuggestion | null>(null);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (initialConfig) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          qty,
          specifications: specs,
          addons: selectedAddons,
          logoFileName,
        })
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [initialConfig, storageKey, qty, specs, selectedAddons, logoFileName]);

  // Filter add-ons strictly via Applicable Products rule from spreadsheet
  const applicableAddons = useMemo(
    () =>
      allAddons.filter(
        (a) =>
          a.active &&
          (a.applicableProducts.includes(product.productId) ||
            a.applicableProducts.includes(product.slug) ||
            (a.applicableProducts.includes('all_map') && product.isMapProduct))
      ),
    [allAddons, product]
  );

  const quote = useMemo(
    () =>
      calculateConfiguredQuote(product, allAddons, {
        productId: product.productId,
        qty,
        specifications: specs,
        addons: selectedAddons,
        logoFileName,
        logoPreviewDataUrl,
      }),
    [product, allAddons, qty, specs, selectedAddons, logoFileName, logoPreviewDataUrl]
  );

  const handleSpecChange = (key: string, val: string) => {
    setSpecs((prev) => ({ ...prev, [key]: val }));
  };

  const toggleAddon = (addon: Addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((s) => s.addonId === addon.addonId);
      if (exists) {
        return prev.filter((s) => s.addonId !== addon.addonId);
      }
      const defaultOpt = addon.requiresOption
        ? addon.options?.find((o) => o.active)?.name || 'Siku Segitiga'
        : undefined;
      return [...prev, { addonId: addon.addonId, selectedOption: defaultOpt }];
    });
  };

  const setAddonOption = (addonId: string, optionName: string) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((s) => s.addonId === addonId);
      if (!exists) {
        return [...prev, { addonId, selectedOption: optionName }];
      }
      return prev.map((s) =>
        s.addonId === addonId ? { ...s, selectedOption: optionName } : s
      );
    });
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return;
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoPreviewDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const scrollCarousel = (id: string, dir: -1 | 1) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollBy({ left: dir * 280, behavior: 'smooth' });
    }
  };

  const handleAskAi = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await yegApi.consultSpecAi({
        question: aiQuestion,
        qtyEstimate: qty,
        budgetPerPcs: aiBudget ? Number(aiBudget) : undefined,
        productSlug: product.slug,
      });
      setAiResult(res);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal menghubungi Konsultan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const carouselId = `addons-carousel-${product.productId}`;

  return (
    <div className="space-y-6">
      {/* Step 1: Quantity & Tier Pricing */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-base text-slate-900">
            1. Jumlah Pesanan &amp; Tier Harga
          </h3>
          <span className="font-mono text-xs font-semibold text-[#059669]">
            Tier Aktif: {quote.tierLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '1–49 pcs', sub: 'Satuan / Sampel', sampleQty: 25, active: qty < 50 },
            {
              label: '50–100 pcs',
              sub: 'Standar Sekolah',
              sampleQty: 80,
              active: qty >= 50 && qty <= 100,
            },
            { label: '101+ pcs', sub: 'Harga Grosir', sampleQty: 120, active: qty >= 101 },
          ].map((tier) => (
            <button
              key={tier.label}
              type="button"
              onClick={() => setQty(tier.sampleQty)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                tier.active
                  ? 'border-[#065E46] bg-[#ECFDF5] text-[#065E46]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-mono text-xs font-bold">{tier.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{tier.sub}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor={`qty-${product.productId}`} className="text-sm font-semibold text-slate-800">
              Kuantitas Pesanan (pcs)
            </label>
            <p className="text-xs text-slate-500">
              Harga dasar mengikuti tabel tier otomatis untuk jumlah ini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 5))}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-[#F8FAF9] flex items-center justify-center hover:bg-slate-200"
              aria-label="Kurangi 5"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              id={`qty-${product.productId}`}
              type="number"
              min={1}
              max={50000}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 h-10 text-center font-mono font-bold text-base rounded-lg border border-slate-300 focus:outline-none focus:border-[#065E46] tabular-nums"
            />
            <button
              type="button"
              onClick={() => setQty((q) => q + 5)}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-[#F8FAF9] flex items-center justify-center hover:bg-slate-200"
              aria-label="Tambah 5"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {quote.nextTierTip && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ECFDF5] border border-[#10B981]/50 text-xs text-[#071A12]">
            <Info className="w-4 h-4 text-[#065E46] shrink-0 mt-0.5" />
            <span>
              Pesan minimal{' '}
              <strong className="font-mono">{quote.nextTierTip.targetQty} pcs</strong> untuk harga
              dasar lebih hemat{' '}
              <strong className="font-mono">
                {formatRupiah(quote.nextTierTip.newUnitBasePrice)}/pcs
              </strong>{' '}
              (hemat {formatRupiah(quote.nextTierTip.savingsPerPcs)}/pcs).
            </span>
          </div>
        )}
      </section>

      {/* Step 2: Dynamic Specifications */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-5">
        <h3 className="font-display font-bold text-base text-slate-900">
          2. Spesifikasi Dasar Produk
        </h3>

        {product.options.map((opt) => {
          const val = specs[opt.key] || '';

          if (opt.type === 'swatch') {
            return (
              <div key={opt.optionId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">{opt.label}</label>
                  <span className="text-xs font-semibold text-[#065E46]">{val}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {opt.values.map((colorName) => {
                    const colorDef = K13_COLORS.find(
                      (c) => c.name.toLowerCase() === colorName.toLowerCase()
                    );
                    const selected = val === colorName;
                    return (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => handleSpecChange(opt.key, colorName)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-colors ${
                          selected
                            ? 'border-[#065E46] bg-[#ECFDF5]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center"
                          style={{ backgroundColor: colorDef?.hex || '#64748B' }}
                        >
                          {selected && (
                            <Check
                              className={`w-3.5 h-3.5 ${
                                colorName === 'Putih' ? 'text-slate-900' : 'text-white'
                              }`}
                            />
                          )}
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 leading-tight">
                          {colorName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (opt.type === 'radio') {
            return (
              <div key={opt.optionId} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">{opt.label}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {opt.values.map((choice) => {
                    const selected = val === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleSpecChange(opt.key, choice)}
                        className={`px-3.5 py-2.5 rounded-lg border text-sm font-medium text-left flex items-center justify-between transition-colors ${
                          selected
                            ? 'border-[#065E46] bg-[#065E46] text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>{choice}</span>
                        {selected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {opt.helpText && <p className="text-xs text-slate-500">{opt.helpText}</p>}
              </div>
            );
          }

          if (opt.type === 'select') {
            return (
              <div key={opt.optionId} className="space-y-2">
                <label htmlFor={`opt-${opt.optionId}`} className="block text-sm font-semibold text-slate-800">
                  {opt.label}
                </label>
                <select
                  id={`opt-${opt.optionId}`}
                  value={val}
                  onChange={(e) => handleSpecChange(opt.key, e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:border-[#065E46]"
                >
                  {opt.values.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (opt.type === 'text') {
            return (
              <div key={opt.optionId} className="space-y-1.5">
                <label htmlFor={`opt-${opt.optionId}`} className="block text-sm font-semibold text-slate-800">
                  {opt.label}
                </label>
                <input
                  id={`opt-${opt.optionId}`}
                  type="text"
                  value={val}
                  onChange={(e) => handleSpecChange(opt.key, e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Bandung"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
            );
          }

          if (opt.type === 'textarea') {
            return (
              <div key={opt.optionId} className="space-y-1.5">
                <label htmlFor={`opt-${opt.optionId}`} className="block text-sm font-semibold text-slate-800">
                  {opt.label}
                </label>
                <textarea
                  id={`opt-${opt.optionId}`}
                  rows={2}
                  value={val}
                  onChange={(e) => handleSpecChange(opt.key, e.target.value)}
                  placeholder="Alamat institusi yang ingin dicetak pada cover (opsional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
            );
          }

          if (opt.type === 'file') {
            return (
              <div key={opt.optionId} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">{opt.label}</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-slate-300 bg-[#F8FAF9] hover:border-[#065E46] text-xs font-semibold text-slate-700">
                    <Upload className="w-4 h-4 text-[#065E46]" />
                    <span>{logoFileName ? `File: ${logoFileName}` : 'Pilih File Logo (JPG/PNG)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="sr-only"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  {logoPreviewDataUrl && (
                    <img
                      src={logoPreviewDataUrl}
                      alt="Pratinjau logo"
                      className="w-10 h-10 rounded border border-slate-200 object-contain bg-white"
                    />
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}
      </section>

      {/* Step 3: Add-ons Horizontal Scrolling Carousel */}
      {applicableAddons.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Tambahkan Detail Custom Map Kamu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Geser ke kanan/kiri untuk memilih add-on. Biaya dihitung per pcs map yang dipesan.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollCarousel(carouselId, -1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-[#F8FAF9]"
                aria-label="Geser add-ons ke kiri"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(carouselId, 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-[#F8FAF9]"
                aria-label="Geser add-ons ke kanan"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            id={carouselId}
            className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar"
          >
            {applicableAddons.map((addon) => {
              const selectedEntry = selectedAddons.find((s) => s.addonId === addon.addonId);
              const isSelected = Boolean(selectedEntry);
              return (
                <div
                  key={addon.addonId}
                  className={`snap-start shrink-0 w-64 rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'border-[#065E46] bg-[#ECFDF5]/60'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="h-32 rounded-lg overflow-hidden bg-white border border-slate-200 mb-3">
                      <SafeImage
                        fileId={addon.imageFileId}
                        alt={addon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display font-bold text-sm text-[#071A12]">
                        {addon.name}
                      </h4>
                      <span className="font-mono text-xs font-bold text-[#065E46] whitespace-nowrap tabular-nums">
                        +{formatRupiah(addon.pricePerPcs)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {addon.description}
                    </p>

                    {addon.requiresOption && addon.options && addon.options.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                          Pilih Model Sudut (1 set = 4 sudut):
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {addon.options
                            .filter((o) => o.active)
                            .map((opt) => {
                              const optActive =
                                (selectedEntry?.selectedOption || addon.options![0].name) ===
                                  opt.name && isSelected;
                              return (
                                <button
                                  key={opt.optionId}
                                  type="button"
                                  onClick={() => setAddonOption(addon.addonId, opt.name)}
                                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition-colors ${
                                    optActive
                                      ? 'bg-[#065E46] text-white border-[#065E46]'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {opt.name}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAddon(addon)}
                    className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#065E46] text-white border-[#065E46]'
                        : 'bg-white text-[#065E46] border-[#065E46] hover:bg-[#ECFDF5]'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Terpilih (+{formatRupiah(addon.pricePerPcs * qty)})</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambahkan</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Optional AI Custom Specification Consultant (Hidden in compact POS mode unless opened) */}
      {!compactMode && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#059669]" />
              <h3 className="font-display font-bold text-sm text-[#071A12]">
                Kalkulator Konsultasi Spesifikasi Custom (AI)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              className="text-xs font-semibold text-[#065E46] hover:underline"
            >
              {aiOpen ? 'Tutup Konsultan AI' : 'Tanya Rekomendasi Spesifikasi & Anggaran'}
            </button>
          </div>

          {aiOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ceritakan kebutuhan map/cetak sekolah Anda
                  </label>
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Contoh: Kami butuh 95 map rapor SMP dengan siku & busa, budget maksimal 35rb/pcs"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Anggaran/pcs (Opsional)
                  </label>
                  <input
                    type="number"
                    value={aiBudget}
                    onChange={(e) => setAiBudget(e.target.value)}
                    placeholder="35000"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={aiLoading || !aiQuestion.trim()}
                onClick={handleAskAi}
                className="px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Menganalisis spesifikasi...' : 'Analisis Kebutuhan Custom'}</span>
              </button>

              {aiError && <p className="text-xs text-red-600">{aiError}</p>}

              {aiResult && (
                <div className="p-4 rounded-lg bg-[#F8FAF9] border border-slate-200 space-y-2.5 text-xs text-slate-800">
                  <p className="font-semibold text-sm text-[#065E46]">{aiResult.summary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Produk Disarankan:</span>{' '}
                      <strong>{aiResult.recommendedProduct}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Isi Lembar:</span>{' '}
                      <strong>{aiResult.recommendedSheetCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimasi Harga/pcs:</span>{' '}
                      <strong className="font-mono">{aiResult.estimatedUnitRange}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimasi Produksi:</span>{' '}
                      <strong>{aiResult.estimatedProductionDays}</strong>
                    </div>
                  </div>
                  {aiResult.recommendedAddons.length > 0 && (
                    <div>
                      <span className="text-slate-500">Add-ons Optimal:</span>{' '}
                      <strong>{aiResult.recommendedAddons.join(', ')}</strong>
                    </div>
                  )}
                  <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-700">
                    <strong>Tips Efisiensi Volume:</strong> {aiResult.volumeOptimizationTip}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Live Price Summary & Submit */}
      <section className="bg-white rounded-xl border border-[#065E46]/30 p-4 sm:p-5 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>
              Harga Dasar ({qty} pcs × {formatRupiah(quote.unitBasePrice)})
            </span>
            <span className="font-mono font-semibold text-[#071A12] tabular-nums">
              {formatRupiah(quote.lineBaseSubtotal)}
            </span>
          </div>

          {quote.addonBreakdown.map((ab) => (
            <div key={ab.addonId} className="flex justify-between text-slate-600 text-xs">
              <span>
                Add-on {ab.name}
                {ab.selectedOption ? ` (${ab.selectedOption})` : ''} · {qty} ×{' '}
                {formatRupiah(ab.pricePerPcs)}
              </span>
              <span className="font-mono font-semibold text-[#059669] tabular-nums">
                +{formatRupiah(ab.subtotal)}
              </span>
            </div>
          ))}

          <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
            <div>
              <div className="text-xs text-slate-500">Total Item Ini</div>
              <div className="font-mono text-xs text-slate-600 tabular-nums">
                {formatRupiah(quote.unitTotalPrice)} / pcs
              </div>
            </div>
            <div className="font-mono text-2xl font-bold text-[#065E46] tabular-nums">
              {formatRupiah(quote.lineTotal)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onSubmit({
              productId: product.productId,
              qty,
              specifications: specs,
              addons: selectedAddons,
              logoFileName,
              logoPreviewDataUrl,
            })
          }
          className="yeg-cta-loop w-full py-3.5 px-5 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm sm:text-base hover:bg-[#054735] transition-colors cursor-pointer"
        >
          {submitLabel}
        </button>
      </section>
    </div>
  );
}
