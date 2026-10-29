
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  getAccessToken,
  saveAuthSession,
} from "../../utils/auth";

import {
  loginMember,
} from "../../services/api/auth.api";

import type {
  LoginInput,
} from "../../services/api/auth.api";

import "./LoginPage.css";

function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const registered = (
    location.state as { registered?: boolean } | null
  )?.registered;

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const accessToken = getAccessToken("MEMBER");

    if (accessToken) {
      navigate("/member", { replace: true });
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
      // Chỉ kiểm tra phiên MEMBER, không ảnh hưởng vai trò khác.
      const accessToken = getAccessToken("MEMBER");

      if (accessToken) {
        navigate("/member", { replace: true });
        return;
      }

      const input: LoginInput = {
        email: identifier,
        password,
      };

      const result = await loginMember(input);

      saveAuthSession(result.accessToken, "MEMBER");

      navigate("/member", { replace: true });
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
      <main className="member-login-page">
        <div className="member-login-loading">
          <span className="member-login-spinner" />
          <p>Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="member-login-page">
      <div className="member-login-shell">
        <section className="member-login-brand">
          <a
            href="/"
            className="member-login-logo"
            aria-label="IconDenim - Trang chủ"
          >
            ICON<span>DENIM</span>
          </a>

          <div className="member-login-brand-content">
            <p className="member-login-eyebrow">
              YOUR STYLE. YOUR DENIM.
            </p>


            <h1 className="member-login-title">
              <span className="member-login-title-line">Phong cách</span>
              <span className="member-login-title-line">bắt đầu từ</span>
              <span className="member-login-title-line member-login-title-emphasis">
                chính bạn.
              </span>
            </h1>


            <p className="member-login-brand-description">
              Khám phá phong cách denim của riêng bạn
              cùng IconDenim.
            </p>
          </div>

          <div className="member-login-brand-footer">
            <span>ICON DENIM</span>
            <span>EST. IN DENIM</span>
          </div>
        </section>

        <section className="member-login-form-panel">
          <a
            href="/"
            className="member-login-mobile-logo"
            aria-label="IconDenim - Trang chủ"
          >
            ICON<span>DENIM</span>
          </a>

          <div className="member-login-form-container">
            <div className="member-login-heading">
              <p className="member-login-eyebrow">
                MEMBER ACCOUNT
              </p>

              <h2>Chào mừng trở lại</h2>

              <p>
                Đăng nhập để tiếp tục hành trình cùng
                IconDenim.
              </p>
            </div>

            {registered && (
              <div
                className="member-login-success"
                role="status"
              >
                Đăng ký thành công. Vui lòng đăng nhập.
              </div>
            )}

            <form
              className="member-login-form"
              onSubmit={handleSubmit}
            >
              <div className="member-login-field">
                <label htmlFor="identifier">
                  Email hoặc số điện thoại
                </label>

                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Nhập email hoặc số điện thoại"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="member-login-field">
                <label htmlFor="password">
                  Mật khẩu
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  className="member-login-error"
                  role="alert"
                >
                  <span className="member-login-error-icon">
                    !
                  </span>

                  <p>
                    Đăng nhập thất bại: {error}
                  </p>
                </div>
              )}

              <button
                className="member-login-submit"
                type="submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "ĐANG ĐĂNG NHẬP..."
                    : "ĐĂNG NHẬP"}
                </span>

                {!loading && (
                  <span
                    className="member-login-submit-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="member-login-divider">
              <span />
              <p>ICON DENIM</p>
              <span />
            </div>

            <p className="member-login-back">
              Chưa có tài khoản?{" "}
              <Link to="/register">
                Đăng ký ngay
              </Link>
            </p>

            <p className="member-login-back">
              Bạn chưa muốn đăng nhập?{" "}
              <a href="/">
                Tiếp tục mua sắm
              </a>
            </p>
          </div>

          <footer className="member-login-footer">
            <span>© IconDenim</span>
            <span>Denim made for you.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
