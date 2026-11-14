import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { RevealBlock } from '../components/MotionPrimitives.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { PublicLayout } from '../components/PublicLayout.tsx';
import { SearchBar } from '../components/SearchBar.tsx';
import { useStore } from '../context/StoreContext.tsx';

type SortOption = 'default' | 'price_asc' | 'featured';

function getLowestUnitPrice(priceRules: Array<{ active: boolean; unitPrice: number }>): number {
  return priceRules.reduce(
    (min, r) => (r.active && r.unitPrice < min ? r.unitPrice : min),
    Infinity
  );
}

export function CatalogPage() {
  const { slug: routeCategorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { categories, products, loadingCatalog, catalogError, reloadCatalog } = useStore();

  const queryCategory = searchParams.get('category') || '';
  const activeCategorySlug = routeCategorySlug || queryCategory;
  const urlSearch = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') as SortOption) || 'default';

  const [searchInput, setSearchInput] = useState(urlSearch);

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === activeCategorySlug) || null,
    [categories, activeCategorySlug]
  );

  const handleSelectCategory = (slug: string) => {
    const next = new URLSearchParams();
    if (searchInput.trim()) next.set('q', searchInput.trim());
    if (sortBy !== 'default') next.set('sort', sortBy);
    const qs = next.toString() ? `?${next.toString()}` : '';
    if (!slug) {
      navigate(`/catalog${qs}`);
    } else {
      navigate(`/category/${slug}${qs}`);
    }
  };

  const handleSortChange = (nextSort: SortOption) => {
    const next = new URLSearchParams(searchParams);
    if (nextSort === 'default') next.delete('sort');
    else next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set('q', val);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchCategory = !activeCategorySlug || p.categorySlug === activeCategorySlug;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort(
        (a, b) => getLowestUnitPrice(a.priceRules) - getLowestUnitPrice(b.priceRules)
      );
    }
    if (sortBy === 'featured') {
      return [...list].sort((a, b) => Number(b.featured || b.bestSeller) - Number(a.featured || a.bestSeller));
    }
    return list;
  }, [products, activeCategorySlug, searchInput, sortBy]);

  return (
    <PublicLayout>
      <section className="bg-white border-b border-slate-200">
        <RevealBlock className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                Katalog Produk YEGShop
              </p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#071A12] mt-1">
                {activeCategory ? activeCategory.name : 'Semua Katalog Produk'}
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                {activeCategory
                  ? activeCategory.description
                  : 'Temukan Map Rapor K-13, Map Full-Colour, produk percetakan sekolah, dan merchandise custom.'}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
              Menampilkan {filteredProducts.length} produk
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-8">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={handleSearchSubmit}
                placeholder="Cari nama produk, map K-13, sertifikat, nota, atau lanyard..."
              />
            </div>
            <div className="lg:col-span-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              <label htmlFor="catalog-sort" className="text-xs font-semibold text-slate-700 shrink-0">
                Urutkan:
              </label>
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-[#071A12] focus:outline-none focus:border-[#065E46]"
              >
                <option value="default">Urutan Standar</option>
                <option value="featured">Produk Unggulan</option>
                <option value="price_asc">Harga Dasar Terendah</option>
              </select>
            </div>
          </div>

          {/* Interactive Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectCategory('')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                !activeCategorySlug
                  ? 'bg-[#065E46] text-white border-[#065E46]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#065E46]'
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => {
              const active = activeCategorySlug === cat.slug;
              return (
                <button
                  key={cat.categoryId}
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#065E46] text-white border-[#065E46]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#065E46]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </RevealBlock>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {catalogError ? (
          <div className="bg-white border border-red-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display font-bold text-sm text-slate-900">
                  Gagal Memuat Data Katalog
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{catalogError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void reloadCatalog()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : loadingCatalog ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 h-52 sm:h-80 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <h2 className="font-display font-bold text-lg text-[#071A12]">
              Produk Tidak Ditemukan
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Tidak ada produk yang cocok dengan filter kategori atau kata kunci pencarian saat ini.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                navigate('/catalog');
              }}
              className="px-4 py-2 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] cursor-pointer"
            >
              Reset Filter Katalog
            </button>
          </div>
        ) : (
          <RevealBlock delayMs={50} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </RevealBlock>
        )}
      </section>
    </PublicLayout>
  );
}
