import { yegApi } from '../services/api.ts';
import type { Addon, Product } from '../shared/types.ts';
import type { ProductFilterParams, ProductRepository } from './interfaces.ts';

/**
 * DemoProductRepository
 * Mengambil data katalog produk dari endpoint lokal DEMO (/api/catalog/products).
 * Interface ini identik dengan CloudflareWorkerProductRepository untuk migrasi tahap lanjut.
 */
export class DemoProductRepository implements ProductRepository {
  readonly sourceMode = 'DEMO' as const;

  async list(params?: ProductFilterParams): Promise<Product[]> {
    const res = await yegApi.getProducts({
      category: params?.categorySlug,
      q: params?.query,
    });
    return res.items;
  }

  async getBySlug(slug: string): Promise<{ product: Product; addons: Addon[] } | null> {
    try {
      return await yegApi.getProductBySlug(slug);
    } catch {
      return null;
    }
  }

  async save(product: Product): Promise<Product> {
    const res = await yegApi.saveProduct(product);
    return res.product;
  }
}
