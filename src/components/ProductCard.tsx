import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatRupiah } from '../shared/pricing.ts';
import type { Product } from '../shared/types.ts';
import { SafeImage } from './SafeImage.tsx';

export function ProductCard({ product }: { product: Product }) {
  const lowestPrice = product.priceRules.reduce(
    (min, r) => (r.active && r.unitPrice < min ? r.unitPrice : min),
    Infinity
  );

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-[#065E46]/60 hover:shadow-md yeg-hover-lift"
    >
      <div>
        <div className="aspect-[4/3] bg-[#F8FAF9] overflow-hidden border-b border-slate-100">
          <SafeImage
            fileId={product.mainImageFileId}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
        <div className="p-2.5 sm:p-4 space-y-1">
          <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-[#059669] truncate">
            {product.categoryName}
          </div>
          <h3 className="font-display font-bold text-xs sm:text-base text-[#071A12] leading-snug line-clamp-2 group-hover:text-[#065E46]">
            {product.name}
          </h3>
          <p className="hidden sm:line-clamp-2 text-xs text-slate-600 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>
      </div>

      <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] text-slate-500 leading-none">Mulai</div>
          <div className="font-mono font-bold text-xs sm:text-base text-[#065E46] tabular-nums truncate mt-0.5">
            {Number.isFinite(lowestPrice) ? formatRupiah(lowestPrice) : 'Admin'}
            <span className="hidden sm:inline text-[11px] font-normal text-slate-500">/pcs</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold text-[#065E46] shrink-0">
          <span className="hidden sm:inline">Konfigurasi</span>
          <span className="sm:hidden">Pesan</span>
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
