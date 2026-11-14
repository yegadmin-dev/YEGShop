import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  History,
  LogOut,
  PauseCircle,
  QrCode,
  ShoppingCart,
  UserCheck,
} from 'lucide-react';
import { ScrollProgressBar } from './MotionPrimitives.tsx';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';

export function CashierLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [cashierName, setCashierName] = useState('Kasir Workshop YEG');
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useStore();
  const { posCart, heldOrders, updateDraft } = useCashier();

  useEffect(() => {
    let mounted = true;
    yegApi
      .cashierMe()
      .then(async (res) => {
        if (!mounted) return;
        let finalName = res.cashierName || 'Kasir Workshop YEG';
        if (res.role === 'ADMIN_SUPERVISOR') {
          const isolated = await yegApi.enterCashierIsolated();
          if (!mounted) return;
          finalName = isolated.cashierName || 'Kasir Workshop YEG';
        }
        setCashierName(finalName);
        updateDraft({ cashierName: finalName });
        setChecking(false);
      })
      .catch(() => {
        if (!mounted) return;
        navigate('/kasir/login', { replace: true });
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleExitCashier = async () => {
    setExiting(true);
    try {
      await yegApi.cashierLogout();
    } finally {
      setExiting(false);
      notify('Sesi Kasir ditutup. Masukkan PIN Admin untuk akses Portal Admin.', 'info');
      navigate('/admin/login', { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#065E46] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Memverifikasi sesi kasir POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20 lg:pb-6">
      {/* Standalone Top Header — Isolated from Admin Sidebar */}
      <header className="sticky top-0 z-30 bg-[#06150E] text-white no-print">
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/kasir" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#10B981] text-[#06150E] font-display font-bold text-lg flex items-center justify-center">
              Y
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base tracking-tight whitespace-nowrap">
                YEGShop Kasir
              </div>
              <div className="text-[11px] text-[#10B981] whitespace-nowrap">
                Terminal POS Mandiri
              </div>
            </div>
          </Link>

          <div className="hidden xl:block pl-4 ml-2 border-l border-white/15 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-300 truncate">{subtitle}</div>}
          </div>
        </div>

        {/* Desktop Standalone Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl">
          <NavLink
            to="/kasir"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#10B981] text-[#06150E]' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Terminal POS</span>
          </NavLink>
          <NavLink
            to="/kasir/scan"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#10B981] text-[#06150E]' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan Barcode</span>
          </NavLink>
          <NavLink
            to="/kasir/bayar"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#10B981] text-[#06150E]' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Checkout ({posCart.length})</span>
          </NavLink>
          <NavLink
            to="/kasir/ditahan"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#10B981] text-[#06150E]' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Ditahan ({heldOrders.length})</span>
          </NavLink>
          <NavLink
            to="/kasir/riwayat"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#10B981] text-[#06150E]' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat</span>
          </NavLink>
        </nav>

        {/* Right Cashier Profile & Exit Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-right">
            <UserCheck className="w-4 h-4 text-[#10B981]" />
            <div className="leading-tight">
              <div className="text-xs font-semibold text-white max-w-[140px] truncate">
                {cashierName}
              </div>
              <div className="text-[10px] text-[#10B981]">Akses Kasir Terisolasi</div>
            </div>
          </div>

          <button
            type="button"
            disabled={exiting}
            onClick={() => void handleExitCashier()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-red-600 border border-white/20 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{exiting ? 'Keluar...' : 'Keluar Kasir'}</span>
          </button>
        </div>
        </div>
        <ScrollProgressBar />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto bg-white">
        <div key={location.pathname} className="yeg-page-enter">
          {children}
        </div>
      </main>

      {/* Mobile Compact Bottom Dock Navigation (<= 15% sticky height) */}
      <nav
        aria-label="Navigasi Kasir Mobile"
        className="lg:hidden fixed bottom-2.5 inset-x-3 z-40 rounded-2xl bg-[#06150E]/95 backdrop-blur-md text-white border border-white/10 shadow-lg grid grid-cols-5 h-14 px-1 no-print"
      >
        <NavLink
          to="/kasir"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Kasir</span>
        </NavLink>
        <NavLink
          to="/kasir/scan"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <QrCode className="w-4 h-4" />
          <span>Scan</span>
        </NavLink>
        <NavLink
          to="/kasir/bayar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <CreditCard className="w-4 h-4" />
          <span>Bayar ({posCart.length})</span>
        </NavLink>
        <NavLink
          to="/kasir/ditahan"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <PauseCircle className="w-4 h-4" />
          <span>Ditahan ({heldOrders.length})</span>
        </NavLink>
        <NavLink
          to="/kasir/riwayat"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-slate-300'
            }`
          }
        >
          <History className="w-4 h-4" />
          <span>Riwayat</span>
        </NavLink>
      </nav>
    </div>
  );
}
