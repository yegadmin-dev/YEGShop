import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  Edit3,
  QrCode,
  Search,
  Upload,
} from 'lucide-react';
import { CashierLayout } from '../components/CashierLayout.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { CashierOrderLookupResult, OrderWaitingRecord } from '../shared/types.ts';
import {
  decodeBarcodeFromCanvas,
  decodeBarcodeFromImageFile,
  extractOrderIdFromBarcode,
} from '../utils/barcodeScanner.ts';

export function CashierScanPage() {
  const navigate = useNavigate();
  const { notify } = useStore();
  const { loadOrderIntoCashier } = useCashier();

  const [manualCode, setManualCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [lookupResult, setLookupResult] = useState<CashierOrderLookupResult | null>(null);

  const [waitingOrders, setWaitingOrders] = useState<OrderWaitingRecord[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);

  // Image upload barcode decoding state
  const [decodingImage, setDecodingImage] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState('');

  // Live camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const fetchWaitingOrders = useCallback(async () => {
    setLoadingWaiting(true);
    try {
      const res = await yegApi.getCashierWaitingOrders();
      setWaitingOrders(res.items);
    } catch {
      setWaitingOrders([]);
    } finally {
      setLoadingWaiting(false);
    }
  }, []);

  useEffect(() => {
    void fetchWaitingOrders();
  }, [fetchWaitingOrders]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const performLookup = useCallback(
    async (rawCode: string) => {
      const clean = rawCode.trim();
      if (!clean) {
        setLookupError('Masukkan kode barcode atau Order ID terlebih dahulu.');
        return;
      }
      setLookingUp(true);
      setLookupError('');
      setLastScannedCode(clean);
      try {
        const res = await yegApi.lookupCashierBarcode(clean);
        if (!res.result) {
          setLookupResult(null);
          setLookupError(`Pesanan untuk kode "${extractOrderIdFromBarcode(clean) || clean}" tidak ditemukan.`);
        } else {
          setLookupResult(res.result);
          notify(
            `Pesanan ${res.result.orderId} (${res.result.customerName}) ditemukan.`,
            'success'
          );
        }
      } catch (err) {
        setLookupResult(null);
        setLookupError(err instanceof Error ? err.message : 'Gagal memeriksa kode pesanan.');
      } finally {
        setLookingUp(false);
      }
    },
    [notify]
  );

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser atau izin perangkat tidak mendukung akses kamera langsung. Gunakan Upload Foto Barcode JPG.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);

      // Attach video stream once element renders
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 60);

      scanIntervalRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const detected = await decodeBarcodeFromCanvas(canvas);
        if (detected) {
          stopCamera();
          const extracted = extractOrderIdFromBarcode(detected);
          setManualCode(extracted || detected);
          void performLookup(detected);
        }
      }, 180);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `Kamera gagal dibuka: ${err.message}. Silakan unggah foto barcode JPG.`
          : 'Akses kamera ditolak. Silakan unggah foto barcode JPG.'
      );
      stopCamera();
    }
  };

  const handleUploadBarcodeImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLookupError('');
    setDecodingImage(true);
    try {
      const decoded = await decodeBarcodeFromImageFile(file);
      setUploadedPreviewUrl(decoded.previewUrl);
      if (!decoded.rawValue) {
        setLookupError(
          'Barcode tidak terbaca pada foto ini. Pastikan area QR barcode pada struk JPG terlihat utuh atau ketik Order ID secara manual.'
        );
        return;
      }
      const cleanId = decoded.orderId || decoded.rawValue;
      setManualCode(cleanId);
      await performLookup(decoded.rawValue);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Gagal membaca foto barcode.');
    } finally {
      setDecodingImage(false);
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    void performLookup(manualCode);
  };

  const handleLoadIntoPos = (target: CashierOrderLookupResult) => {
    const count = loadOrderIntoCashier({
      orderId: target.orderId,
      customerName: target.customerName,
      whatsapp: target.whatsapp,
      institution: target.institution,
      deadline: target.deadline,
      customerNotes: target.customerNotes,
      adminNotes: target.adminNotes,
      items: target.items,
    });
    notify(
      `${count} item pesanan #${target.orderId} (${target.customerName}) dimuat ke Terminal Kasir.`,
      'success'
    );
    navigate('/kasir');
  };

  return (
    <CashierLayout
      title="Scan & Import Barcode Pesanan"
      subtitle="Pindai kamera atau unggah foto struk barcode pelanggan agar kasir tidak perlu input ulang"
    >
      <div className="space-y-6">
        {/* Top Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] border border-[#10B981]/40 text-[#065E46] flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg sm:text-xl text-[#071A12]">
                Scan / Upload Barcode Struk Pelanggan
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Arahkan kamera ke barcode atau unggah foto struk JPG dari WhatsApp pemesan untuk
                memuat identitas &amp; seluruh barang ke kasir agar siap diedit.
              </p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[320px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ketik Order ID (mis. YEG-2501)..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-[#F8FAF9] text-xs font-mono focus:outline-none focus:bg-white focus:border-[#065E46]"
              />
            </div>
            <button
              type="submit"
              disabled={lookingUp}
              className="h-10 px-4 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {lookingUp ? 'Mencari...' : 'Cari ID'}
            </button>
          </form>
        </div>

        {/* Scanner Methods Grid: Camera + Photo Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Camera + Upload Photo */}
          <div className="lg:col-span-5 space-y-5">
            {/* Method 1: Camera Scan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display font-bold text-sm text-[#071A12]">
                    1. Scan Kamera Barcode
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Deteksi otomatis barcode pada layar HP atau struk cetak
                  </p>
                </div>
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735] cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Aktifkan Kamera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer whitespace-nowrap"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Tutup Kamera</span>
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {cameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-[#06150E] aspect-[4/3] border border-slate-200">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-[#10B981] rounded-2xl shadow-[0_0_0_9999px_rgba(6,21,14,0.35)]" />
                  </div>
                  <div className="absolute bottom-2.5 inset-x-0 text-center text-[11px] font-semibold text-white">
                    Arahkan barcode QR struk YEGShop ke dalam kotak hijau
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAF9] py-8 px-4 text-center space-y-2">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600">
                    Tekan <strong>Aktifkan Kamera</strong> untuk memindai barcode pelanggan secara
                    langsung.
                  </p>
                </div>
              )}
            </div>

            {/* Method 2: Upload Barcode / Receipt JPG Photo */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <h2 className="font-display font-bold text-sm text-[#071A12]">
                  2. Upload Foto Barcode / Struk JPG
                </h2>
                <p className="text-[11px] text-slate-500">
                  Unggah langsung file Struk-YEGShop-*.jpg atau tangkapan layar barcode dari WhatsApp
                </p>
              </div>

              <label className="cursor-pointer block rounded-xl border border-dashed border-[#065E46]/50 bg-[#ECFDF5]/60 hover:bg-[#ECFDF5] p-5 text-center space-y-2 transition-colors">
                <Upload className="w-7 h-7 text-[#065E46] mx-auto" />
                <div className="text-xs font-bold text-[#065E46]">
                  {decodingImage
                    ? 'Membaca Barcode pada Gambar...'
                    : 'Pilih Foto Barcode / Struk JPG dari Perangkat'}
                </div>
                <div className="text-[11px] text-slate-600">Mendukung JPG, PNG, atau WebP</div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={decodingImage}
                  onChange={(e) => void handleUploadBarcodeImage(e)}
                  className="sr-only"
                />
              </label>

              {uploadedPreviewUrl && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF9] border border-slate-200">
                  <img
                    src={uploadedPreviewUrl}
                    alt="Pratinjau foto barcode terunggah"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                  />
                  <div className="min-w-0 text-xs">
                    <div className="font-semibold text-[#071A12]">Gambar Struk Terunggah</div>
                    <div className="font-mono text-[11px] text-[#059669] truncate">
                      {lastScannedCode
                        ? `Terbaca: ${extractOrderIdFromBarcode(lastScannedCode)}`
                        : 'Memeriksa kode barcode...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Lookup Result Preview OR Recent Waiting Orders */}
          <div className="lg:col-span-7 space-y-5">
            {lookupError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            {lookupResult ? (
              <div className="bg-white rounded-2xl border-2 border-[#065E46] p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#059669] font-mono font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lookupResult.orderId}</span>
                      <span aria-hidden="true">·</span>
                      <span>Antrean {lookupResult.queueNumber}</span>
                    </div>
                    <h2 className="font-display font-bold text-xl text-[#071A12] mt-1">
                      {lookupResult.customerName}
                    </h2>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {lookupResult.institution || 'Umum / Pribadi'} ·{' '}
                      <span className="font-mono">{lookupResult.whatsapp || '-'}</span>
                    </div>
                    {lookupResult.address && (
                      <div className="text-xs text-slate-500 mt-0.5">{lookupResult.address}</div>
                    )}
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-0.5">
                    <div className="font-bold text-amber-700">{lookupResult.orderStatus}</div>
                    <div className="font-mono text-slate-600">
                      Deadline: {formatDateShort(lookupResult.deadline)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Masuk: {formatDateTimeId(lookupResult.timestamp)}
                    </div>
                  </div>
                </div>

                {lookupResult.linkedCashierOrderId && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Catatan: Pesanan ini pernah diproses lewat Kasir POS{' '}
                    <strong className="font-mono">{lookupResult.linkedCashierOrderId}</strong>. Anda
                    tetap dapat memuat ulang barangnya untuk penyesuaian baru.
                  </div>
                )}

                {lookupResult.customerNotes && (
                  <div className="p-3 rounded-xl bg-[#F8FAF9] border border-slate-200 text-xs text-slate-700">
                    <span className="font-semibold text-[#071A12]">Catatan Pemesan:</span>{' '}
                    {lookupResult.customerNotes}
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="font-display font-bold text-sm text-[#071A12]">
                    Barang yang Dipesan ({lookupResult.items.length} jenis)
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-[#F8FAF9]">
                    {lookupResult.items.map((item) => (
                      <div key={item.itemId} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-[#071A12]">
                            {item.productName}{' '}
                            <span className="font-mono text-[#065E46]">({item.qty} pcs)</span>
                          </div>
                          {Object.entries(item.specifications || {}).filter(([, v]) => v).length > 0 && (
                            <div className="text-[11px] text-slate-600">
                              {Object.entries(item.specifications || {})
                                .filter(([, v]) => v)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')}
                            </div>
                          )}
                          {item.addons.length > 0 && (
                            <div className="text-[11px] text-[#059669]">
                              Add-on:{' '}
                              {item.addons
                                .map((a) =>
                                  a.selectedOption ? `${a.name} (${a.selectedOption})` : a.name
                                )
                                .join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="font-mono font-bold text-[#071A12] tabular-nums shrink-0">
                          {formatRupiah(item.lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500">Total Estimasi Awal</div>
                    <div className="font-mono font-bold text-xl text-[#065E46] tabular-nums">
                      {formatRupiah(lookupResult.totalTransaction)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadIntoPos(lookupResult)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#065E46] text-white text-sm font-bold hover:bg-[#054735] cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Muat ke Kasir POS (Edit &amp; Proses)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2">
                <QrCode className="w-9 h-9 text-[#065E46] mx-auto" />
                <h2 className="font-display font-bold text-base text-[#071A12]">
                  Siap Memindai Struk Pelanggan
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Scan barcode kamera, unggah foto struk JPG dari WhatsApp, atau pilih langsung dari
                  daftar antrean Order Waiting di bawah ini.
                </p>
              </div>
            )}

            {/* Quick Waiting Orders List so Kasir can also pick waiting orders directly */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-[#F8FAF9]">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#065E46]" />
                  <h2 className="font-display font-bold text-sm text-[#071A12]">
                    Daftar Order Waiting Terbaru
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {waitingOrders.length} pesanan
                </span>
              </div>

              {loadingWaiting ? (
                <div className="p-5 space-y-2.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-[#F8FAF9] animate-pulse" />
                  ))}
                </div>
              ) : waitingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Belum ada pesanan publik pada daftar tunggu.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {waitingOrders.slice(0, 15).map((ord) => (
                    <div
                      key={ord.orderId}
                      className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#F8FAF9]/80 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-[#065E46]">{ord.orderId}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600">{ord.queueNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-sans font-semibold ${
                              ord.linkedCashierOrderId ? 'text-[#059669]' : 'text-amber-700'
                            }`}
                          >
                            {ord.linkedCashierOrderId
                              ? `Diproses (${ord.linkedCashierOrderId})`
                              : ord.orderStatus}
                          </span>
                        </div>
                        <div className="font-semibold text-[#071A12]">
                          {ord.customerName}{' '}
                          <span className="font-normal text-slate-500">
                            · {ord.institution || 'Umum'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(ord.items || [])
                            .map((i) => `${i.productName} (${i.qty} pcs)`)
                            .join(', ') || '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="font-mono font-bold text-[#071A12] tabular-nums">
                          {formatRupiah(ord.totalTransaction)}
                        </div>
                        <button
                          type="button"
                          onClick={() => void performLookup(ord.orderId)}
                          className="px-3.5 py-2 rounded-xl border border-[#065E46] text-[#065E46] font-bold hover:bg-[#065E46] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Muat Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CashierLayout>
  );
}
