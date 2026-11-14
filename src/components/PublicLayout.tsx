import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  ExternalLink,
  Home,
  Info,
  LayoutGrid,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { ScrollProgressBar } from './MotionPrimitives.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsAppUrl, formatRupiah } from '../shared/pricing.ts';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { settings, cartCount, cartTotal } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waCtaVisible, setWaCtaVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0;
    setWaCtaVisible(true);

    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const prevY = lastScrollYRef.current;
      const delta = currentY - prevY;

      if (currentY <= 80) {
        setWaCtaVisible(true);
      } else if (delta > 8) {
        setWaCtaVisible(false);
      } else if (delta < -6) {
        setWaCtaVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
    setMobileMenuOpen(false);
  };

  const adminWa = settings?.adminWhatsapp || '6289674849505';
  const waConsultationUrl = buildWhatsAppUrl(
    adminWa,
    'BC - Halo Admin YEG Production, saya ingin berkonsultasi mengenai produk di YEGShop.'
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#071A12] pb-24 lg:pb-0">
      {/* Top Info Bar (Desktop & Tablet) */}
      <div className="hidden sm:block bg-[#06150E] text-white text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">
            YEGShop by YEG Production · Spesialis Map Rapor, Ijazah, Percetakan &amp; Custom
            {settings?.demoMode && (
              <span className="ml-2 text-[#10B981] font-semibold">
                [MODE DEMO]
              </span>
            )}
          </span>
          <div className="flex items-center gap-4">
            <a
              href={settings?.profileUrl || 'https://profile.yegproduction.web.id'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#10B981] transition-colors whitespace-nowrap"
            >
              <span>Profil Perusahaan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="hidden md:inline text-[#10B981] font-semibold tabular-nums">
              WA: 0896-7484-9505
            </span>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center rounded-xl text-[#071A12] hover:bg-slate-100 cursor-pointer"
              aria-label="Menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#06150E] text-[#10B981] font-display font-extrabold text-lg flex items-center justify-center">
                Y
              </div>
              <div className="leading-tight">
                <div className="font-display font-bold text-base sm:text-lg text-[#06150E] tracking-tight">
                  YEGShop
                </div>
                <div className="text-[11px] font-semibold text-[#059669]">
                  by YEG Production
                </div>
              </div>
            </Link>
          </div>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari map K-13, full-colour, sertifikat, atau lanyard..."
                className="w-full h-10 pl-9 pr-20 rounded-xl border border-slate-200 bg-[#F8FAF9] text-sm focus:outline-none focus:bg-white focus:border-[#065E46] transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] transition-colors cursor-pointer"
              >
                Cari
              </button>
            </div>
          </form>

          {/* Header Actions — Strictly Public: Cek Status Pemesanan & Keranjang */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/status"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Cek Status Pemesanan</span>
            </Link>

            <Link
              to="/cart"
              className="inline-flex items-center gap-2.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#065E46] text-white hover:bg-[#054735] transition-all hover:-translate-y-0.5 shrink-0"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#10B981] text-[#06150E] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-[10px] text-emerald-100">Keranjang</span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop Navigation Bar — Beranda, Semua Kategori, Cek Pemesanan, About YEG */}
        <div className="hidden lg:block border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-7 overflow-x-auto no-scrollbar h-11 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `whitespace-nowrap py-2.5 border-b-2 transition-colors font-medium shrink-0 ${
                  isActive
                    ? 'border-[#065E46] text-[#065E46] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-[#065E46]'
                }`
              }
            >
              Beranda
            </NavLink>
            <NavLink
              to="/catalog"
              className={({ isActive }) =>
                `whitespace-nowrap py-2.5 border-b-2 transition-colors font-medium shrink-0 ${
                  isActive
                    ? 'border-[#065E46] text-[#065E46] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-[#065E46]'
                }`
              }
            >
              Semua Kategori
            </NavLink>
            <NavLink
              to="/status"
              className={({ isActive }) =>
                `whitespace-nowrap py-2.5 border-b-2 transition-colors font-medium shrink-0 ${
                  isActive
                    ? 'border-[#0284C7] text-[#0284C7] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-[#0284C7]'
                }`
              }
            >
              Cek Pemesanan
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap py-2.5 border-b-2 transition-colors font-medium shrink-0 ${
                  isActive
                    ? 'border-[#065E46] text-[#065E46] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-[#065E46]'
                }`
              }
            >
              About YEG
            </NavLink>
          </div>
        </div>

        {/* Mobile Drawer — Public Customer Menu (Zero Admin / Zero Kasir / Zero Per-Category Duplicate) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg yeg-page-enter">
            <form onSubmit={handleSearch} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk YEGShop..."
                className="w-full h-11 pl-9 pr-16 rounded-xl border border-slate-200 bg-[#F8FAF9] text-sm"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#065E46] text-white text-xs font-semibold cursor-pointer"
              >
                Cari
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAF9] border border-slate-200 text-xs font-semibold text-[#06150E]"
              >
                <Home className="w-4 h-4 text-[#065E46]" />
                <span>Beranda</span>
              </Link>
              <Link
                to="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-semibold"
              >
                <LayoutGrid className="w-4 h-4 text-[#10B981]" />
                <span>Semua Kategori</span>
              </Link>
              <Link
                to="/status"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Cek Pemesanan</span>
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAF9] border border-slate-200 text-xs font-semibold text-[#06150E]"
              >
                <Info className="w-4 h-4 text-[#15803D]" />
                <span>About YEG</span>
              </Link>
            </div>
          </div>
        )}
        <ScrollProgressBar />
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        <div key={location.pathname} className="yeg-page-enter">
          {children}
        </div>
      </main>

      {/* Footer — Includes Portal Admin CTA */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#06150E] text-[#10B981] font-display font-extrabold flex items-center justify-center">
                Y
              </div>
              <span className="font-display font-bold text-lg text-[#06150E]">
                YEGShop by YEG Production
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Your Expression, Our Creation. Platform pemesanan produk map rapor K-13, map
              full-colour, percetakan offset, dan produk custom instansi dengan harga transparan.
            </p>
            <p className="text-xs text-slate-500">
              {settings?.workshopAddress || 'Workshop YEG Production · order.yegproduction.web.id'}
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="font-display font-semibold text-sm text-[#06150E]">Navigasi Cepat</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>
                <Link to="/catalog" className="hover:text-[#065E46]">
                  Semua Kategori Produk
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#065E46]">
                  About YEG Production
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-[#065E46]">
                  Keranjang Belanja
                </Link>
              </li>
              <li>
                <Link to="/status" className="hover:text-[#065E46]">
                  Cek Status Pemesanan
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm text-[#06150E]">
              Pembayaran, Kontak &amp; Admin
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transfer Resmi SeaBank:
              <br />
              <span className="font-semibold text-[#06150E] tabular-nums">901705659816</span>
              <br />
              a.n. Mochamad Ridhwan Mubarok
            </p>
            <p className="text-xs text-slate-600">
              WhatsApp Admin:{' '}
              <a
                href={waConsultationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#15803D] hover:underline tabular-nums"
              >
                0896-7484-9505
              </a>
            </p>
            <p className="text-xs text-slate-500">
              {settings?.operatingHours || 'Senin – Sabtu, 08:00 – 17:00 WIB'}
            </p>
            <div className="pt-1">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#06150E] hover:bg-[#065E46] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Portal Admin</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 px-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} YEGShop by YEG Production · Mata Uang: Rupiah (IDR)
        </div>
      </footer>

      {/* Floating WhatsApp CTA — Bottom-Right Corner, Auto-Hide on Scroll Down, Show on Scroll Up */}
      <div
        className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 transition-all duration-300 ease-out no-print ${
          waCtaVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <a
          href={waConsultationUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Konsultasi WhatsApp Admin YEG Production"
          className="yeg-cta-loop inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#15803D] text-white text-sm font-semibold shadow-lg hover:bg-[#065E46] transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">Konsultasi Desain</span>
        </a>
      </div>

      {/* Mobile Bottom Dock — Public Shopper Routes Only (No Admin/Kasir) */}
      <nav
        aria-label="Navigasi Utama Mobile"
        className="lg:hidden fixed bottom-2.5 inset-x-3 z-40 rounded-2xl bg-[#06150E]/95 backdrop-blur-md text-white border border-white/10 shadow-lg grid grid-cols-4 h-14 px-1 no-print"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Beranda</span>
        </NavLink>
        <NavLink
          to="/catalog"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Katalog</span>
        </NavLink>
        <NavLink
          to="/status"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <ClipboardList className="w-4 h-4" />
          <span>Cek Status</span>
        </NavLink>
        <NavLink
          to="/cart"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors relative min-h-[44px] ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#10B981] text-[#06150E] text-[9px] font-bold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </div>
          <span>Keranjang</span>
        </NavLink>
      </nav>
    </div>
  );
}
