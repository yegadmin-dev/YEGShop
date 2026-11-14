import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { yegApi } from '../services/api.ts';

export function AdminLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { notify, settings } = useStore();

  useEffect(() => {
    let mounted = true;
    yegApi
      .adminMe()
      .then((res) => {
        if (!mounted) return;
        if (res.authenticated) {
          navigate('/admin/dashboard', { replace: true });
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
      setError('PIN harus berupa tepat 6 digit angka.');
      return;
    }
    setLoading(true);
    try {
      await yegApi.adminLogin(pin.trim());
      notify('Login admin berhasil.', 'success');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-4 py-12">
      <div className="yeg-page-enter max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#065E46]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Toko Publik</span>
          </Link>
          <div className="w-12 h-12 rounded-xl bg-[#06150E] text-[#10B981] font-display font-extrabold text-2xl flex items-center justify-center mx-auto">
            Y
          </div>
          <h1 className="font-display font-bold text-2xl text-[#06150E]">
            Portal Admin YEGShop
          </h1>
          <p className="text-sm text-slate-600">
            Masukkan 6-digit PIN supervisor untuk mengelola pesanan, verifikasi pembayaran, dan POS.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
          {checkingSession ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Memeriksa sesi admin aktif...
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
                <label htmlFor="admin-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PIN Akses Admin (6 Digit)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-300 text-lg tracking-[0.35em] focus:outline-none focus:border-[#065E46]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="yeg-cta-loop w-full h-11 rounded-xl bg-[#065E46] text-white font-display font-bold text-sm hover:bg-[#054735] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin'}</span>
              </button>

              {settings?.demoMode && (
                <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 text-xs text-slate-600 text-center">
                  Mode Demo — Gunakan <span className="font-semibold text-slate-800">ADMIN_PIN</span> Anda (default: <span className="font-bold text-[#065E46]">123456</span> jika belum diubah).
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
