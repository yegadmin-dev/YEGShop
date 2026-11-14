import { DemoAddonRepository } from './AddonRepository.ts';
import { DemoCategoryRepository } from './CategoryRepository.ts';
import { createCloudflareWorkerRegistry } from './CloudflareWorkerAdapter.ts';
import type { RepositoryRegistry } from './interfaces.ts';
import { DemoOrderRepository } from './OrderRepository.ts';
import { DemoPaymentRepository } from './PaymentRepository.ts';
import { DemoPriceRepository } from './PriceRepository.ts';
import { DemoProductRepository } from './ProductRepository.ts';

export type {
  AddonRepository,
  CategoryRepository,
  CreateCashierOrderPayload,
  CreatePublicOrderPayload,
  OrderRepository,
  PaymentRepository,
  PriceRepository,
  ProductFilterParams,
  ProductRepository,
  RepositoryRegistry,
} from './interfaces.ts';

export {
  DemoAddonRepository,
  DemoCategoryRepository,
  DemoOrderRepository,
  DemoPaymentRepository,
  DemoPriceRepository,
  DemoProductRepository,
  createCloudflareWorkerRegistry,
};

export function createDemoRegistry(): RepositoryRegistry {
  return {
    mode: 'DEMO',
    products: new DemoProductRepository(),
    categories: new DemoCategoryRepository(),
    prices: new DemoPriceRepository(),
    addons: new DemoAddonRepository(),
    orders: new DemoOrderRepository(),
    payments: new DemoPaymentRepository(),
  };
}

/**
 * Active repository provider.
 * Saat VITE_CLOUDFLARE_WORKER_URL dikonfigurasi di tahap integrasi produksi,
 * seluruh aplikasi otomatis beralih dari DEMO ke Cloudflare Worker API tanpa mengubah UI.
 */
const configuredWorkerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

export const yegRepositories: RepositoryRegistry = configuredWorkerUrl
  ? createCloudflareWorkerRegistry(configuredWorkerUrl)
  : createDemoRegistry();
