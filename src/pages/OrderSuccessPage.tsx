import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { CheckCircle2, Download, ExternalLink, QrCode } from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsAppUrl, formatDateShort, formatRupiah } from '../shared/pricing.ts';
import { encodeOrderBarcodeValue } from '../utils/barcodeScanner.ts';
import { downloadReceiptJpg } from '../utils/receiptGenerator.ts';

export function OrderSuccessPage() {
  const { settings, lastOrderTicket, setLastOrderTicket, notify } = useStore();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  const orderId = lastOrderTicket?.order.orderId || '';
  const barcodeValue = useMemo(
    () => (orderId ? encodeOrderBarcodeValue(orderId) : ''),
    [orderId]
  );

  useEffect(() => {
    if (!barcodeValue) return;
    let active = true;
    QRCode.toDataURL(barcodeValue, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#06150E', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [barcodeValue]);

  if (!lastOrderTicket) {
    return <Navigate to="/status" replace />;
  }

  const { order, items } = lastOrderTicket;
  const itemsText = items
    .map((i, idx) => `${idx + 1}. ${i.productName} (${i.qty} pcs) - ${formatRupiah(i.lineTotal)}`)
    .join('\n');

  const waUrl = buildWhatsAppUrl(
    settings?.adminWhatsapp || '6289674849505',
    `Halo Admin YEG Production, saya mengajukan pesanan baru di YEGShop (Order Waiting).\n\nOrder ID: ${order.orderId}\nAntrean: ${order.queueNumber}\nPemesan: ${order.customerName}\nInstansi: ${order.institution || 'Umum'}\nTarget Deadline: ${formatDateShort(order.deadline)}\n\nRincian Barang:\n${itemsText}\n\nTotal Estimasi: ${formatRupiah(order.totalTransaction)}\n${order.customerNotes ? `Catatan: ${order.customerNotes}\n` : ''}\nBerikut saya lampirkan file gambar Struk Barcode (${order.orderId}.jpg) untuk dikonfirmasi dan diproses di Kasir. Terima kasih.`
  );

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      const ok = await downloadReceiptJpg({
        orderId: order.orderId,
        queueNumber: order.queueNumber,
        sourceLabel: settings?.demoMode ? 'ORDER WAITING (DEMO)' : 'ORDER WAITING',
        timestamp: order.timestamp,
        deadline: order.deadline,
        customerName: order.customerName,
        whatsapp: order.whatsapp,
        institution: order.institution,
        items,
        subtotal: order.subtotal,
        totalAddons: order.totalAddons,
        totalTransaction: order.totalTransaction,
        paidAmount: order.dpAmount,
        remainingAmount: order.remainingAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      });
      if (ok) {
        notify(`Struk barcode Struk-YEGShop-${order.orderId}.jpg berhasil diunduh.`, 'success');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {settings?.demoMode && (
          <div className="p-3.5 rounded-2xl bg-[#EFF8FF] border border-[#0284C7]/40 text-xs text-[#071A12] font-medium">
            Mode Demo Aktif: Pesanan tersimpan pada penyimpanan simulasi lokal untuk pengujian alur
            Order Waiting &amp; Scan Barcode Kasir.
          </div>
        )}

        <RevealBlock className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#059669] shrink-0 mt-0.5" />
            <div>
              <h1 className="font-display font-bold text-2xl text-[#071A12]">
                Pesanan Masuk Antrean (Order Waiting)
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Unduh struk barcode JPG di bawah ini, lalu kirimkan ke WhatsApp Admin YEG Production
                untuk konfirmasi dan pemrosesan cepat di Kasir.
              </p>
            </div>
          </div>

          {/* Live Scannable Barcode & Order Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 sm:p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 items-center">
            <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-3 text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Barcode ${barcodeValue}`}
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                  <QrCode className="w-10 h-10" />
                </div>
              )}
              <div className="font-mono font-bold text-[11px] text-[#065E46] mt-1">
                {barcodeValue}
              </div>
              <div className="text-[10px] text-slate-500">Scan / Upload di Kasir YEGShop</div>
            </div>

            <div className="sm:col-span-8 grid grid-cols-2 gap-3.5">
              <div>
                <div className="text-[11px] text-slate-500">Order ID</div>
                <div className="font-mono font-bold text-lg text-[#065E46]">{order.orderId}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Nomor Antrean</div>
                <div className="font-mono font-bold text-lg text-[#071A12]">
                  {order.queueNumber}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Target Deadline</div>
                <div className="font-mono font-semibold text-sm text-[#071A12]">
                  {formatDateShort(order.deadline)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Status Saat Ini</div>
                <div className="text-xs font-bold text-amber-700">{order.orderStatus}</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-600">Total Estimasi ({items.length} produk)</span>
                <span className="font-mono font-bold text-lg text-[#065E46] tabular-nums">
                  {formatRupiah(order.totalTransaction)}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Quick Recap */}
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
            <div className="font-display font-bold text-sm text-[#071A12]">
              Daftar Barang Dipesan
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.itemId} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[#071A12]">{item.productName}</span>{' '}
                    <span className="font-mono text-slate-500">({item.qty} pcs)</span>
                  </div>
                  <div className="font-mono font-bold text-[#071A12] tabular-nums">
                    {formatRupiah(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadReceipt()}
              className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#065E46] text-white text-sm font-bold hover:bg-[#054735] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Menyiapkan Struk...' : '1. Unduh Struk Barcode (JPG)'}</span>
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#15803D] text-white text-sm font-bold hover:bg-[#166534] whitespace-nowrap"
            >
              <span>2. Konfirmasi &amp; Kirim ke WA Admin</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              to={`/status?q=${encodeURIComponent(order.orderId)}`}
              className="yeg-hover-lift inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0284C7] text-white text-sm font-semibold hover:bg-[#0369A1] whitespace-nowrap"
            >
              <span>Lacak Pesanan Ini</span>
            </Link>
            <Link
              to="/catalog"
              onClick={() => setLastOrderTicket(null)}
              className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-[#071A12] whitespace-nowrap"
            >
              Buat Pesanan Baru
            </Link>
          </div>
        </RevealBlock>
      </div>
    </PublicLayout>
  );
}
