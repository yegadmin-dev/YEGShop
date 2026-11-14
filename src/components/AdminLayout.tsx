import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Factory,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { ScrollProgressBar } from './MotionPrimitives.tsx';
import { yegApi } from '../services/api.ts';
import { useStore } from '../context/StoreContext.tsx';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Pesanan Publik', icon: ClipboardList },
  { to: '/kasir', label: 'Kasir POS', icon: ShoppingCart },
  { to: '/admin/payments', label: 'Pembayaran', icon: CreditCard },
  { to: '/admin/production', label: 'Produksi', icon: Factory },
  { to: '/admin/cashier/history', label: 'Riwayat Kasir', icon: History },
  { to: '/admin/catalog/products', label: 'Katalog Produk', icon: Package },
  { to: '/admin/catalog/addons', label: 'Add-ons Custom', icon: Sparkles },
  { to: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

export function AdminLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState('Supervisor YEG');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useStore();

  useEffect(() => {
    let mounted = true;
    yegApi
      .adminMe()
      .then((res) => {
        if (!mounted) return;
        setAdminName(res.adminName || 'Supervisor YEG');
        setChecking(false);
      })
      .catch(() => {
        if (!mounted) return;
        navigate('/admin/login', { replace: true });
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await yegApi.adminLogout();
    notify('Berhasil keluar dari Portal Admin.', 'info');
    navigate('/admin/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#065E46] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Memverifikasi sesi admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30 no-print">
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#06150E] text-[#10B981] font-display font-bold flex items-center justify-center">
              Y
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base text-[#06150E]">YEGShop POS</div>
              <div className="text-[11px] text-[#059669] font-semibold">Portal Admin</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#065E46] text-white font-semibold'
                      : 'text-slate-700 hover:bg-[#F8FAF9] hover:text-[#065E46]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#065E46]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>Adapter Demo Aktif</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Skema 13 tab Google Sheets siap disambungkan ke Cloudflare Worker.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <span>Lihat Toko Publik</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 no-print">
          <div className="h-12 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Menu Admin"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-sm sm:text-lg text-slate-900 truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#071A12]">{adminName}</div>
                <div className="text-[11px] text-[#059669]">PIN Terverifikasi</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="lg:hidden px-2.5 py-1.5 rounded-lg border border-red-200 text-[11px] font-semibold text-red-700 cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
          <ScrollProgressBar />
        </header>

        {/* Mobile Admin Popup Modal */}
        {mobileNavOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3.5 no-print"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Portal Admin"
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden yeg-page-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-[#06150E] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#10B981] text-[#06150E] font-display font-bold text-sm flex items-center justify-center shrink-0">
                    Y
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs truncate">Menu Portal Admin</div>
                    <div className="text-[10px] text-[#10B981] truncate">{adminName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Tutup Menu"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="p-3 grid grid-cols-2 gap-1.5 max-h-[65vh] overflow-y-auto">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-[11px] font-medium min-h-[42px] transition-colors ${
                          isActive
                            ? 'bg-[#065E46] text-white font-semibold'
                            : 'bg-[#F8FAF9] text-slate-700 hover:bg-emerald-50'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="px-3 py-2.5 border-t border-slate-100 bg-[#F8FAF9] flex items-center justify-between gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Toko Publik</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    void handleLogout();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-2.5 sm:p-6 max-w-[1440px] w-full mx-auto min-w-0">
          <div key={location.pathname} className="yeg-page-enter min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
