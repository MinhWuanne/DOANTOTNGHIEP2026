
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  getAuthRole,
  clearAuthSession,
} from "../utils/auth";

import "./SuperAdminLayout.css";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

function SuperAdminLayout({
  children,
}: SuperAdminLayoutProps) {
  const navigate = useNavigate();
  const role = getAuthRole("SUPER_ADMIN");

  function handleLogout() {
    clearAuthSession("SUPER_ADMIN");
    navigate("/qtv", { replace: true });
  }

  return (
    <div className="sadmin-shell">
      <aside className="sadmin-sidebar">
        <div className="sadmin-brand">
          <div className="sadmin-brand-mark">
            D
          </div>

          <div className="sadmin-brand-text">
            <strong>DENIM</strong>
            <span>CONTROL CENTER</span>
          </div>
        </div>

        <div className="sadmin-section-label">
          SYSTEM
        </div>

        <nav className="sadmin-nav">
          <NavLink
            to="/sadmin"
            end
            className={({ isActive }) =>
              `sadmin-nav-item ${isActive ? "active" : ""
              }`
            }
          >
            <span className="sadmin-nav-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>Tổng quan</span>
          </NavLink>

          <NavLink
            to="/sadmin/admins"
            className={({ isActive }) =>
              `sadmin-nav-item ${isActive ? "active" : ""
              }`
            }
          >
            <span className="sadmin-nav-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 10v-2a4 4 0 0 0-3-3.87m-1-12a4 4 0 0 1 0 7.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>Quản lý ADMIN</span>
          </NavLink>
        </nav>

        <div className="sadmin-sidebar-bottom">
          <div className="sadmin-security-card">
            <div className="sadmin-security-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m9.5 12 1.7 1.7 3.5-3.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <strong>Protected Area</strong>
              <span>Quyền SUPER ADMIN</span>
            </div>
          </div>

          <button
            type="button"
            className="sadmin-logout"
            onClick={handleLogout}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M10 17l5-5-5-5m5 5H3m8-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="sadmin-main">
        <header className="sadmin-header">
          <div>
            <span className="sadmin-header-eyebrow">
              DENIM ECOMMERCE
            </span>

            <h2>
              Super Admin Control Center
            </h2>
          </div>

          <div className="sadmin-profile">
            <div className="sadmin-profile-status">
              <span />
              Online
            </div>

            <div className="sadmin-avatar">
              SA
            </div>

            <div className="sadmin-profile-info">
              <strong>
                Super Administrator
              </strong>

              <span>
                {role === "SUPER_ADMIN"
                  ? "SUPER_ADMIN"
                  : "Administrator"}
              </span>
            </div>
          </div>
        </header>

        <main className="sadmin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
