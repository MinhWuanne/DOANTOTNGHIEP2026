
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAdminAccounts,
  type AdminAccount,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./SuperAdminDashboard.css";

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_LIST_FAILED":
      return "Không thể tải danh sách ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền xem dữ liệu quản trị.";

    default:
      return error;
  }
}

function SuperAdminDashboardPage() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      const accessToken = getAccessToken("SUPER_ADMIN");
      if (!accessToken) {
        if (!cancelled) {
          setError("Phiên đăng nhập đã hết hạn.");
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getAdminAccounts(
          accessToken,
        );

        if (!cancelled) {
          setAdmins(data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof Error) {
          setError(getErrorLabel(error.message));
        } else {
          setError("Không thể tải dữ liệu ADMIN.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalAdmins = admins.length;

  const activeAdmins = admins.filter(
    (admin) => admin.status === "ACTIVE",
  ).length;

  const disabledAdmins = admins.filter(
    (admin) => admin.status === "DISABLED",
  ).length;

  function renderKpiValue(
    value: number,
  ) {
    if (loading) {
      return "…";
    }

    if (error) {
      return "—";
    }

    return value;
  }

  return (
    <div className="sa-dashboard">
      <section className="sa-welcome">
        <div>
          <span className="sa-eyebrow">
            SUPER ADMINISTRATION
          </span>

          <h1>
            Tổng quan quản trị
          </h1>

          <p>
            Trung tâm kiểm soát tài khoản quản trị
            của hệ thống DenimEcommerce.
          </p>
        </div>

        <div className="sa-welcome-badge">
          <span className="sa-badge-dot" />
          SYSTEM ACCESS
        </div>
      </section>

      {error && (
        <section className="sa-dashboard-error">
          <strong>
            Không thể tải dữ liệu Dashboard
          </strong>

          <span>{error}</span>
        </section>
      )}

      <section className="sa-kpi-grid">
        <article className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">
              TỔNG ADMIN
            </span>

            <div className="sa-kpi-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 10v-2a4 4 0 0 0-3-3.87m-1-12a4 4 0 0 1 0 7.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <strong className="sa-kpi-value">
            {renderKpiValue(totalAdmins)}
          </strong>

          <span className="sa-kpi-description">
            Tài khoản ADMIN trong hệ thống
          </span>
        </article>

        <article className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">
              ĐANG HOẠT ĐỘNG
            </span>

            <div className="sa-kpi-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m5 12 4 4L19 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <strong className="sa-kpi-value">
            {renderKpiValue(activeAdmins)}
          </strong>

          <span className="sa-kpi-description">
            ADMIN có trạng thái ACTIVE
          </span>
        </article>

        <article className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">
              ĐANG BỊ KHÓA
            </span>

            <div className="sa-kpi-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="10"
                  width="16"
                  height="11"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 10V7a4 4 0 0 1 8 0v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <strong className="sa-kpi-value">
            {renderKpiValue(disabledAdmins)}
          </strong>

          <span className="sa-kpi-description">
            ADMIN đang ở trạng thái DISABLED
          </span>
        </article>

        <article className="sa-kpi-card sa-kpi-card-dark">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">
              QUYỀN TRUY CẬP
            </span>

            <div className="sa-kpi-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9.5 12 1.7 1.7 3.5-3.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <strong className="sa-kpi-value sa-kpi-value-small">
            SUPER ADMIN
          </strong>

          <span className="sa-kpi-description">
            Toàn quyền quản lý tài khoản ADMIN
          </span>
        </article>
      </section>

      <section className="sa-main-grid">
        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <span className="sa-panel-eyebrow">
                ADMINISTRATION
              </span>

              <h2>
                Quản lý tài khoản ADMIN
              </h2>
            </div>

            <button
              type="button"
              className="sa-text-button"
              onClick={() =>
                navigate("/sadmin/admins")
              }
            >
              Mở quản lý →
            </button>
          </div>

          <div className="sa-management-body">
            <div className="sa-management-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 10v-2a4 4 0 0 0-3-3.87m-1-12a4 4 0 0 1 0 7.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <strong>
                Kiểm soát đội ngũ quản trị
              </strong>

              <p>
                Tạo, xem và quản lý trạng thái các
                tài khoản ADMIN được cấp quyền vận
                hành hệ thống.
              </p>
            </div>
          </div>
        </article>

        <article className="sa-panel sa-security-panel">
          <div className="sa-panel-header">
            <div>
              <span className="sa-panel-eyebrow">
                SECURITY
              </span>

              <h2>
                Kiểm soát truy cập
              </h2>
            </div>
          </div>

          <div className="sa-security-list">
            <div className="sa-security-row">
              <div className="sa-security-row-icon">
                ✓
              </div>

              <div>
                <strong>
                  SUPER_ADMIN access
                </strong>

                <span>
                  Quyền truy cập hợp lệ
                </span>
              </div>

              <b>
                ACTIVE
              </b>
            </div>

            <div className="sa-security-row">
              <div className="sa-security-row-icon">
                ✓
              </div>

              <div>
                <strong>
                  ADMIN management
                </strong>

                <span>
                  Quản lý tài khoản ADMIN
                </span>
              </div>

              <b>
                ENABLED
              </b>
            </div>

            <div className="sa-security-row">
              <div className="sa-security-row-icon">
                ✓
              </div>

              <div>
                <strong>
                  Operational modules
                </strong>

                <span>
                  Không thuộc phạm vi SUPER_ADMIN
                </span>
              </div>

              <b>
                ISOLATED
              </b>
            </div>
          </div>
        </article>
      </section>

      <section className="sa-scope-panel">
        <div className="sa-scope-heading">
          <span className="sa-panel-eyebrow">
            ACCESS SCOPE
          </span>

          <h2>
            Phạm vi của SUPER ADMIN
          </h2>

          <p>
            SUPER_ADMIN chỉ tập trung vào tầng
            quản trị tài khoản và không tham gia
            vận hành nghiệp vụ ecommerce.
          </p>
        </div>

        <div className="sa-scope-grid">
          <div className="sa-scope-item included">
            <span>✓</span>

            <div>
              <strong>
                ADMIN Accounts
              </strong>

              <small>
                Quản lý tài khoản ADMIN
              </small>
            </div>
          </div>

          <div className="sa-scope-item excluded">
            <span>×</span>

            <div>
              <strong>
                Products
              </strong>

              <small>
                Không thuộc SUPER_ADMIN
              </small>
            </div>
          </div>

          <div className="sa-scope-item excluded">
            <span>×</span>

            <div>
              <strong>
                Orders & Payments
              </strong>

              <small>
                Không thuộc SUPER_ADMIN
              </small>
            </div>
          </div>

          <div className="sa-scope-item excluded">
            <span>×</span>

            <div>
              <strong>
                Members & Franchise
              </strong>

              <small>
                Không thuộc SUPER_ADMIN
              </small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SuperAdminDashboardPage;

