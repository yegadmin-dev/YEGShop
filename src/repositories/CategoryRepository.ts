import { yegApi } from '../services/api.ts';
import type { Category } from '../shared/types.ts';
import type { CategoryRepository } from './interfaces.ts';

/**
 * DemoCategoryRepository
 * Mengambil data kategori dari backend DEMO yang mensimulasikan tab Categories Google Sheets.
 */
export class DemoCategoryRepository implements CategoryRepository {
  readonly sourceMode = 'DEMO' as const;

  async list(includeInactive = false): Promise<Category[]> {
    if (includeInactive) {
      const preview = await yegApi.getAdminCatalogPreview();
      return preview.categories;
    }
    const res = await yegApi.getCategories();
    return res.items;
  }

  async getBySlug(slug: string): Promise<Category | null> {
    const items = await this.list(false);
    return items.find((c) => c.slug === slug) || null;
  }
}
