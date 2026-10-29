
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";

import DemoClockProvider from "./context/DemoClockContext";
import MockBankPage from "./pages/mockbank/MockBankPage";

import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/admin/products/ProductsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

import FranchiseLoginPage from "./pages/auth/FranchiseLoginPage";
import FranchiseLayout from "./layouts/FranchiseLayout";
import FranchiseCommissionPage from "./pages/franchise/FranchiseCommissionPage";
import FranchiseProfilePage from "./pages/franchise/FranchiseProfilePage";

import AdminLoginPage from "./pages/auth/AdminLoginPage";

import MemberHomePage from "./pages/member/MemberHomePage";
import MemberCartPage from "./pages/member/MemberCartPage";
import MemberCheckoutPage from "./pages/member/MemberCheckoutPage";
import StorefrontLayout from "./layouts/StorefrontLayout";

import ProductDetailPage from "./pages/product-detail/ProductDetailPage";

import FranchiseHomePage from "./pages/franchise/FranchiseHomePage";
import FranchiseNetworkPage from "./pages/franchise/FranchiseNetworkPage";
import FranchiseWalletPage from "./pages/franchise/FranchiseWalletPage";

import AdminDashboardPage from "./pages/admin/dashboard/AdminDashboardPage";

import AdminProductsPage from "./pages/admin/products/AdminProductsPage";
import AdminProductDetailPage from "./pages/admin/products/AdminProductDetailPage";
import AdminCategoriesPage from "./pages/admin/categories/AdminCategoriesPage";


import AdminManagementPage from "./pages/admin/admins/AdminManagementPage";
import AdminInventoryPage from "./pages/admin/inventory/AdminInventoryPage";
import AdminInventoryReceiptPage from "./pages/admin/inventory/AdminInventoryReceiptPage";
import AdminInventoryIssuePage from "./pages/admin/inventory/AdminInventoryIssuePage";

import AdminMembersPage from "./pages/admin/members/AdminMembersPage";
import AdminFranchisesPage from "./pages/admin/franchises/AdminFranchisesPage";
import AdminFranchisePerformancePage from "./pages/admin/franchise-performance/AdminFranchisePerformancePage";
import AdminFranchiseAnalyticsPage from "./pages/admin/franchise-performance/AdminFranchiseAnalyticsPage";
import AdminFranchiseRankingPage from "./pages/admin/franchise-performance/AdminFranchiseRankingPage";

import AdminOrdersPage from "./pages/admin/orders/AdminOrdersPage";
import AdminOrderProcessingPage from "./pages/admin/orders/AdminOrderProcessingPage";

import AdminPaymentsPage from "./pages/admin/payments/AdminPaymentsPage";
import AdminCommissionsPage from "./pages/admin/commissions/AdminCommissionsPage";

import AdminWalletsPage from "./pages/admin/wallets/AdminWalletsPage";
import AdminFinancialAdjustmentsPage from "./pages/admin/financial-adjustments/AdminFinancialAdjustmentsPage";
import AdminMemberSupportPage from "./pages/admin/member-support/AdminMemberSupportPage";

import AdminWithdrawalsPage from "./pages/admin/withdrawals/AdminWithdrawalsPage";

import AdminReturnsPage from "./pages/admin/returns/AdminReturnsPage";
import MemberReturnsPage from "./pages/member/MemberReturnsPage";
import MemberWalletPage from "./pages/member/MemberWalletPage";

import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboardPage from "./pages/super-admin/dashboard/SuperAdminDashboardPage";
function App() {
  return (
    <BrowserRouter>
      <DemoClockProvider>
        <Routes>
          <Route
            path="/"
            element={
              <StorefrontLayout>
                <HomePage />
              </StorefrontLayout>
            }
          />

          {/* MockBank - ngân hàng mô phỏng độc lập */}
          <Route
            path="/mockbank"
            element={<MockBankPage />}
          />


          {/* Cổng đăng nhập MEMBER */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          {/* Cổng đăng nhập FRANCHISE */}
          <Route
            path="/franchise/login"
            element={<FranchiseLoginPage />}
          />


          {/* Cổng đăng nhập quản trị */}
          <Route
            path="/qtv"
            element={<AdminLoginPage />}
          />

          {/* Khu vực MEMBER */}
          <Route
            path="/member"
            element={
              <ProtectedRoute allowedRoles={["MEMBER"]}>
                <StorefrontLayout>
                  <MemberHomePage />
                </StorefrontLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/cart"
            element={
              <ProtectedRoute allowedRoles={["MEMBER"]}>
                <StorefrontLayout>
                  <MemberCartPage />
                </StorefrontLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/checkout"
            element={
              <ProtectedRoute allowedRoles={["MEMBER"]}>
                <StorefrontLayout>
                  <MemberCheckoutPage />
                </StorefrontLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/returns"
            element={
              <ProtectedRoute allowedRoles={["MEMBER"]}>
                <StorefrontLayout>
                  <MemberReturnsPage />
                </StorefrontLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/wallet"
            element={
              <ProtectedRoute allowedRoles={["MEMBER"]}>
                <StorefrontLayout>
                  <MemberWalletPage />
                </StorefrontLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <StorefrontLayout>
                <ProductsPage />
              </StorefrontLayout>
            }
          />

          <Route
            path="/products/:slug"
            element={
              <StorefrontLayout>
                <ProductDetailPage />
              </StorefrontLayout>
            }
          />

          {/* KHU VỰC FRANCHISE */}
          <Route
            path="/franchise"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE"]}>
                <FranchiseLayout>
                  <FranchiseHomePage />
                </FranchiseLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/franchise/network"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE"]}>
                <FranchiseLayout>
                  <FranchiseNetworkPage />
                </FranchiseLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/franchise/wallet"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE"]}>
                <FranchiseLayout>
                  <FranchiseWalletPage />
                </FranchiseLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/franchise/commission"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE"]}>
                <FranchiseLayout>
                  <FranchiseCommissionPage />
                </FranchiseLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/franchise/profile"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE"]}>
                <FranchiseLayout>
                  <FranchiseProfilePage />
                </FranchiseLayout>
              </ProtectedRoute>
            }
          />

          {/* ================================================== */}
          {/* KHU VỰC ADMIN - CHỈ ADMIN                        */}
          {/* ================================================== */}

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Products */}
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminProductsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/products/:id"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminProductDetailPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminCategoriesPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory */}
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminInventoryPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/inventory/receipts"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminInventoryReceiptPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/inventory/issues"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminInventoryIssuePage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Members */}
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminMembersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Franchises */}
          <Route
            path="/admin/franchises"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminFranchisesPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Franchise Performance */}
          <Route
            path="/admin/franchise-performance"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminFranchisePerformancePage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/franchise-performance/analytics"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminFranchiseAnalyticsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/franchise-performance/ranking"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminFranchiseRankingPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Orders */}
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminOrdersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders/processing"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminOrderProcessingPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Payments */}
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminPaymentsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Commissions */}
          <Route
            path="/admin/commissions"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminCommissionsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Wallets */}
          <Route
            path="/admin/wallets"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminWalletsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Financial Adjustments */}
          <Route
            path="/admin/financial-adjustments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminFinancialAdjustmentsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Withdrawals */}
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminWithdrawalsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Xử lý khiếu nại */}
          <Route
            path="/admin/member-support"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminMemberSupportPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/member-support/payments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminMemberSupportPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/member-support/returns"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminMemberSupportPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/member-support/feedback"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminMemberSupportPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Return / Refund */}
          <Route
            path="/admin/returns"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminReturnsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ================================================== */}
          {/* KHU VỰC SUPER ADMIN                               */}
          {/* ================================================== */}

          <Route
            path="/sadmin"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <SuperAdminLayout>
                  <SuperAdminDashboardPage />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sadmin/admins"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <SuperAdminLayout>
                  <AdminManagementPage />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </DemoClockProvider>
    </BrowserRouter>
  );
}

export default App;
