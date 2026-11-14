import { yegApi } from '../services/api.ts';
import type { Addon, Product } from '../shared/types.ts';
import type { AddonRepository } from './interfaces.ts';

/**
 * DemoAddonRepository
 * Mengelola daftar add-on custom beserta aturan kesesuaian produk.
 */
export class DemoAddonRepository implements AddonRepository {
  readonly sourceMode = 'DEMO' as const;

  async list(includeInactive = false): Promise<Addon[]> {
    if (includeInactive) {
      const preview = await yegApi.getAdminCatalogPreview();
      return preview.addons;
    }
    const res = await yegApi.getAddons();
    return res.items;
  }

  async listForProduct(product: Product): Promise<Addon[]> {
    const all = await this.list(false);
    return all.filter(
      (a) =>
        a.active &&
        (a.applicableProducts.includes(product.productId) ||
          a.applicableProducts.includes(product.slug) ||
          (a.applicableProducts.includes('all_map') && product.isMapProduct))
    );
  }

  async save(addon: Addon): Promise<Addon> {
    const res = await yegApi.saveAddon(addon);
    return res.addon;
  }
}
