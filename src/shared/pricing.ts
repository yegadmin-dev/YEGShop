import type {
  Addon,
  ConfiguredItemInput,
  PriceRule,
  Product,
  QuoteResult,
} from './types.ts';

export const K13_COLORS = [
  { name: 'Hijau tua', hex: '#174D36' },
  { name: 'Maroon', hex: '#6A131B' },
  { name: 'Biru benhur', hex: '#0B4FBA' },
  { name: 'Biru tua', hex: '#163567' },
  { name: 'Hitam', hex: '#1E1E1E' },
  { name: 'Abu-abu', hex: '#64748B' },
  { name: 'Merah', hex: '#C81E1E' },
  { name: 'Oranye', hex: '#EA580C' },
  { name: 'Ungu', hex: '#6D28D9' },
  { name: 'Putih', hex: '#F8FAFC' },
  { name: 'Fur', hex: '#8B5A2B' },
  { name: 'Biru dongker', hex: '#0D1E3D' },
  { name: 'Tosca', hex: '#0D9488' },
] as const;

export const MAP_SHEET_COUNTS = [
  'Only Cover',
  '2 lembar',
  '4 lembar',
  '6 lembar',
  '8 lembar',
  '10 lembar',
  '12 lembar',
  '14 lembar',
  '16 lembar',
  '18 lembar',
  '20 lembar',
  '22 lembar',
  '24 lembar',
] as const;

export function buildMapPriceRules(
  productId: string,
  base101: number,
  base50: number,
  base1: number
): PriceRule[] {
  const rules: PriceRule[] = [];
  MAP_SHEET_COUNTS.forEach((sheetLabel, idx) => {
    const increment = idx * 2000;
    rules.push(
      {
        ruleId: `${productId}-${idx}-t1`,
        productId,
        variantKey: sheetLabel,
        minQty: 1,
        maxQty: 49,
        unitPrice: base1 + increment,
        active: true,
      },
      {
        ruleId: `${productId}-${idx}-t2`,
        productId,
        variantKey: sheetLabel,
        minQty: 50,
        maxQty: 100,
        unitPrice: base50 + increment,
        active: true,
      },
      {
        ruleId: `${productId}-${idx}-t3`,
        productId,
        variantKey: sheetLabel,
        minQty: 101,
        maxQty: null,
        unitPrice: base101 + increment,
        active: true,
      }
    );
  });
  return rules;
}

export function getTierLabel(qty: number, matchedRule?: PriceRule): string {
  if (matchedRule) {
    return matchedRule.maxQty
      ? `${matchedRule.minQty}–${matchedRule.maxQty} pcs`
      : `${matchedRule.minQty}+ pcs`;
  }
  if (qty >= 101) return '101+ pcs';
  if (qty >= 50) return '50–100 pcs';
  return '1–49 pcs';
}

export function calculateConfiguredQuote(
  product: Product,
  allAddons: Addon[],
  input: ConfiguredItemInput
): QuoteResult {
  const safeQty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const variantKey =
    product.priceModel === 'tier_sheet'
      ? input.specifications.isiMap || 'Only Cover'
      : input.specifications.varian || 'default';

  const activeRules = product.priceRules.filter(
    (r) => r.active && r.variantKey === variantKey
  );
  const fallbackRules =
    activeRules.length > 0
      ? activeRules
      : product.priceRules.filter((r) => r.active);

  // Match tier for quantity
  const matchedRule =
    fallbackRules.find(
      (r) => safeQty >= r.minQty && (r.maxQty === null || safeQty <= r.maxQty)
    ) || fallbackRules[0];

  const unitBasePrice = matchedRule ? matchedRule.unitPrice : 0;

  // Compute eligible add-ons strictly once per pcs (Sudut Siku 1 set = 4 sudut is NOT multiplied by 4)
  const addonBreakdown: QuoteResult['addonBreakdown'] = [];
  const seenAddonIds = new Set<string>();

  for (const selected of input.addons || []) {
    if (seenAddonIds.has(selected.addonId)) continue;
    const addon = allAddons.find((a) => a.addonId === selected.addonId && a.active);
    if (!addon) continue;

    // Enforce Applicable Products rule (e.g. Logo Berwarna & List Frame only for K-13)
    const isApplicable =
      addon.applicableProducts.includes(product.productId) ||
      addon.applicableProducts.includes(product.slug) ||
      (addon.applicableProducts.includes('all_map') && product.isMapProduct);

    if (!isApplicable) continue;

    seenAddonIds.add(addon.addonId);

    const resolvedOption = addon.requiresOption
      ? selected.selectedOption ||
        addon.options?.find((o) => o.active)?.name ||
        'Siku Segitiga'
      : undefined;

    addonBreakdown.push({
      addonId: addon.addonId,
      name: addon.name,
      selectedOption: resolvedOption,
      pricePerPcs: addon.pricePerPcs,
      subtotal: addon.pricePerPcs * safeQty,
    });
  }

  const unitAddonsPrice = addonBreakdown.reduce((sum, a) => sum + a.pricePerPcs, 0);
  const unitTotalPrice = unitBasePrice + unitAddonsPrice;
  const lineBaseSubtotal = unitBasePrice * safeQty;
  const lineAddonsSubtotal = unitAddonsPrice * safeQty;
  const lineTotal = unitTotalPrice * safeQty;

  // Next tier tip for helpful transparent pricing
  const higherTier = fallbackRules
    .filter((r) => r.minQty > safeQty && r.unitPrice < unitBasePrice)
    .sort((a, b) => a.minQty - b.minQty)[0];

  return {
    productId: product.productId,
    productName: product.name,
    qty: safeQty,
    tierLabel: getTierLabel(safeQty, matchedRule),
    unitBasePrice,
    unitAddonsPrice,
    unitTotalPrice,
    lineBaseSubtotal,
    lineAddonsSubtotal,
    lineTotal,
    addonBreakdown,
    nextTierTip: higherTier
      ? {
          targetQty: higherTier.minQty,
          newUnitBasePrice: higherTier.unitPrice,
          savingsPerPcs: unitBasePrice - higherTier.unitPrice,
        }
      : null,
  };
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return 'Rp' + rounded.toLocaleString('id-ID');
}

export function formatDateShort(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeId(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getFutureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidFutureOrTodayDeadline(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return dateStr >= getTodayIsoDate();
}

export function normalizeWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = normalizeWhatsApp(phone) || '6289674849505';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
