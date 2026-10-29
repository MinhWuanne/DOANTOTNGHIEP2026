
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getAuthRole } from "../../utils/auth";

type MenuIconProps = {
  children: ReactNode;
};

function MenuIcon({ children }: MenuIconProps) {
  return (
    <span className="admin-sidebar-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M6 4h12l2 4-2 13H6L4 8l2-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 4a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4 7 8 4 8-4M12 11v10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 20c.6-3.3 2.4-5 5.5-5s4.9 1.7 5.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 6.5a3 3 0 0 1 0 5.8M16 15c2.7.2 4.3 1.9 4.8 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FranchiseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12M12 12H6v3.5M12 12h6v3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M5 4h14v16H5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9h18M7 14h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CommissionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M7 17 17 7M8 8h.01M16 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7h13M15 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

function WithdrawalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M5 19 19 5M11 5h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M9 7H5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11a7 7 0 1 0 2-4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`admin-sidebar-chevron${open ? " open" : ""}`}
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ComingSoonSubmenuItemProps = {
  label: string;
};

function ComingSoonSubmenuItem({ label }: ComingSoonSubmenuItemProps) {
  return (
    <div
      className="admin-sidebar-submenu-link admin-sidebar-link-disabled"
      aria-disabled="true"
    >
      <span>{label}</span>
      <span className="admin-sidebar-coming-soon">Sắp tới</span>
    </div>
  );
}

function AdminSidebar() {
  const role = getAuthRole("ADMIN");
  const location = useLocation();

  const isProductsSection =
    location.pathname.startsWith("/admin/products") ||
    location.pathname.startsWith("/admin/categories");

  const isProductsPage = location.pathname.startsWith("/admin/products");
  const isCategoriesPage = location.pathname.startsWith("/admin/categories");
  const isInventorySection = location.pathname.startsWith("/admin/inventory");
  const isInventoryPage = location.pathname === "/admin/inventory";

  const isOrdersSection = location.pathname.startsWith("/admin/orders");

  const isFranchiseSection =
    location.pathname.startsWith("/admin/franchises") ||
    location.pathname.startsWith("/admin/franchise-performance");

  const isFranchiseManagementPage = location.pathname === "/admin/franchises";

  const isComplaintsSection =
    location.pathname.startsWith("/admin/member-support") ||
    location.pathname.startsWith("/admin/franchise-support");

  const isOrdersPage = location.pathname === "/admin/orders";

  const isOrderProcessingPage =
    location.pathname.startsWith("/admin/orders/processing");

  const isInventoryReceiptsPage =
    location.pathname.startsWith("/admin/inventory/receipts");

  const isInventoryIssuesPage =
    location.pathname.startsWith("/admin/inventory/issues");

  if (role === "SUPER_ADMIN") {
    return (
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-mark">D</div>
          <div className="admin-sidebar-brand-text">
            <strong>DENIM</strong>
            <span>ECOMMERCE</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section">
            <span className="admin-sidebar-section-title">QUẢN TRỊ</span>

            <NavLink
              to="/admin/admins"
              className={({ isActive }) =>
                `admin-sidebar-link${isActive ? " active" : ""}`
              }
            >
              <MenuIcon>
                <AdminIcon />
              </MenuIcon>
              <span>Quản lý ADMIN</span>
            </NavLink>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-sidebar-footer-label">QUYỀN TRUY CẬP</span>
          <strong>SUPER ADMIN</strong>
        </div>
      </aside>
    );
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-brand-mark">D</div>
        <div className="admin-sidebar-brand-text">
          <strong>DENIM</strong>
          <span>ECOMMERCE</span>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {/* TỔNG QUAN */}
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-title">TỔNG QUAN</span>

          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `admin-sidebar-link${isActive ? " active" : ""}`
            }
          >
            <MenuIcon>
              <DashboardIcon />
            </MenuIcon>
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* SẢN PHẨM */}
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-title">SẢN PHẨM</span>

          <div className={`admin-sidebar-menu-group${isProductsSection ? " open" : ""}`}>
            <NavLink
              to="/admin/products"
              className={`admin-sidebar-link admin-sidebar-parent${isProductsSection ? " active" : ""}`}
            >
              <MenuIcon>
                <ProductIcon />
              </MenuIcon>
              <span>Sản phẩm</span>
              <ChevronIcon open={isProductsSection} />
            </NavLink>

            <div className="admin-sidebar-submenu">
              <NavLink
                to="/admin/products"
                end
                className={({ isActive }) =>
                  `admin-sidebar-submenu-link${isProductsPage && isActive ? " active" : ""}`
                }
              >
                Danh sách sản phẩm
              </NavLink>

              <NavLink
                to="/admin/categories"
                end
                className={`admin-sidebar-submenu-link${isCategoriesPage ? " active" : ""}`}
              >
                Danh mục
              </NavLink>
            </div>
          </div>
        </div>

        {/* VẬN HÀNH */}
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-title">VẬN HÀNH</span>

          <div className={`admin-sidebar-menu-group${isInventorySection ? " open" : ""}`}>
            <NavLink
              to="/admin/inventory"
              className={`admin-sidebar-link admin-sidebar-parent${isInventorySection ? " active" : ""}`}
            >
              <MenuIcon>
                <InventoryIcon />
              </MenuIcon>
              <span>Kho hàng</span>
              <ChevronIcon open={isInventorySection} />
            </NavLink>

            <div className="admin-sidebar-submenu">
              <NavLink
                to="/admin/inventory"
                end
                className={`admin-sidebar-submenu-link${isInventoryPage ? " active" : ""}`}
              >
                Quản lý tồn kho
              </NavLink>

              <NavLink
                to="/admin/inventory/receipts"
                className={`admin-sidebar-submenu-link${isInventoryReceiptsPage ? " active" : ""}`}
              >
                Nhập hàng
              </NavLink>

              <NavLink
                to="/admin/inventory/issues"
                className={`admin-sidebar-submenu-link${isInventoryIssuesPage ? " active" : ""}`}
              >
                Xuất hàng
              </NavLink>
            </div>
          </div>

          {/* Quản lý thành viên */}
          <NavLink
            to="/admin/members"
            className={({ isActive }) =>
              `admin-sidebar-link${isActive ? " active" : ""}`
            }
          >
            <MenuIcon>
              <MembersIcon />
            </MenuIcon>
            <span>Quản lý thành viên</span>
          </NavLink>

          {/* Quản lý đại lý */}
          <div className={`admin-sidebar-menu-group${isFranchiseSection ? " open" : ""}`}>
            <NavLink
              to="/admin/franchises"
              className={`admin-sidebar-link admin-sidebar-parent${isFranchiseSection ? " active" : ""}`}
            >
              <MenuIcon>
                <FranchiseIcon />
              </MenuIcon>
              <span>Quản lý đại lý</span>
              <ChevronIcon open={isFranchiseSection} />
            </NavLink>

            <div className="admin-sidebar-submenu">
              <NavLink
                to="/admin/franchises"
                end
                className={`admin-sidebar-submenu-link${isFranchiseManagementPage ? " active" : ""}`}
              >
                Thông tin đại lý
              </NavLink>

              <NavLink
                to="/admin/franchise-performance"
                className={({ isActive }) =>
                  `admin-sidebar-submenu-link${isActive ? " active" : ""}`
                }
              >
                Quản lý hiệu suất
              </NavLink>
            </div>
          </div>


          {/* Xử lý khiếu nại */}
          <div className={`admin-sidebar-menu-group${isComplaintsSection ? " open" : ""}`}>
            <NavLink
              to="/admin/member-support"
              className={`admin-sidebar-link admin-sidebar-parent${isComplaintsSection ? " active" : ""}`}
            >
              <MenuIcon>
                <MembersIcon />
              </MenuIcon>
              <span>Xử lý khiếu nại</span>
              <ChevronIcon open={isComplaintsSection} />
            </NavLink>

            <div className="admin-sidebar-submenu">
              <NavLink
                to="/admin/member-support"
                end
                className={({ isActive }) =>
                  `admin-sidebar-submenu-link${isActive ? " active" : ""}`
                }
              >
                Khiếu nại thành viên
              </NavLink>

              <ComingSoonSubmenuItem label="Khiếu nại đại lý" />
              <ComingSoonSubmenuItem label="Chat trực tiếp" />
            </div>
          </div>

          {/* Đơn hàng */}
          <div className={`admin-sidebar-menu-group${isOrdersSection ? " open" : ""}`}>
            <NavLink
              to="/admin/orders"
              className={`admin-sidebar-link admin-sidebar-parent${isOrdersSection ? " active" : ""}`}
            >
              <MenuIcon>
                <OrdersIcon />
              </MenuIcon>
              <span>Đơn hàng</span>
              <ChevronIcon open={isOrdersSection} />
            </NavLink>

            <div className="admin-sidebar-submenu">
              <NavLink
                to="/admin/orders"
                end
                className={`admin-sidebar-submenu-link${isOrdersPage ? " active" : ""}`}
              >
                Quản lý đơn hàng
              </NavLink>

              <NavLink
                to="/admin/orders/processing"
                className={`admin-sidebar-submenu-link${isOrderProcessingPage ? " active" : ""}`}
              >
                Xử lý đơn hàng
              </NavLink>
            </div>
          </div>
        </div>

        {/* TÀI CHÍNH */}
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-title">TÀI CHÍNH</span>


            <NavLink
              to="/admin/payments"
              className={`admin-sidebar-link${location.pathname.startsWith("/admin/payments") ? " active" : ""}`}
            >
              <MenuIcon>
                <PaymentIcon />
              </MenuIcon>
              <span>Thanh toán</span>
            </NavLink>

            <NavLink
              to="/admin/commissions"
              className={`admin-sidebar-link${location.pathname.startsWith("/admin/commissions") ? " active" : ""}`}
            >
              <MenuIcon>
                <CommissionIcon />
              </MenuIcon>
              <span>Hoa hồng</span>
            </NavLink>

            <NavLink
              to="/admin/wallets"
              className={`admin-sidebar-link${location.pathname.startsWith("/admin/wallets") ? " active" : ""}`}
            >
              <MenuIcon>
                <WalletIcon />
              </MenuIcon>
              <span>Ví</span>
            </NavLink>

            <NavLink
              to="/admin/withdrawals"
              className={`admin-sidebar-link${location.pathname.startsWith("/admin/withdrawals") ? " active" : ""}`}
            >
              <MenuIcon>
                <WithdrawalIcon />
              </MenuIcon>
              <span>Rút tiền</span>
            </NavLink>

            <NavLink
              to="/admin/returns"
              className={({ isActive }) =>
                `admin-sidebar-link${isActive ? " active" : ""}`
              }
            >
              <MenuIcon>
                <ReturnIcon />
              </MenuIcon>
              <span>Return / Refund</span>
            </NavLink>
          </div>
      </nav>

      <div className="admin-sidebar-footer">
        <span className="admin-sidebar-footer-label">QUYỀN TRUY CẬP</span>
        <strong>ADMIN</strong>
      </div>
    </aside>
  );
}

export default AdminSidebar;
