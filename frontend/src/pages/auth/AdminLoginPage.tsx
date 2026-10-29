
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { loginAdmin } from "../../services/api/admin-auth.api";
import { saveAuthSession } from "../../utils/auth";

import "./AdminLoginPage.css";

function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await loginAdmin({
        username: identifier,
        password,
      });

      const role = result.admin.role;

      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new Error("ADMIN_ACCESS_FORBIDDEN");
      }

      saveAuthSession(result.accessToken, role);

      if (role === "SUPER_ADMIN") {
        navigate("/sadmin");
        return;
      }

      navigate("/admin");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("LOGIN_FAILED");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="enterprise-login">
      <section className="enterprise-login__brand-panel">
        <div className="enterprise-login__brand-content">
          <div className="enterprise-login__brand">
            <div className="enterprise-login__logo">
              D
            </div>

            <div>
              <div className="enterprise-login__brand-name">
                DENIM
              </div>

              <div className="enterprise-login__brand-subtitle">
                ECOMMERCE
              </div>
            </div>
          </div>

          <div className="enterprise-login__hero">
            <span className="enterprise-login__line" />

            <p className="enterprise-login__eyebrow">
              MANAGEMENT PLATFORM
            </p>

            <h1>
              Vận hành hệ thống
              <br />
              <span>thông minh hơn.</span>
            </h1>

            <p className="enterprise-login__description">
              Trung tâm quản trị DenimEcommerce dành cho
              quản lý sản phẩm, đơn hàng, khách hàng,
              franchise và tài chính.
            </p>
          </div>

          <div className="enterprise-login__stats">
            <div>
              <strong>01</strong>
              <span>Centralized</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Management</span>
            </div>

            <div>
              <strong>100%</strong>
              <span>Control</span>
            </div>
          </div>
        </div>

        <div className="enterprise-login__panel-decoration">
          <span />
          <span />
          <span />
        </div>

        <div className="enterprise-login__panel-footer">
          <span>DENIMECOMMERCE</span>
          <span>ADMINISTRATION SYSTEM</span>
        </div>
      </section>

      <section className="enterprise-login__form-panel">
        <div className="enterprise-login__form-wrapper">
          <div className="enterprise-login__mobile-brand">
            <div className="enterprise-login__logo">
              D
            </div>

            <div>
              <div className="enterprise-login__brand-name">
                DENIM
              </div>

              <div className="enterprise-login__brand-subtitle">
                ECOMMERCE
              </div>
            </div>
          </div>

          <div className="enterprise-login__heading">
            <span>ADMIN PORTAL</span>

            <h2>Chào mừng trở lại</h2>

            <p>
              Đăng nhập vào tài khoản quản trị để tiếp tục.
            </p>
          </div>

          <form
            className="enterprise-login__form"
            onSubmit={handleSubmit}
          >
            <div className="enterprise-login__field">
              <label htmlFor="identifier">
                Tên đăng nhập hoặc Email
              </label>

              <div className="enterprise-login__input-wrapper">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M20 21a8 8 0 0 0-16 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>

                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  placeholder="Nhập tên đăng nhập hoặc email"
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="enterprise-login__field">
              <label htmlFor="password">
                Mật khẩu
              </label>

              <div className="enterprise-login__input-wrapper">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="enterprise-login__error">
                <span>!</span>

                <div>
                  <strong>Không thể đăng nhập</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              className="enterprise-login__submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="enterprise-login__spinner" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  Đăng nhập hệ thống
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="enterprise-login__security">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="m9 12 2 2 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span>
              Kết nối được bảo vệ bởi hệ thống xác thực
              DenimEcommerce
            </span>
          </div>

          <footer className="enterprise-login__copyright">
            © 2026 DenimEcommerce. All rights reserved.
          </footer>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
