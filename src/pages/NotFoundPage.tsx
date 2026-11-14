import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.tsx';

export function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="yeg-page-enter max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="font-mono text-4xl font-extrabold text-[#065E46]">404</div>
        <div className="space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-[#071A12]">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-600">
            Alamat URL yang Anda buka tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="yeg-cta-loop inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#065E46] text-white text-sm font-semibold hover:bg-[#054735]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold hover:border-[#065E46]"
          >
            <Search className="w-4 h-4" />
            <span>Buka Katalog</span>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
