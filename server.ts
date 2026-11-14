import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { calculateConfiguredQuote } from './src/shared/pricing.ts';
import { analyzeProductionWithAi, consultCustomSpecWithAi } from './src/server/gemini.ts';
import { yegRepo } from './src/server/repository.ts';
import { GENERATED_IMAGE_MAP } from './src/server/seedData.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = process.env.ADMIN_PIN || '123456';
const CASHIER_PIN = process.env.CASHIER_PIN || '654321';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(`yegshop-dev-${ADMIN_PIN}`).digest('hex');
const COOKIE_NAME = 'yegshop_admin_session';
const CASHIER_COOKIE_NAME = 'yegshop_cashier_session';

// Login rate limiter (in-memory per IP)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function signSessionToken(payload: { role: string; adminName: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(
  token: string | undefined
): { role: string; adminName: string; exp: number } | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      role: string;
      adminName: string;
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getSessionFromRequest(
  req: Request,
  cookieName: string = COOKIE_NAME
): { role: string; adminName: string; exp: number } | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    const fromBearer = verifySessionToken(bearerToken);
    if (fromBearer) return fromBearer;
  }
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[cookieName]);
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req, COOKIE_NAME);
  if (!session || session.role !== 'ADMIN_SUPERVISOR') {
    res.status(401).json({ error: 'Akses khusus Admin. Silakan masukkan PIN Admin.' });
    return;
  }
  (req as Request & { adminSession?: typeof session }).adminSession = session;
  next();
}

function requireCashierAuth(req: Request, res: Response, next: NextFunction) {
  const session =
    getSessionFromRequest(req, CASHIER_COOKIE_NAME) || getSessionFromRequest(req, COOKIE_NAME);
  if (!session || (session.role !== 'CASHIER' && session.role !== 'ADMIN_SUPERVISOR')) {
    res.status(401).json({ error: 'Sesi kasir belum aktif. Silakan masukkan PIN Kasir.' });
    return;
  }
  (req as Request & { adminSession?: typeof session }).adminSession = session;
  next();
}

function buildQrisFallbackSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" width="360" height="420">
  <rect width="360" height="420" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <rect x="0" y="0" width="360" height="68" rx="16" fill="#06150E"/>
  <rect x="0" y="48" width="360" height="20" fill="#06150E"/>
  <text x="180" y="34" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="700">QRIS YEG PRODUCTION</text>
  <text x="180" y="54" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="11">ID: 1McD8d9szV_1ivYFoIWWTMAoD3aEUt4rB</text>
  <rect x="65" y="92" width="230" height="230" rx="12" fill="#F8FAF9" stroke="#CBD5E1" stroke-width="1.5"/>
  <g fill="#065E46">
    <rect x="85" y="112" width="52" height="52" rx="4"/>
    <rect x="95" y="122" width="32" height="32" fill="#FFFFFF"/>
    <rect x="103" y="130" width="16" height="16"/>
    <rect x="223" y="112" width="52" height="52" rx="4"/>
    <rect x="233" y="122" width="32" height="32" fill="#FFFFFF"/>
    <rect x="241" y="130" width="16" height="16"/>
    <rect x="85" y="250" width="52" height="52" rx="4"/>
    <rect x="95" y="260" width="32" height="32" fill="#FFFFFF"/>
    <rect x="103" y="268" width="16" height="16"/>
    <rect x="152" y="116" width="14" height="14"/>
    <rect x="174" y="116" width="14" height="14"/>
    <rect x="196" y="130" width="14" height="14"/>
    <rect x="152" y="144" width="28" height="14"/>
    <rect x="160" y="176" width="40" height="40" rx="6" fill="#10B981"/>
    <rect x="170" y="186" width="20" height="20" fill="#FFFFFF"/>
    <rect x="88" y="180" width="20" height="16"/>
    <rect x="116" y="188" width="24" height="16"/>
    <rect x="216" y="180" width="24" height="16"/>
    <rect x="248" y="188" width="24" height="24"/>
    <rect x="152" y="232" width="20" height="20"/>
    <rect x="184" y="232" width="28" height="14"/>
    <rect x="224" y="232" width="20" height="28"/>
    <rect x="252" y="250" width="20" height="20"/>
    <rect x="152" y="268" width="36" height="18"/>
    <rect x="200" y="274" width="28" height="28"/>
    <rect x="240" y="282" width="32" height="18"/>
  </g>
  <text x="180" y="352" text-anchor="middle" fill="#071A12" font-family="sans-serif" font-size="13" font-weight="700">NMID: ID1024YEGPRODUCTION</text>
  <text x="180" y="372" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="11">a/n Mochamad Ridhwan Mubarok (Mode Demo Proxy)</text>
  <text x="180" y="394" text-anchor="middle" fill="#059669" font-family="sans-serif" font-size="11" font-weight="600">Scan via SeaBank / BCA / GoPay / OVO / Dana</text>
</svg>`;
}

async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));

  // =========================================================================
  // PUBLIC API ENDPOINTS
  // =========================================================================
  app.get('/api/store/config', async (_req, res) => {
    const settings = await yegRepo.getSettings();
    res.json(settings);
  });

  app.get('/api/catalog/categories', async (_req, res) => {
    const categories = await yegRepo.getCategories(false);
    res.json({ items: categories });
  });

  app.get('/api/catalog/products', async (req, res) => {
    const allProducts = await yegRepo.getProducts(false);
    const categorySlug = typeof req.query.category === 'string' ? req.query.category : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const filtered = allProducts.filter((p) => {
      const matchCat = !categorySlug || p.categorySlug === categorySlug;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        p.shortDescription.toLowerCase().includes(search) ||
        p.categoryName.toLowerCase().includes(search);
      return matchCat && matchSearch;
    });

    res.json({ items: filtered });
  });

  app.get('/api/catalog/products/:slug', async (req, res) => {
    const product = await yegRepo.getProductBySlug(req.params.slug);
    if (!product) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }
    const addons = await yegRepo.getAddons(false);
    const applicableAddons = addons.filter(
      (a) =>
        a.applicableProducts.includes(product.productId) ||
        a.applicableProducts.includes(product.slug) ||
        (a.applicableProducts.includes('all_map') && product.isMapProduct)
    );
    res.json({ product, addons: applicableAddons });
  });

  app.get('/api/catalog/addons', async (_req, res) => {
    const addons = await yegRepo.getAddons(false);
    res.json({ items: addons });
  });

  // Asset proxy endpoint mimicking Google Drive Worker proxy with whitelist
  app.get('/api/assets/:fileId', async (req, res) => {
    const { fileId } = req.params;
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // QRIS Google Drive File ID or fallback
    if (fileId === '1McD8d9szV_1ivYFoIWWTMAoD3aEUt4rB') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(buildQrisFallbackSvg());
      return;
    }

    const mappedFile = GENERATED_IMAGE_MAP[fileId];
    if (mappedFile) {
      const fullPath = path.resolve(process.cwd(), 'src/assets/images', mappedFile);
      if (fs.existsSync(fullPath)) {
        res.sendFile(fullPath);
        return;
      }
    }

    res.status(404).json({ error: 'Aset tidak terdaftar pada whitelist Drive proxy.' });
  });

  // Server-side deterministic quote calculator
  app.post('/api/quote', async (req, res) => {
    try {
      const { productId, qty, specifications, addons } = req.body || {};
      const products = await yegRepo.getProducts(false);
      const product = products.find((p) => p.productId === productId);
      if (!product) {
        res.status(404).json({ error: 'Produk tidak ditemukan.' });
        return;
      }
      const allAddons = await yegRepo.getAddons(false);
      const quote = calculateConfiguredQuote(product, allAddons, {
        productId,
        qty: Number(qty) || 1,
        specifications: specifications || {},
        addons: Array.isArray(addons) ? addons : [],
      });
      res.json(quote);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghitung harga.' });
    }
  });

  // Public checkout -> Orders_Waiting + Order_Items + Payments + Production
  app.post('/api/orders', async (req, res) => {
    try {
      const body = req.body || {};
      // Verify file size limit (base64 max ~10MB binary)
      if (typeof body.paymentProofDataUrl === 'string' && body.paymentProofDataUrl.length > 14_500_000) {
        res.status(400).json({ error: 'Ukuran bukti pembayaran melebihi batas maksimal 10 MB.' });
        return;
      }
      const result = await yegRepo.createPublicOrder(body);
      res.status(result.deduplicated ? 200 : 201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan pesanan.' });
    }
  });

  // Public order status lookup
  app.post('/api/status', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    if (!query.trim()) {
      res.status(400).json({ error: 'Masukkan Order ID atau nomor WhatsApp.' });
      return;
    }
    const orders = await yegRepo.lookupOrders(query);
    res.json({ items: orders });
  });

  // Public AI Spec Consultant (Server-Side Gemini High Thinking)
  app.post('/api/ai/consult-spec', async (req, res) => {
    try {
      const { question, qtyEstimate, budgetPerPcs, productSlug } = req.body || {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Pertanyaan spesifikasi tidak boleh kosong.' });
        return;
      }
      const product = productSlug ? await yegRepo.getProductBySlug(productSlug) : null;
      const addons = await yegRepo.getAddons(false);
      const suggestion = await consultCustomSpecWithAi({
        question: question.trim(),
        qtyEstimate: Math.max(1, Number(qtyEstimate) || 50),
        budgetPerPcs: budgetPerPcs ? Number(budgetPerPcs) : undefined,
        product,
        addons,
      });
      res.json(suggestion);
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Layanan Konsultan AI sedang mengalami gangguan. Silakan coba lagi.',
      });
    }
  });

  // =========================================================================
  // ADMIN AUTHENTICATION (6-Digit PIN + HttpOnly Cookie + Rate Limiting)
  // =========================================================================
  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record && record.blockedUntil > now) {
      const waitSec = Math.ceil((record.blockedUntil - now) / 1000);
      res.status(429).json({
        error: `Terlalu banyak percobaan PIN gagal. Coba lagi dalam ${waitSec} detik.`,
      });
      return;
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: 'PIN harus berupa tepat 6 digit angka.' });
      return;
    }

    const pinBuf = Buffer.from(pin);
    const expectedBuf = Buffer.from(ADMIN_PIN);
    const matches =
      pinBuf.length === expectedBuf.length && crypto.timingSafeEqual(pinBuf, expectedBuf);

    if (!matches) {
      const nextCount = (record?.count || 0) + 1;
      const blockedUntil = nextCount >= 5 ? now + 10 * 60 * 1000 : 0;
      loginAttempts.set(ip, { count: nextCount, blockedUntil });
      res.status(401).json({
        error:
          nextCount >= 5
            ? 'PIN salah 5 kali. Akses diblokir sementara 10 menit.'
            : `PIN salah. Sisa percobaan: ${5 - nextCount}.`,
      });
      return;
    }

    loginAttempts.delete(ip);
    const token = signSessionToken({
      role: 'ADMIN_SUPERVISOR',
      adminName: 'Mochamad Ridhwan M.',
      exp: now + 12 * 60 * 60 * 1000,
    });

    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('https://'));

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      authenticated: true,
      adminName: 'Mochamad Ridhwan M.',
      role: 'ADMIN_SUPERVISOR',
      token,
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('https://'));
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
    });
    res.json({ ok: true });
  });

  app.get('/api/admin/me', (req, res) => {
    const session = getSessionFromRequest(req, COOKIE_NAME);
    if (!session || session.role !== 'ADMIN_SUPERVISOR') {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      adminName: session.adminName,
      role: session.role,
    });
  });

  // =========================================================================
  // DEDICATED CASHIER AUTHENTICATION & POS ENDPOINTS (Isolated from Admin)
  // =========================================================================
  app.post('/api/cashier/login', async (req, res) => {
    const ip = `cashier:${req.ip || 'unknown'}`;
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record && record.blockedUntil > now) {
      const waitSec = Math.ceil((record.blockedUntil - now) / 1000);
      res.status(429).json({
        error: `Terlalu banyak percobaan PIN kasir gagal. Coba lagi dalam ${waitSec} detik.`,
      });
      return;
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const storeSettings = await yegRepo.getSettings();
    const cashierLabel =
      (storeSettings.defaultCashierName || '').trim() ||
      (typeof req.body?.cashierName === 'string' && req.body.cashierName.trim()
        ? req.body.cashierName.trim()
        : 'Kasir Workshop YEG');
    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: 'PIN Kasir harus berupa tepat 6 digit angka.' });
      return;
    }

    const pinBuf = Buffer.from(pin);
    const cashierBuf = Buffer.from(CASHIER_PIN);
    const adminBuf = Buffer.from(ADMIN_PIN);
    const matchesCashier =
      pinBuf.length === cashierBuf.length && crypto.timingSafeEqual(pinBuf, cashierBuf);
    const matchesAdmin =
      pinBuf.length === adminBuf.length && crypto.timingSafeEqual(pinBuf, adminBuf);

    if (!matchesCashier && !matchesAdmin) {
      const nextCount = (record?.count || 0) + 1;
      const blockedUntil = nextCount >= 5 ? now + 10 * 60 * 1000 : 0;
      loginAttempts.set(ip, { count: nextCount, blockedUntil });
      res.status(401).json({
        error:
          nextCount >= 5
            ? 'PIN Kasir salah 5 kali. Akses diblokir sementara 10 menit.'
            : `PIN Kasir salah. Sisa percobaan: ${5 - nextCount}.`,
      });
      return;
    }

    loginAttempts.delete(ip);
    // Always issue CASHIER role token on /api/cashier/login so kasir login cannot access Admin Portal
    const token = signSessionToken({
      role: 'CASHIER',
      adminName: cashierLabel,
      exp: now + 12 * 60 * 60 * 1000,
    });

    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('https://'));

    res.cookie(CASHIER_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      authenticated: true,
      cashierName: cashierLabel,
      role: 'CASHIER',
      token,
    });
  });

  app.post('/api/cashier/logout', (req, res) => {
    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('https://'));
    res.clearCookie(CASHIER_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
    });
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
    });
    res.json({ ok: true });
  });

  app.get('/api/cashier/me', async (req, res) => {
    const session =
      getSessionFromRequest(req, CASHIER_COOKIE_NAME) || getSessionFromRequest(req, COOKIE_NAME);
    if (!session || (session.role !== 'CASHIER' && session.role !== 'ADMIN_SUPERVISOR')) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const storeSettings = await yegRepo.getSettings();
    const activeCashierName =
      (storeSettings.defaultCashierName || '').trim() || session.adminName || 'Kasir Workshop YEG';
    res.json({
      authenticated: true,
      cashierName: activeCashierName,
      role: session.role,
    });
  });

  // Downgrades any active Admin session into an isolated Cashier-only session when entering /kasir
  app.post('/api/cashier/enter-isolated', async (req, res) => {
    const session =
      getSessionFromRequest(req, CASHIER_COOKIE_NAME) || getSessionFromRequest(req, COOKIE_NAME);
    if (!session || (session.role !== 'CASHIER' && session.role !== 'ADMIN_SUPERVISOR')) {
      res.status(401).json({ error: 'Sesi belum aktif. Silakan login kasir terlebih dahulu.' });
      return;
    }

    const now = Date.now();
    const storeSettings = await yegRepo.getSettings();
    const cashierLabel =
      (storeSettings.defaultCashierName || '').trim() ||
      (session.role === 'ADMIN_SUPERVISOR' ? 'Kasir Workshop YEG' : session.adminName);
    const token = signSessionToken({
      role: 'CASHIER',
      adminName: cashierLabel,
      exp: now + 12 * 60 * 60 * 1000,
    });

    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('https://'));

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
    });

    res.cookie(CASHIER_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      authenticated: true,
      cashierName: cashierLabel,
      role: 'CASHIER',
      token,
    });
  });

  app.post('/api/cashier/checkout', requireCashierAuth, async (req, res) => {
    try {
      const result = await yegRepo.createCashierOrder(req.body || {});
      res.status(result.deduplicated ? 200 : 201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.' });
    }
  });

  app.get('/api/cashier/history', requireCashierAuth, async (_req, res) => {
    const items = await yegRepo.getCashierHistory();
    res.json({ items });
  });

  app.get('/api/cashier/waiting-orders', requireCashierAuth, async (_req, res) => {
    const items = await yegRepo.getCashierWaitingOrders();
    res.json({ items });
  });

  app.get('/api/cashier/lookup-barcode', requireCashierAuth, async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code.trim()) {
      res.status(400).json({ error: 'Kode barcode atau Order ID wajib diisi.' });
      return;
    }
    const result = await yegRepo.lookupCashierBarcode(code);
    res.json({ result });
  });

  // =========================================================================
  // PROTECTED ADMIN API ENDPOINTS
  // =========================================================================
  app.get('/api/admin/dashboard', requireAdminAuth, async (_req, res) => {
    const summary = await yegRepo.getDashboardSummary();
    res.json(summary);
  });

  app.get('/api/admin/orders', requireAdminAuth, async (_req, res) => {
    const items = await yegRepo.getPublicOrders();
    res.json({ items });
  });

  app.patch('/api/admin/orders/:id', requireAdminAuth, async (req, res) => {
    const updated = await yegRepo.updatePublicOrder(String(req.params.id), req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Pesanan publik tidak ditemukan.' });
      return;
    }
    res.json({ order: updated });
  });

  app.post('/api/admin/cashier/checkout', requireAdminAuth, async (req, res) => {
    try {
      const result = await yegRepo.createCashierOrder(req.body || {});
      res.status(result.deduplicated ? 200 : 201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.' });
    }
  });

  app.get('/api/admin/cashier/history', requireAdminAuth, async (_req, res) => {
    const items = await yegRepo.getCashierHistory();
    res.json({ items });
  });

  app.get('/api/admin/payments', requireAdminAuth, async (_req, res) => {
    const items = await yegRepo.getPayments();
    res.json({ items });
  });

  app.patch('/api/admin/payments/:id', requireAdminAuth, async (req, res) => {
    const status = req.body?.status;
    if (!status) {
      res.status(400).json({ error: 'Status pembayaran wajib diisi.' });
      return;
    }
    const updated = await yegRepo.verifyPayment(
      String(req.params.id),
      status,
      req.body?.verifiedBy || 'Mochamad Ridhwan M.'
    );
    if (!updated) {
      res.status(404).json({ error: 'Data pembayaran tidak ditemukan.' });
      return;
    }
    res.json({ payment: updated });
  });

  app.get('/api/admin/production', requireAdminAuth, async (_req, res) => {
    const items = await yegRepo.getProductionQueue();
    res.json({ items });
  });

  app.patch('/api/admin/production/:id', requireAdminAuth, async (req, res) => {
    const stage = req.body?.stage;
    if (!stage) {
      res.status(400).json({ error: 'Tahap produksi wajib diisi.' });
      return;
    }
    const updated = await yegRepo.updateProductionStage(
      String(req.params.id),
      stage,
      req.body?.notes
    );
    if (!updated) {
      res.status(404).json({ error: 'Antrean produksi tidak ditemukan.' });
      return;
    }
    res.json({ item: updated });
  });

  app.get('/api/admin/catalog/preview', requireAdminAuth, async (_req, res) => {
    const [categories, products, addons] = await Promise.all([
      yegRepo.getCategories(true),
      yegRepo.getProducts(true),
      yegRepo.getAddons(true),
    ]);
    res.json({ categories, products, addons });
  });

  app.post('/api/admin/catalog/products', requireAdminAuth, async (req, res) => {
    try {
      const saved = await yegRepo.upsertProduct(req.body);
      res.json({ product: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan produk.' });
    }
  });

  app.post('/api/admin/catalog/addons', requireAdminAuth, async (req, res) => {
    try {
      const saved = await yegRepo.upsertAddon(req.body);
      res.json({ addon: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan add-on.' });
    }
  });

  app.post('/api/admin/catalog/refresh', requireAdminAuth, async (_req, res) => {
    const result = await yegRepo.refreshCache();
    res.json(result);
  });

  app.get('/api/admin/reports', requireAdminAuth, async (_req, res) => {
    const summary = await yegRepo.getReportsSummary();
    res.json(summary);
  });

  app.patch('/api/admin/settings', requireAdminAuth, async (req, res) => {
    const updated = await yegRepo.updateSettings(req.body || {});
    res.json(updated);
  });

  app.post('/api/ai/admin-analyze', requireAdminAuth, async (req, res) => {
    try {
      const [ordersWaiting, ordersCashier, production] = await Promise.all([
        yegRepo.getPublicOrders(),
        yegRepo.getCashierHistory(),
        yegRepo.getProductionQueue(),
      ]);
      const analysis = await analyzeProductionWithAi({
        question: req.body?.question,
        ordersWaiting,
        ordersCashier,
        production,
      });
      res.json(analysis);
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Analis AI gagal memproses data produksi saat ini.',
      });
    }
  });

  // =========================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SPA FALLBACK
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YEGShop full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start YEGShop server:', err);
  process.exit(1);
});
