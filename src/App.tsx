/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CustomPixelCursor } from './components/CustomPixelCursor.tsx';
import { ScrollMotionTracker } from './components/MotionPrimitives.tsx';
import { CashierProvider } from './context/CashierContext.tsx';
import { StoreProvider } from './context/StoreContext.tsx';
import { AboutYegPage } from './pages/AboutYegPage.tsx';
import { AdminAddonEditPage } from './pages/AdminAddonEditPage.tsx';
import { AdminCashierHistoryPage } from './pages/AdminCashierHistoryPage.tsx';
import { AdminCashierOrderDetailPage } from './pages/AdminCashierOrderDetailPage.tsx';
import { AdminCatalogAddonsPage } from './pages/AdminCatalogAddonsPage.tsx';
import { AdminCatalogProductsPage } from './pages/AdminCatalogProductsPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { AdminOrderDetailPage } from './pages/AdminOrderDetailPage.tsx';
import { AdminOrdersPage } from './pages/AdminOrdersPage.tsx';
import { AdminPaymentDetailPage } from './pages/AdminPaymentDetailPage.tsx';
import { AdminPaymentsPage } from './pages/AdminPaymentsPage.tsx';
import { AdminProductEditPage } from './pages/AdminProductEditPage.tsx';
import { AdminProductionPage } from './pages/AdminProductionPage.tsx';
import { AdminReportsPage } from './pages/AdminReportsPage.tsx';
import { AdminSettingsPage } from './pages/AdminSettingsPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CashierHeldOrdersPage } from './pages/CashierHeldOrdersPage.tsx';
import { CashierHistoryDetailPage } from './pages/CashierHistoryDetailPage.tsx';
import { CashierHistoryStandalonePage } from './pages/CashierHistoryStandalonePage.tsx';
import { CashierLoginPage } from './pages/CashierLoginPage.tsx';
import { CashierPaymentPage } from './pages/CashierPaymentPage.tsx';
import { CashierPosPage } from './pages/CashierPosPage.tsx';
import { CashierProductConfigPage } from './pages/CashierProductConfigPage.tsx';
import { CashierScanPage } from './pages/CashierScanPage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { OrderSuccessPage } from './pages/OrderSuccessPage.tsx';
import { OrderTrackingPage } from './pages/OrderTrackingPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';

function getStructuralNavigationKey(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const structuralKeys = ['tab', 'category', 'stage', 'source', 'status']
    .map((key) => `${key}=${params.get(key) || ''}`)
    .join('&');
  return `${pathname}?${structuralKeys}`;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  const prevStructuralKeyRef = useRef(getStructuralNavigationKey(pathname, search));

  useEffect(() => {
    const nextStructuralKey = getStructuralNavigationKey(pathname, search);
    const prevKey = prevStructuralKeyRef.current;
    prevStructuralKeyRef.current = nextStructuralKey;

    if (nextStructuralKey === prevKey) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
  }, [pathname, search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ScrollMotionTracker />
      <CustomPixelCursor />
      <StoreProvider>
        <CashierProvider>
          <Routes>
            {/* Public Storefront Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/category/:slug" element={<CatalogPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="/status" element={<OrderTrackingPage />} />
            <Route path="/about" element={<AboutYegPage />} />

            {/* Standalone Isolated Cashier POS Routes */}
            <Route path="/kasir/login" element={<CashierLoginPage />} />
            <Route path="/kasir" element={<CashierPosPage />} />
            <Route path="/kasir/scan" element={<CashierScanPage />} />
            <Route path="/kasir/produk/:slug" element={<CashierProductConfigPage />} />
            <Route path="/kasir/bayar" element={<CashierPaymentPage />} />
            <Route path="/kasir/ditahan" element={<CashierHeldOrdersPage />} />
            <Route path="/kasir/riwayat" element={<CashierHistoryStandalonePage />} />
            <Route path="/kasir/riwayat/:orderId" element={<CashierHistoryDetailPage />} />

            {/* Admin Portal Routes (All Features & Details Separated) */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="/admin/cashier" element={<Navigate to="/kasir" replace />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/payments/:paymentId" element={<AdminPaymentDetailPage />} />
            <Route path="/admin/production" element={<AdminProductionPage />} />
            <Route path="/admin/cashier/history" element={<AdminCashierHistoryPage />} />
            <Route
              path="/admin/cashier/history/:orderId"
              element={<AdminCashierOrderDetailPage />}
            />
            <Route path="/admin/catalog" element={<Navigate to="/admin/catalog/products" replace />} />
            <Route path="/admin/catalog/products" element={<AdminCatalogProductsPage />} />
            <Route
              path="/admin/catalog/products/:productId"
              element={<AdminProductEditPage />}
            />
            <Route path="/admin/catalog/addons" element={<AdminCatalogAddonsPage />} />
            <Route path="/admin/catalog/addons/:addonId" element={<AdminAddonEditPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </CashierProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
