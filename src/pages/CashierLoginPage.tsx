import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, ShieldAlert, ShoppingCart, User } from 'lucide-react';
import { useCashier } from '../context/CashierContext.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';

export function CashierLoginPage() {
  const [pin, setPin] = useState('');
  const [cashierName, setCashierName] = useState('Kasir Workshop YEG');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { notify, settings } = useStore();
  const { updateDraft } = useCashier();

  useEffect(() => {
    let mounted = true;
    yegApi
      .cashierMe()
      .then((res) => {
        if (!mounted) return;
        if (res.authenticated) {
          navigate('/kasir', { replace: true });
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(pin.trim())) {
      setError('PIN Kasir harus berupa tepat 6 digit angka.');
      return;
    }
    setLoading(true);
    try {
      const res = await yegApi.cashierLogin(pin.trim(), cashierName.trim() || 'Kasir Workshop YEG');
      updateDraft({ cashierName: res.cashierName || 'Kasir Workshop YEG' });
      notify('Login Terminal Kasir POS berhasil.', 'success');
      navigate('/kasir', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN Kasir tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-4 py-10">
      <div className="yeg-page-enter max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#065E46]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Toko Publik</span>
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-[#06150E] text-[#10B981] font-display font-bold text-2xl flex items-center justify-center mx-auto">
            Y
          </div>
          <h1 className="font-display font-bold text-2xl text-[#06150E]">
            Terminal Kasir POS YEGShop
          </h1>
          <p className="text-sm text-slate-600">
            Akses khusus petugas kasir workshop (terisolasi dari Portal Admin).
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-lg">
          {checkingSession ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Memeriksa sesi kasir aktif...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="cashier-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nama Petugas Kasir
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cashier-name"
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder="Contoh: Kasir Shift Pagi"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#065E46]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cashier-pin"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  PIN Akses Kasir (6 Digit)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cashier-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-300 font-mono text-lg tracking-[0.35em] focus:outline-none focus:border-[#065E46]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="yeg-cta-loop w-full h-12 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : 'Buka Terminal Kasir POS'}</span>
              </button>

              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 space-y-1 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-semibold text-[#065E46]">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Pemisahan Hak Akses Aktif</span>
                </div>
                <p>
                  Sesi kasir hanya dapat melayani transaksi POS dan riwayat kasir, tanpa akses ke
                  laporan keuangan atau pengaturan Portal Admin.
                </p>
                {settings?.demoMode && (
                  <p className="pt-1 text-slate-700">
                    PIN Kasir Demo default:{' '}
                    <span className="font-mono font-bold text-[#065E46]">654321</span> (atau PIN
                    Kasir / Admin Anda).
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <Link
                  to="/admin/login"
                  className="text-xs font-semibold text-[#0284C7] hover:underline"
                >
                  Masuk sebagai Admin / Supervisor &rarr;
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
