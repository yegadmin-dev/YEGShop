import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout.tsx';

interface AdminModulePreviewPageProps {
  title: string;
  description: string;
}

export function AdminModulePreviewPage({ title, description }: AdminModulePreviewPageProps) {
  return (
    <AdminLayout
      title={title}
      subtitle="Modul lanjutan terjadwal pada tahap pengembangan berikutnya"
    >
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-2xl space-y-4">
        <div className="w-11 h-11 rounded-xl bg-[#F8FAF9] border border-slate-200 flex items-center justify-center text-[#065E46]">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display font-bold text-xl text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
        <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-slate-200 text-xs text-slate-700">
          Sesuai rencana bertahap (Tahap 1), fondasi situs, 8 halaman inti, dan arsitektur
          repository modular sudah aktif. Halaman operasional detail pada modul ini akan
          diaktifkan pada tahap berikutnya.
        </div>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#065E46] text-white text-xs font-bold hover:bg-[#054735]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard Admin</span>
        </Link>
      </div>
    </AdminLayout>
  );
}
