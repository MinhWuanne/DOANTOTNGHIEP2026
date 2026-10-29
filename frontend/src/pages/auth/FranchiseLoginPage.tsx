
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getAccessToken,
  saveAuthSession,
} from "../../utils/auth";

import {
  loginFranchise,
} from "../../services/api/auth.api";

import type {
  LoginInput,
} from "../../services/api/auth.api";

import "./FranchiseLoginPage.css";

function FranchiseLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = getAccessToken("FRANCHISE");

    if (accessToken) {
      navigate("/franchise", {
        replace: true,
      });
      return;
    }

    setCheckingSession(false);
  }, [navigate]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Chỉ kiểm tra phiên FRANCHISE.
      const accessToken = getAccessToken("FRANCHISE");

      if (accessToken) {
        navigate("/franchise", {
          replace: true,
        });
        return;
      }

      const input: LoginInput = {
        email: identifier.trim(),
        password,
      };

      const result = await loginFranchise(input);

      saveAuthSession(result.accessToken, "FRANCHISE");

      navigate("/franchise", {
        replace: true,
      });
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

  if (checkingSession) {
    return (
      <main className="franchise-login-loading">
        <span className="franchise-login-spinner" />
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </main>
    );
  }

  return (
    <main className="franchise-login-page">
      <div className="franchise-login-shell">
        {/* Brand Panel */}
        <section
          className="franchise-login-brand"
          aria-label="Giới thiệu IconDenim Franchise"
        >
          <img
            className="franchise-login-brand-image"
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85"
            alt="Không gian cửa hàng thời trang"
          />

          <div className="franchise-login-brand-shade" />

          <Link
            to="/"
            className="franchise-login-logo"
            aria-label="IconDenim - Trang chủ"
          >
            ICON<span>DENIM</span>
          </Link>

          <div className="franchise-login-brand-copy">
            <p className="franchise-login-eyebrow">
              PARTNER PORTAL / ICONDENIM
            </p>

            <h1>
              CÙNG NHAU
              <br />
              <span>KIẾN TẠO</span>
              <br />
              HÀNH TRÌNH.
            </h1>

            <p>
              Kết nối hệ thống. Phát triển mạng lưới.
              Đồng hành cùng IconDenim trên chặng đường phía trước.
            </p>

            <div className="franchise-login-brand-footer">
              <span>YOUR BUSINESS. OUR JOURNEY.</span>
              <span>01 — 03</span>
            </div>
          </div>
        </section>

        {/* Login Panel */}
        <section className="franchise-login-panel">
          <div className="franchise-login-panel-top">
            <Link to="/" className="franchise-login-back">
              <span aria-hidden="true">←</span>
              VỀ TRANG CHỦ
            </Link>

            <span className="franchise-login-status">
              <span />
              PARTNER ACCESS
            </span>
          </div>

          <div className="franchise-login-form-wrapper">
            <p className="franchise-login-eyebrow">
              WELCOME BACK
            </p>

            <h2>Chào mừng trở lại.</h2>

            <p className="franchise-login-subtitle">
              Đăng nhập vào không gian quản lý dành riêng cho đối tác
              Franchise của IconDenim.
            </p>

            <form
              className="franchise-login-form"
              onSubmit={handleSubmit}
            >
              <div className="franchise-login-field">
                <label htmlFor="identifier">
                  Email hoặc số điện thoại
                </label>

                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Nhập thông tin đăng nhập"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="franchise-login-field">
                <div className="franchise-login-label-row">
                  <label htmlFor="password">
                    Mật khẩu
                  </label>
                </div>

                <div className="franchise-login-password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="franchise-login-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Ẩn mật khẩu"
                        : "Hiện mật khẩu"
                    }
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? "ẨN" : "HIỆN"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="franchise-login-error"
                  role="alert"
                  aria-live="polite"
                >
                  <span className="franchise-login-error-icon">
                    !
                  </span>

                  <div>
                    <strong>Không thể đăng nhập</strong>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="franchise-login-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "ĐANG XÁC THỰC..."
                    : "ĐĂNG NHẬP TÀI KHOẢN"}
                </span>

                {!loading && (
                  <span
                    className="franchise-login-submit-arrow"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                )}

                {loading && (
                  <span className="franchise-login-button-spinner" />
                )}
              </button>
            </form>

            <div className="franchise-login-security">
              <span aria-hidden="true">◇</span>
              <p>
                Khu vực truy cập dành riêng cho tài khoản Franchise.
                Vui lòng không chia sẻ thông tin đăng nhập.
              </p>
            </div>
          </div>

          <footer className="franchise-login-footer">
            <span>© ICONDENIM</span>
            <span>PARTNER PORTAL</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default FranchiseLoginPage;
