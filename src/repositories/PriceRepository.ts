import { yegApi } from '../services/api.ts';
import type { ConfiguredItemInput, PriceRule, Product, QuoteResult } from '../shared/types.ts';
import type { PriceRepository } from './interfaces.ts';

/**
 * DemoPriceRepository
 * Menyediakan akses aturan tier harga dan kalkulasi kuotasi deterministik.
 */
export class DemoPriceRepository implements PriceRepository {
  readonly sourceMode = 'DEMO' as const;

  getRulesForProduct(product: Product): PriceRule[] {
    return (product.priceRules || []).filter((r) => r.active);
  }

  async calculateQuote(input: ConfiguredItemInput): Promise<QuoteResult> {
    return yegApi.calculateQuote(input);
  }
}
