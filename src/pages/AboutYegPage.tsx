import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Factory,
  Layers,
  MapPin,
  MessageCircle,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsAppUrl } from '../shared/pricing.ts';

export function AboutYegPage() {
  const { settings } = useStore();
  const adminWa = settings?.adminWhatsapp || '6289674849505';
  const waUrl = buildWhatsAppUrl(
    adminWa,
    'BC - Halo Admin YEG Production, saya ingin berkonsultasi mengenai kebutuhan produk sekolah / instansi.'
  );

  return (
    <PublicLayout>
      <div className="bg-white">
        {/* Top Brand Intro Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <RevealBlock direction="left" className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 text-xs font-bold text-[#065E46]">
                <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                <span>YEG PRODUCTION · CREATIVE PRODUCTION</span>
              </div>
              <h1
                className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#06150E] tracking-tight leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                Your Expression,{' '}
                <span className="text-[#059669]">Our Creation.</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                YEG Production adalah rumah produksi kreatif yang mengubah gagasan sekolah,
                instansi, dan organisasi menjadi produk bernilai guna serta bernilai ekonomi nyata.
                Melalui YEGShop, kami menghubungkan alur komprehensif mulai dari{' '}
                <strong className="text-[#06150E]">
                  Ide → Desain Visual → Produksi Workshop → Produk Jadi
                </strong>{' '}
                dengan estimasi harga transparan.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/catalog"
                  className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#065E46] hover:bg-[#054735] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
                >
                  <span>Jelajahi Semua Kategori</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/status"
                  className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Cek Pemesanan</span>
                </Link>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="yeg-hover-lift inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WA Admin</span>
                </a>
              </div>
            </RevealBlock>

            <RevealBlock direction="right" delayMs={80} className="lg:col-span-5">
              <div className="rounded-3xl bg-[#06150E] text-white p-5 sm:p-6 space-y-5 shadow-lg">
                <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-white/15 bg-white">
                  <SafeImage
                    fileId="hero-workshop"
                    alt="Workshop Produksi YEG Production"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <div>
                    <div className="font-display font-extrabold text-xl tracking-tight text-white">
                      yeg<sup className="text-xs text-[#10B981] ml-0.5">TM</sup>
                    </div>
                    <div className="text-[11px] font-semibold tracking-widest text-[#10B981] uppercase">
                      YEG BRANDMARK
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>order.yegproduction.web.id</div>
                    <div className="text-[#10B981] font-semibold tabular-nums">
                      0896-7484-9505
                    </div>
                  </div>
                </div>
              </div>
            </RevealBlock>
          </div>
        </section>

        {/* 4 Core Pillars */}
        <section className="border-t border-slate-200 bg-white py-10 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <RevealBlock>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#06150E]">
                Standar Produksi YEG Production
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Keunggulan pengerjaan map rapor K-13, map full-colour, percetakan offset, dan
                merchandise instansi.
              </p>
            </RevealBlock>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <RevealBlock delayMs={40}>
                <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#ECFDF5] border border-emerald-100 space-y-2">
                  <Palette className="w-5 h-5 text-[#065E46]" />
                  <h3 className="font-display font-bold text-base text-[#06150E]">
                    13 Pilihan Warna ASE
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Pilihan kulit sampul bahan ASE resmi mulai dari hijau tua, biru dongker, merah
                    marun, hingga krem dengan hotprint emas/perak presisi.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock delayMs={90}>
                <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#EFF8FF] border border-sky-100 space-y-2">
                  <Layers className="w-5 h-5 text-[#0284C7]" />
                  <h3 className="font-display font-bold text-base text-[#06150E]">
                    3 Tier Harga Transparan
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Kalkulasi otomatis untuk pesanan 1–49 pcs, 50–100 pcs standar sekolah, serta
                    101+ pcs harga grosir terbaik.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock delayMs={140}>
                <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-2">
                  <Factory className="w-5 h-5 text-[#15803D]" />
                  <h3 className="font-display font-bold text-base text-[#06150E]">
                    5 Tahap Quality Control
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Setiap pesanan melewati tahapan Antrean Masuk, Potong Bahan, Hotprint Emboss,
                    Rakit &amp; Jahit Siku, hingga QC &amp; Siap Kirim.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock delayMs={190}>
                <div className="yeg-hover-lift h-full p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 space-y-2">
                  <ShieldCheck className="w-5 h-5 text-[#065E46]" />
                  <h3 className="font-display font-bold text-base text-[#06150E]">
                    Pembayaran &amp; Struk Resmi
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Mendukung DP minimal {settings?.minDpPercent || 50}% atau Lunas via SeaBank &amp;
                    QRIS resmi, lengkap dengan struk antrean JPG.
                  </p>
                </div>
              </RevealBlock>
            </div>
          </div>
        </section>

        {/* Workshop Info & Official Payment */}
        <section className="border-t border-slate-200 bg-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevealBlock delayMs={40}>
              <div className="yeg-hover-lift h-full p-6 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#059669] uppercase tracking-wide">
                <MapPin className="w-4 h-4" />
                <span>Informasi Workshop &amp; Operasional</span>
              </div>
              <h3 className="font-display font-bold text-lg text-[#06150E]">
                Workshop YEG Production
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {settings?.workshopAddress ||
                  'Workshop YEG Production · Layanan Pesanan Instansi & Sekolah Seluruh Indonesia'}
              </p>
              <div className="text-xs text-slate-600 pt-1">
                Jam Layanan:{' '}
                <strong className="text-[#06150E]">
                  {settings?.operatingHours || 'Senin – Sabtu, 08:00 – 17:00 WIB'}
                </strong>
              </div>
              </div>
            </RevealBlock>

            <RevealBlock delayMs={90}>
              <div className="yeg-hover-lift h-full p-6 rounded-2xl border border-slate-200 bg-[#F8FAF9] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#065E46] uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Rekening Pembayaran Resmi</span>
                </div>
                <h3 className="font-display font-bold text-lg text-[#06150E]">
                  SeaBank &amp; QRIS YEG Production
                </h3>
                <p className="text-sm text-slate-700">
                  Nomor Rekening SeaBank:{' '}
                  <span className="font-mono font-bold text-[#065E46] tabular-nums">
                    {settings?.seabankAccountNumber || '901705659816'}
                  </span>
                  <br />
                  a.n. {settings?.seabankAccountName || 'Mochamad Ridhwan Mubarok'}
                </p>
                <div className="text-xs text-slate-500">
                  Setiap pembayaran dapat dilacak langsung melalui menu Cek Pemesanan.
                </div>
              </div>
            </RevealBlock>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
