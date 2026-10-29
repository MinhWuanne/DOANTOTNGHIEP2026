
import { useCallback, useEffect, useState } from "react";
import {
  getFranchiseAuth,
  getFranchiseNetworkStats,
  getFranchiseWalletBalance,
  type FranchiseNetworkStats,
  type FranchiseWalletBalance,
} from "../../services/api/franchise-dashboard.api";
import "./FranchiseHomePage.css";

function formatNumber(value: number | string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN").format(number);
}

function formatMoney(value: number | string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return (
    new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 2,
    }).format(number) + " ₫"
  );
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const messages: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Phiên đăng nhập không hợp lệ.",
    INVALID_API_RESPONSE: "Máy chủ trả về dữ liệu không hợp lệ.",
    INVALID_FRANCHISE_ACCOUNT: "Tài khoản không thuộc nền tảng Franchise.",
    ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản Franchise.",
    WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  };

  return messages[error.message] ?? error.message;
}

function FranchiseHomePage() {
  const [network, setNetwork] =
    useState<FranchiseNetworkStats | null>(null);

  const [wallet, setWallet] =
    useState<FranchiseWalletBalance | null>(null);

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    setNetworkError(null);
    setWalletError(null);
    setWalletMissing(false);

    try {
      const auth = await getFranchiseAuth();

      const [networkResult, walletResult] = await Promise.allSettled([
        getFranchiseNetworkStats(auth.accountId),
        getFranchiseWalletBalance(auth.accountId),
      ]);

      if (networkResult.status === "fulfilled") {
        setNetwork(networkResult.value);
      } else {
        setNetwork(null);
        setNetworkError(
          getErrorMessage(networkResult.reason),
        );
      }

      if (walletResult.status === "fulfilled") {
        setWallet(walletResult.value);
      } else {
        setWallet(null);

        const message = getErrorMessage(walletResult.reason);

        if (message === "WALLET_NOT_FOUND") {
          setWalletMissing(true);
        } else {
          setWalletError(message);
        }
      }
    } catch (error) {
      setAuthError(getErrorMessage(error));
      setNetwork(null);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="franchise-dashboard">
      <header className="franchise-dashboard-header">
        <div>
          <div className="franchise-eyebrow">
            ICONDENIM · FRANCHISE PORTAL
          </div>

          <h1>Tổng quan</h1>

          <p>
            Theo dõi mạng lưới, kết quả hoạt động và tình hình ví
            Franchise của bạn.
          </p>
        </div>

        <button
          type="button"
          className="franchise-refresh-button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Đang tải..." : "Làm mới dữ liệu"}
        </button>
      </header>

      {authError && (
        <section className="franchise-alert franchise-alert-error">
          <strong>Không thể tải Tổng quan</strong>
          <p>{authError}</p>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            Thử lại
          </button>
        </section>
      )}

      {!authError && (
        <>
          <section className="franchise-welcome">
            <div>
              <span className="franchise-welcome-label">
                FRANCHISE DASHBOARD
              </span>

              <h2>Chào mừng trở lại!</h2>

              <p>
                Dữ liệu được cập nhật từ hệ thống. Các chỉ số sẽ
                hiển thị sau khi tải thành công.
              </p>
            </div>

            <div
              className="franchise-welcome-mark"
              aria-hidden="true"
            >
              ID
            </div>
          </section>

          <section className="franchise-section">
            <div className="franchise-section-heading">
              <div>
                <h2>Mạng lưới của bạn</h2>
                <p>
                  Thống kê tuyến dưới theo dữ liệu hệ thống.
                </p>
              </div>
            </div>

            {networkError && (
              <div className="franchise-alert franchise-alert-warning">
                <strong>Chưa tải được dữ liệu mạng lưới</strong>
                <p>{networkError}</p>
              </div>
            )}

            <div className="franchise-stat-grid">
              <article className="franchise-stat-card">
                <div className="franchise-stat-topline">
                  <span className="franchise-stat-icon">01</span>
                  <span className="franchise-stat-caption">
                    TRỰC TIẾP
                  </span>
                </div>

                <p className="franchise-stat-label">
                  Tuyến dưới trực tiếp
                </p>

                <div className="franchise-stat-value">
                  {loading
                    ? "..."
                    : network
                      ? formatNumber(network.directDownline)
                      : "—"}
                </div>

                <p className="franchise-stat-description">
                  Tài khoản được giới thiệu trực tiếp
                </p>
              </article>

              <article className="franchise-stat-card">
                <div className="franchise-stat-topline">
                  <span className="franchise-stat-icon">02</span>
                  <span className="franchise-stat-caption">
                    TOÀN MẠNG LƯỚI
                  </span>
                </div>

                <p className="franchise-stat-label">
                  Tổng tuyến dưới
                </p>

                <div className="franchise-stat-value">
                  {loading
                    ? "..."
                    : network
                      ? formatNumber(network.totalDownline)
                      : "—"}
                </div>

                <p className="franchise-stat-description">
                  Bao gồm các cấp trong mạng lưới
                </p>
              </article>

              <article className="franchise-stat-card">
                <div className="franchise-stat-topline">
                  <span className="franchise-stat-icon">03</span>
                  <span className="franchise-stat-caption">
                    ĐƠN HÀNG
                  </span>
                </div>

                <p className="franchise-stat-label">
                  Đơn đủ điều kiện
                </p>

                <div className="franchise-stat-value">
                  {loading
                    ? "..."
                    : network
                      ? formatNumber(network.totalDownlineOrders)
                      : "—"}
                </div>

                <p className="franchise-stat-description">
                  Đơn trong mạng lưới đủ điều kiện ghi nhận
                </p>
              </article>

              <article className="franchise-stat-card franchise-stat-card-highlight">
                <div className="franchise-stat-topline">
                  <span className="franchise-stat-icon">04</span>
                  <span className="franchise-stat-caption">
                    DOANH THU ĐỦ ĐIỀU KIỆN
                  </span>
                </div>

                <p className="franchise-stat-label">
                  Doanh thu ghi nhận từ mạng lưới
                </p>

                <div className="franchise-stat-value franchise-stat-money">
                  {loading
                    ? "..."
                    : network
                      ? formatMoney(network.totalDownlineRevenue)
                      : "—"}
                </div>

                <p className="franchise-stat-description">
                  Không đại diện cho toàn bộ doanh thu bán hàng
                </p>
              </article>
            </div>
          </section>

          <section className="franchise-section">
            <div className="franchise-section-heading">
              <div>
                <h2>Ví Franchise</h2>
                <p>
                  Số dư và phần số dư đang được giữ lại.
                </p>
              </div>
            </div>

            {walletError && (
              <div className="franchise-alert franchise-alert-warning">
                <strong>Chưa tải được thông tin ví</strong>
                <p>{walletError}</p>
              </div>
            )}

            {walletMissing && (
              <div className="franchise-alert franchise-alert-neutral">
                <strong>Ví chưa được khởi tạo</strong>
                <p>
                  Hệ thống chưa tìm thấy ví cho tài khoản này.
                  Dashboard không tự tạo ví.
                </p>
              </div>
            )}

            <div className="franchise-wallet-grid">
              <article className="franchise-wallet-card">
                <span>Số dư ví</span>
                <strong>
                  {loading
                    ? "..."
                    : wallet
                      ? formatMoney(wallet.balance)
                      : "—"}
                </strong>
                <p>Tổng số dư hiện có trong ví</p>
              </article>

              <article className="franchise-wallet-card">
                <span>Số dư giữ chỗ</span>
                <strong>
                  {loading
                    ? "..."
                    : wallet
                      ? formatMoney(wallet.reservedBalance)
                      : "—"}
                </strong>
                <p>Phần số dư đang được giữ lại</p>
              </article>

              <article className="franchise-wallet-card franchise-wallet-card-available">
                <span>Số dư khả dụng</span>
                <strong>
                  {loading
                    ? "..."
                    : wallet
                      ? formatMoney(wallet.availableBalance)
                      : "—"}
                </strong>
                <p>Số dư có thể sử dụng theo quy tắc hệ thống</p>
              </article>
            </div>
          </section>

          <footer className="franchise-dashboard-footer">
            <span>ICONDENIM</span>
            <span>FRANCHISE MANAGEMENT</span>
          </footer>
        </>
      )}
    </main>
  );
}

export default FranchiseHomePage;
