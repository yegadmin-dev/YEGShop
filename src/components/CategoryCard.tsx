import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Category } from '../shared/types.ts';
import { SafeImage } from './SafeImage.tsx';

interface CategoryCardProps {
  category: Category;
  productCount?: number;
}

export function CategoryCard({ category, productCount }: CategoryCardProps) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-[#065E46]/50 transition-colors"
    >
      <div>
        <div className="aspect-[16/10] bg-[#F8FAF9] overflow-hidden border-b border-slate-100">
          <SafeImage
            fileId={category.imageFileId}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
        <div className="p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-base text-[#071A12] group-hover:text-[#065E46]">
              {category.name}
            </h3>
            {typeof productCount === 'number' && (
              <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                {productCount} produk
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 flex items-center gap-1.5 text-xs font-semibold text-[#065E46]">
        <span>Jelajahi Kategori</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
