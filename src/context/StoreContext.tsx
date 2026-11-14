import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { calculateConfiguredQuote } from '../shared/pricing.ts';
import type {
  Addon,
  CartItem,
  Category,
  ConfiguredItemInput,
  OrderItemRecord,
  OrderWaitingRecord,
  Product,
  StoreSettings,
} from '../shared/types.ts';
import { yegRepositories } from '../repositories/index.ts';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface LastOrderTicket {
  order: OrderWaitingRecord;
  items: OrderItemRecord[];
}

interface StoreContextValue {
  settings: StoreSettings | null;
  categories: Category[];
  products: Product[];
  addons: Addon[];
  loadingCatalog: boolean;
  catalogError: string | null;
  dataSourceMode: 'DEMO' | 'CLOUDFLARE_WORKER';
  reloadCatalog: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, config: ConfiguredItemInput) => void;
  updateCartItem: (cartItemId: string, config: ConfiguredItemInput) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  lastOrderTicket: LastOrderTicket | null;
  setLastOrderTicket: (ticket: LastOrderTicket | null) => void;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'yegshop_public_cart_v1';
const LAST_ORDER_KEY = 'yegshop_last_order_v1';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [lastOrderTicket, setLastOrderTicketState] = useState<LastOrderTicket | null>(() => {
    try {
      const saved = sessionStorage.getItem(LAST_ORDER_KEY);
      return saved ? (JSON.parse(saved) as LastOrderTicket) : null;
    } catch {
      return null;
    }
  });

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const reloadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const [cfg, catItems, prodItems, addonItems] = await Promise.all([
        yegRepositories.payments.getStorePaymentConfig(),
        yegRepositories.categories.list(false),
        yegRepositories.products.list(),
        yegRepositories.addons.list(false),
      ]);
      setSettings(cfg);
      setCategories(catItems);
      setProducts(prodItems);
      setAddons(addonItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat katalog YEGShop.';
      setCatalogError(message);
      notify(message, 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [notify]);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota issues
    }
  }, [cart]);

  const setLastOrderTicket = useCallback((ticket: LastOrderTicket | null) => {
    setLastOrderTicketState(ticket);
    try {
      if (ticket) {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(ticket));
      } else {
        sessionStorage.removeItem(LAST_ORDER_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const buildCartItem = useCallback(
    (cartItemId: string, product: Product, config: ConfiguredItemInput): CartItem => {
      const quote = calculateConfiguredQuote(product, addons, config);
      return {
        ...config,
        cartItemId,
        productName: product.name,
        productSlug: product.slug,
        imageFileId: product.mainImageFileId,
        unitBasePrice: quote.unitBasePrice,
        unitAddonsPrice: quote.unitAddonsPrice,
        unitTotalPrice: quote.unitTotalPrice,
        lineBaseSubtotal: quote.lineBaseSubtotal,
        lineAddonsSubtotal: quote.lineAddonsSubtotal,
        lineTotal: quote.lineTotal,
        tierLabel: quote.tierLabel,
        addonBreakdown: quote.addonBreakdown,
      };
    },
    [addons]
  );

  const addToCart = useCallback(
    (product: Product, config: ConfiguredItemInput) => {
      const id = `CI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item = buildCartItem(id, product, config);
      // Separate line items whenever specifications or add-ons differ (always add distinct configured row)
      setCart((prev) => [...prev, item]);
      notify(`${product.name} (${item.qty} pcs) ditambahkan ke keranjang.`, 'success');
    },
    [buildCartItem, notify]
  );

  const updateCartItem = useCallback(
    (cartItemId: string, config: ConfiguredItemInput) => {
      setCart((prev) =>
        prev.map((existing) => {
          if (existing.cartItemId !== cartItemId) return existing;
          const product = products.find((p) => p.productId === existing.productId);
          if (!product) return existing;
          return buildCartItem(cartItemId, product, config);
        })
      );
      notify('Konfigurasi item keranjang diperbarui.', 'success');
    },
    [buildCartItem, notify, products]
  );

  const removeCartItem = useCallback(
    (cartItemId: string) => {
      setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
      notify('Item dihapus dari keranjang.', 'info');
    },
    [notify]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(() => cart.length, [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.lineTotal, 0), [cart]);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        addons,
        loadingCatalog,
        catalogError,
        dataSourceMode: yegRepositories.mode,
        reloadCatalog,
        cart,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        cartCount,
        cartTotal,
        lastOrderTicket,
        setLastOrderTicket,
        notify,
      }}
    >
      {children}
      {/* Non-intrusive Toast Stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-3 shadow-lg border text-sm font-medium transition-all ${
              t.type === 'success'
                ? 'bg-[#065E46] text-white border-[#10B981]'
                : t.type === 'error'
                ? 'bg-red-700 text-white border-red-800'
                : 'bg-white text-slate-900 border-slate-200'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore harus digunakan di dalam StoreProvider.');
  }
  return ctx;
}
