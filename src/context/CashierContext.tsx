import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  calculateConfiguredQuote,
  getFutureIsoDate,
  isValidFutureOrTodayDeadline,
} from '../shared/pricing.ts';
import type {
  CartItem,
  ConfiguredItemInput,
  OrderAdminCashierRecord,
  OrderItemRecord,
  PaymentMethod,
  Product,
} from '../shared/types.ts';
import { useStore } from './StoreContext.tsx';

export interface HeldPosOrder {
  id: string;
  label: string;
  savedAt: string;
  items: CartItem[];
}

export interface CashierPaymentDraft {
  sourceOrderId?: string;
  customerName: string;
  whatsapp: string;
  institution: string;
  cashierName: string;
  deadline: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Lunas' | 'DP Terverifikasi' | 'Belum Dibayar';
  dpInput: string;
  cashReceivedInput: string;
  notes: string;
}

export interface CashierReceiptSnapshot {
  order: OrderAdminCashierRecord;
  items: OrderItemRecord[];
}

export interface LoadableOrderPayload {
  orderId: string;
  customerName: string;
  whatsapp?: string;
  institution?: string;
  deadline?: string;
  customerNotes?: string;
  adminNotes?: string;
  items: OrderItemRecord[];
}

const POS_CART_KEY = 'yegshop_pos_cart_v1';
const HELD_ORDERS_KEY = 'yegshop_pos_held_orders_v1';
const POS_DRAFT_KEY = 'yegshop_pos_draft_v1';
const POS_LAST_RECEIPT_KEY = 'yegshop_pos_last_receipt_v1';

function createInitialDraft(): CashierPaymentDraft {
  return {
    sourceOrderId: '',
    customerName: '',
    whatsapp: '',
    institution: '',
    cashierName: 'Kasir Workshop YEG',
    deadline: getFutureIsoDate(7),
    paymentMethod: 'Tunai',
    paymentStatus: 'Lunas',
    dpInput: '',
    cashReceivedInput: '',
    notes: '',
  };
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T | null) {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface CashierContextValue {
  posCart: CartItem[];
  heldOrders: HeldPosOrder[];
  draft: CashierPaymentDraft;
  lastReceipt: CashierReceiptSnapshot | null;
  subtotalBase: number;
  subtotalAddons: number;
  posTotal: number;
  posTotalQty: number;
  addConfiguredItem: (product: Product, config: ConfiguredItemInput) => CartItem;
  updateConfiguredItem: (
    cartItemId: string,
    product: Product,
    config: ConfiguredItemInput
  ) => CartItem;
  adjustItemQty: (cartItemId: string, delta: number) => void;
  setItemQty: (cartItemId: string, qty: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  holdCurrentOrder: () => HeldPosOrder | null;
  restoreHeldOrder: (heldId: string) => boolean;
  deleteHeldOrder: (heldId: string) => void;
  loadOrderIntoCashier: (order: LoadableOrderPayload) => number;
  clearSourceOrderRef: () => void;
  updateDraft: (patch: Partial<CashierPaymentDraft>) => void;
  resetAfterPayment: (receipt: CashierReceiptSnapshot) => void;
  clearLastReceipt: () => void;
}

const CashierContext = createContext<CashierContextValue | null>(null);

export function CashierProvider({ children }: { children: ReactNode }) {
  const { products, addons } = useStore();

  const [posCart, setPosCart] = useState<CartItem[]>(() =>
    readStorage<CartItem[]>(POS_CART_KEY, [])
  );
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>(() =>
    readStorage<HeldPosOrder[]>(HELD_ORDERS_KEY, [])
  );
  const [draft, setDraft] = useState<CashierPaymentDraft>(() => ({
    ...createInitialDraft(),
    ...readStorage<Partial<CashierPaymentDraft>>(POS_DRAFT_KEY, {}),
  }));
  const [lastReceipt, setLastReceiptState] = useState<CashierReceiptSnapshot | null>(() =>
    readStorage<CashierReceiptSnapshot | null>(POS_LAST_RECEIPT_KEY, null)
  );

  const persistCart = useCallback((next: CartItem[]) => {
    setPosCart(next);
    writeStorage(POS_CART_KEY, next);
  }, []);

  const persistHeld = useCallback((next: HeldPosOrder[]) => {
    setHeldOrders(next);
    writeStorage(HELD_ORDERS_KEY, next);
  }, []);

  const updateDraft = useCallback((patch: Partial<CashierPaymentDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(POS_DRAFT_KEY, next);
      return next;
    });
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

  const addConfiguredItem = useCallback(
    (product: Product, config: ConfiguredItemInput) => {
      const newId = `POSCI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item = buildCartItem(newId, product, config);
      setPosCart((prev) => {
        const next = [...prev, item];
        writeStorage(POS_CART_KEY, next);
        return next;
      });
      return item;
    },
    [buildCartItem]
  );

  const updateConfiguredItem = useCallback(
    (cartItemId: string, product: Product, config: ConfiguredItemInput) => {
      const updated = buildCartItem(cartItemId, product, config);
      setPosCart((prev) => {
        const next = prev.map((c) => (c.cartItemId === cartItemId ? updated : c));
        writeStorage(POS_CART_KEY, next);
        return next;
      });
      return updated;
    },
    [buildCartItem]
  );

  const setItemQty = useCallback(
    (cartItemId: string, qty: number) => {
      const sanitizedQty = Math.max(1, Math.round(Number(qty) || 1));
      setPosCart((prev) => {
        const next = prev.map((existing) => {
          if (existing.cartItemId !== cartItemId) return existing;
          const product = products.find((p) => p.productId === existing.productId);
          if (!product) {
            const lineBaseSubtotal = existing.unitBasePrice * sanitizedQty;
            const lineAddonsSubtotal = existing.unitAddonsPrice * sanitizedQty;
            return {
              ...existing,
              qty: sanitizedQty,
              lineBaseSubtotal,
              lineAddonsSubtotal,
              lineTotal: lineBaseSubtotal + lineAddonsSubtotal,
            };
          }
          return buildCartItem(cartItemId, product, { ...existing, qty: sanitizedQty });
        });
        writeStorage(POS_CART_KEY, next);
        return next;
      });
    },
    [products, buildCartItem]
  );

  const adjustItemQty = useCallback(
    (cartItemId: string, delta: number) => {
      setPosCart((prev) => {
        const next = prev.map((existing) => {
          if (existing.cartItemId !== cartItemId) return existing;
          const nextQty = Math.max(1, existing.qty + delta);
          const product = products.find((p) => p.productId === existing.productId);
          if (!product) {
            const lineBaseSubtotal = existing.unitBasePrice * nextQty;
            const lineAddonsSubtotal = existing.unitAddonsPrice * nextQty;
            return {
              ...existing,
              qty: nextQty,
              lineBaseSubtotal,
              lineAddonsSubtotal,
              lineTotal: lineBaseSubtotal + lineAddonsSubtotal,
            };
          }
          return buildCartItem(cartItemId, product, { ...existing, qty: nextQty });
        });
        writeStorage(POS_CART_KEY, next);
        return next;
      });
    },
    [products, buildCartItem]
  );

  const removeItem = useCallback((cartItemId: string) => {
    setPosCart((prev) => {
      const next = prev.filter((i) => i.cartItemId !== cartItemId);
      writeStorage(POS_CART_KEY, next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    persistCart([]);
    setDraft((prev) => {
      if (!prev.sourceOrderId) return prev;
      const next = { ...prev, sourceOrderId: '' };
      writeStorage(POS_DRAFT_KEY, next);
      return next;
    });
  }, [persistCart]);

  const clearSourceOrderRef = useCallback(() => {
    updateDraft({ sourceOrderId: '' });
  }, [updateDraft]);

  const loadOrderIntoCashier = useCallback(
    (order: LoadableOrderPayload): number => {
      const mappedItems: CartItem[] = (order.items || []).map((rec, idx) => {
        const product = products.find((p) => p.productId === rec.productId);
        const config: ConfiguredItemInput = {
          productId: rec.productId,
          qty: Math.max(1, rec.qty),
          specifications: { ...(rec.specifications || {}) },
          addons: (rec.addons || []).map((a) => ({
            addonId: a.addonId,
            selectedOption: a.selectedOption,
          })),
          logoFileName: rec.logoFileName,
        };
        const cartItemId = `SCAN-${order.orderId}-${idx + 1}-${Date.now()}`;
        if (product) {
          return buildCartItem(cartItemId, product, config);
        }
        return {
          ...config,
          cartItemId,
          productName: rec.productName,
          productSlug: rec.productId,
          imageFileId: '',
          unitBasePrice: rec.unitBasePrice,
          unitAddonsPrice: rec.unitAddonsPrice,
          unitTotalPrice: rec.unitBasePrice + rec.unitAddonsPrice,
          lineBaseSubtotal: rec.lineSubtotal,
          lineAddonsSubtotal: rec.lineAddonsTotal,
          lineTotal: rec.lineTotal,
          tierLabel: `${rec.qty} pcs`,
          addonBreakdown: rec.addons || [],
        };
      });

      persistCart(mappedItems);

      const safeDeadline =
        order.deadline && isValidFutureOrTodayDeadline(order.deadline)
          ? order.deadline
          : getFutureIsoDate(7);

      const nextDraft: CashierPaymentDraft = {
        ...createInitialDraft(),
        cashierName: draft.cashierName || 'Kasir Workshop YEG',
        sourceOrderId: order.orderId,
        customerName: order.customerName || '',
        whatsapp: order.whatsapp || '',
        institution: order.institution || '',
        deadline: safeDeadline,
        notes: (order.customerNotes || order.adminNotes || '').trim(),
      };
      setDraft(nextDraft);
      writeStorage(POS_DRAFT_KEY, nextDraft);
      return mappedItems.length;
    },
    [products, buildCartItem, persistCart, draft.cashierName]
  );

  const holdCurrentOrder = useCallback(() => {
    if (posCart.length === 0) return null;
    const label = draft.customerName.trim() || `Antrean Tahan (${posCart.length} item)`;
    const held: HeldPosOrder = {
      id: `HOLD-${Date.now()}`,
      label,
      savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items: posCart,
    };
    persistHeld([held, ...heldOrders]);
    persistCart([]);
    return held;
  }, [posCart, draft.customerName, heldOrders, persistHeld, persistCart]);

  const restoreHeldOrder = useCallback(
    (heldId: string) => {
      const target = heldOrders.find((h) => h.id === heldId);
      if (!target) return false;
      persistCart(target.items);
      persistHeld(heldOrders.filter((h) => h.id !== heldId));
      return true;
    },
    [heldOrders, persistCart, persistHeld]
  );

  const deleteHeldOrder = useCallback(
    (heldId: string) => {
      persistHeld(heldOrders.filter((h) => h.id !== heldId));
    },
    [heldOrders, persistHeld]
  );

  const resetAfterPayment = useCallback(
    (receipt: CashierReceiptSnapshot) => {
      setLastReceiptState(receipt);
      writeStorage(POS_LAST_RECEIPT_KEY, receipt);
      persistCart([]);
      const freshDraft: CashierPaymentDraft = {
        ...createInitialDraft(),
        cashierName: draft.cashierName || 'Kasir Workshop YEG',
      };
      setDraft(freshDraft);
      writeStorage(POS_DRAFT_KEY, freshDraft);
    },
    [draft.cashierName, persistCart]
  );

  const clearLastReceipt = useCallback(() => {
    setLastReceiptState(null);
    writeStorage(POS_LAST_RECEIPT_KEY, null);
  }, []);

  const subtotalBase = useMemo(
    () => posCart.reduce((sum, i) => sum + i.lineBaseSubtotal, 0),
    [posCart]
  );
  const subtotalAddons = useMemo(
    () => posCart.reduce((sum, i) => sum + i.lineAddonsSubtotal, 0),
    [posCart]
  );
  const posTotal = useMemo(() => posCart.reduce((sum, i) => sum + i.lineTotal, 0), [posCart]);
  const posTotalQty = useMemo(() => posCart.reduce((sum, i) => sum + i.qty, 0), [posCart]);

  return (
    <CashierContext.Provider
      value={{
        posCart,
        heldOrders,
        draft,
        lastReceipt,
        subtotalBase,
        subtotalAddons,
        posTotal,
        posTotalQty,
        addConfiguredItem,
        updateConfiguredItem,
        adjustItemQty,
        setItemQty,
        removeItem,
        clearCart,
        holdCurrentOrder,
        restoreHeldOrder,
        deleteHeldOrder,
        loadOrderIntoCashier,
        clearSourceOrderRef,
        updateDraft,
        resetAfterPayment,
        clearLastReceipt,
      }}
    >
      {children}
    </CashierContext.Provider>
  );
}

export function useCashier() {
  const ctx = useContext(CashierContext);
  if (!ctx) {
    throw new Error('useCashier must be used within CashierProvider');
  }
  return ctx;
}
