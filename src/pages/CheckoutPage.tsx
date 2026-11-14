import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ClipboardCheck,
  QrCode,
  ShoppingBag,
} from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegRepositories } from '../repositories/index.ts';
import {
  formatRupiah,
  getFutureIsoDate,
  getTodayIsoDate,
} from '../shared/pricing.ts';

const CHECKOUT_DRAFT_KEY = 'yegshop_checkout_draft_v2';

interface CheckoutDraft {
  customerName: string;
  whatsapp: string;
  institution: string;
  address: string;
  customerNotes: string;
  deadline: string;
}

function readCheckoutDraft(): Partial<CheckoutDraft> {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<CheckoutDraft>) : {};
  } catch {
    return {};
  }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const {
    cart,
    cartTotal,
    clearCart,
    lastOrderTicket,
    setLastOrderTicket,
    notify,
  } = useStore();

  const [initialDraft] = useState<Partial<CheckoutDraft>>(() => readCheckoutDraft());
  const [customerName, setCustomerName] = useState(initialDraft.customerName || '');
  const [whatsapp, setWhatsapp] = useState(initialDraft.whatsapp || '');
  const [institution, setInstitution] = useState(initialDraft.institution || '');
  const [address, setAddress] = useState(initialDraft.address || '');
  const [customerNotes, setCustomerNotes] = useState(initialDraft.customerNotes || '');
  const [deadline, setDeadline] = useState(initialDraft.deadline || getFutureIsoDate(7));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(
    () => `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  useEffect(() => {
    try {
      const payload: CheckoutDraft = {
        customerName,
        whatsapp,
        institution,
        address,
        customerNotes,
        deadline,
      };
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [customerName, whatsapp, institution, address, customerNotes, deadline]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Keranjang masih kosong.');
      return;
    }
    if (!customerName.trim() || !whatsapp.trim()) {
      setError('Nama lengkap dan nomor WhatsApp aktif wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await yegRepositories.orders.createPublicOrder({
        customerName: customerName.trim(),
        whatsapp: whatsapp.trim(),
        institution: institution.trim(),
        address: address.trim(),
        customerNotes: customerNotes.trim(),
        deadline,
        idempotencyKey,
        items: cart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          specifications: c.specifications,
          addons: c.addons,
          logoFileName: c.logoFileName,
          logoPreviewDataUrl: c.logoPreviewDataUrl,
        })),
      });

      setLastOrderTicket({ order: res.order, items: res.items });
      clearCart();
      try {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      } catch {
        // ignore
      }
      notify(`Pesanan ${res.order.orderId} masuk antrean konfirmasi admin.`, 'success');
      navigate('/order-success', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (lastOrderTicket && cart.length === 0) {
    return <Navigate to="/order-success" replace />;
  }

  if (cart.length === 0) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#065E46]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-2xl text-[#071A12]">
            Keranjang Belanja Kosong
          </h1>
          <p className="text-sm text-slate-600">
            Tambahkan produk ke keranjang terlebih dahulu sebelum mengirim pesanan.
          </p>
          <Link
            to="/catalog"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-sm font-semibold hover:bg-[#054735]"
          >
            Buka Katalog Produk
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RevealBlock className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
            Checkout &amp; Konfirmasi Pesanan
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Lengkapi identitas pemesan untuk masuk ke daftar tunggu konfirmasi admin. Tidak perlu
            pembayaran langsung di sini.
          </p>
        </RevealBlock>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer Identity & Waiting Order Flow Info */}
          <div className="lg:col-span-7 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <RevealBlock className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
              <h2 className="font-display font-bold text-base text-slate-900">
                1. Identitas Pemesan &amp; Target Jadwal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="chk-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Pemesan *
                  </label>
                  <input
                    id="chk-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Ibu Siti Aminah, S.Pd"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label htmlFor="chk-wa" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp Aktif *
                  </label>
                  <input
                    id="chk-wa"
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label htmlFor="chk-inst" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Sekolah / Instansi
                  </label>
                  <input
                    id="chk-inst"
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: SMP Negeri 4 Bandung"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
                <div>
                  <label htmlFor="chk-deadline" className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Tanggal Selesai (Deadline) *
                  </label>
                  <input
                    id="chk-deadline"
                    type="date"
                    required
                    min={getTodayIsoDate()}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="chk-addr" className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Pengiriman / Keterangan Pengambilan
                </label>
                <textarea
                  id="chk-addr"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap pengiriman atau keterangan ambil langsung di workshop..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>

              <div>
                <label htmlFor="chk-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan untuk Admin / Produksi (Opsional)
                </label>
                <textarea
                  id="chk-notes"
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Misal: warna foil emas, minta penyesuaian nama kelas, atau file desain menyusul via WA..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                />
              </div>
            </RevealBlock>

            {/* Clear Order Waiting Explanation Card */}
            <RevealBlock
              delayMs={60}
              className="bg-[#F8FAF9] rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#10B981]/40 text-[#065E46] flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-display font-bold text-base text-[#071A12]">
                    2. Alur Order Waiting &amp; Struk Barcode
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pesanan Anda langsung masuk ke antrean konfirmasi admin tanpa perlu transfer di
                    awal. Setelah menekan tombol kirim, Anda akan mendapatkan{' '}
                    <strong className="text-[#071A12]">Struk Barcode (JPG)</strong> untuk dikirim ke
                    WhatsApp Admin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="font-mono font-bold text-[#065E46]">01. Masuk Antrean</div>
                  <p className="text-slate-600 leading-snug">
                    Order tercatat di status <strong>Menunggu konfirmasi admin</strong>.
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="font-mono font-bold text-[#0284C7]">02. Unduh &amp; Kirim WA</div>
                  <p className="text-slate-600 leading-snug">
                    Unduh struk JPG ber-barcode lalu kirimkan ke WhatsApp Admin YEG.
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="font-mono font-bold text-[#15803D]">03. Scan &amp; Proses Kasir</div>
                  <p className="text-slate-600 leading-snug">
                    Admin/Kasir memindai barcode struk untuk penyesuaian &amp; pembayaran.
                  </p>
                </div>
              </div>
            </RevealBlock>
          </div>

          {/* Right Column: Sticky Order Summary */}
          <RevealBlock
            delayMs={90}
            className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 lg:sticky lg:top-24"
          >
            <h2 className="font-display font-bold text-lg text-[#071A12]">
              Ringkasan Pesanan ({cart.length} item)
            </h2>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.cartItemId} className="py-3 flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#071A12]">{item.productName}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {item.qty} pcs × {formatRupiah(item.unitTotalPrice)}
                    </div>
                    {Object.values(item.specifications || {}).filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {Object.values(item.specifications || {})
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-[#071A12] tabular-nums shrink-0">
                    {formatRupiah(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Estimasi Total Pesanan</span>
                <span className="font-mono font-bold text-lg text-[#065E46] tabular-nums">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Status Awal Pesanan</span>
                <span className="font-semibold text-amber-700">Menunggu konfirmasi admin</span>
              </div>
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Pembayaran</span>
                <span className="font-semibold text-[#071A12]">
                  Diatur saat konfirmasi admin / kasir
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="yeg-cta-loop w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{submitting ? 'Mengirim ke Antrean...' : 'Kirim Pesanan & Buat Struk Barcode'}</span>
            </button>
          </RevealBlock>
        </form>
      </div>
    </PublicLayout>
  );
}
