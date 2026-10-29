import { useNavigate } from "react-router-dom";
import {
  clearAuthSession,
  getAuthRole,
} from "../../utils/auth";

import DemoClock from "./DemoClock";

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 5H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M13 8l4 4-4 4M17 12H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminHeader() {
  const navigate = useNavigate();
  const role = getAuthRole("ADMIN");

  function handleLogout() {
    clearAuthSession("ADMIN");
    navigate("/qtv", { replace: true });
  }

  const roleLabel =
    role === "SUPER_ADMIN"
      ? "SUPER ADMIN"
      : "ADMIN";

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <div className="admin-header-title">
          <span className="admin-header-title-eyebrow">
            DENIM ECOMMERCE
          </span>

          <strong>Trang quản trị</strong>
        </div>
      </div>

      <div className="admin-header-right">
        <DemoClock />
        <div
          className={`admin-role-badge admin-role-${role === "SUPER_ADMIN" ? "super-admin" : "admin"}`}
        >
          <span
            className="admin-role-dot"
            aria-hidden="true"
          />

          <span>{roleLabel}</span>
        </div>

        <div
          className="admin-header-divider"
          aria-hidden="true"
        />

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
        >
          <span
            className="admin-logout-icon"
            aria-hidden="true"
          >
            <LogoutIcon />
          </span>

          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;