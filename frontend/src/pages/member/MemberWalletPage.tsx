import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMemberProfile } from "../../services/api/auth.api";
import {
  getMemberWalletBalance,
  getMemberWalletTransactions,
  getMemberWithdrawalBankAccounts,
  createMemberWithdrawalRequest,
  type MemberWalletBalance,
  type MemberWalletTransaction,
  type MemberWithdrawalBankAccount,
  createMemberWalletTopUpInstruction,
  type MemberWalletTopUpInstruction,
} from "../../services/api/member-wallet.api";

import "./MemberWalletPage.css";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const transactionLabels: Record<string, string> = {
  TOP_UP: "Nạp tiền",
  COMMISSION: "Hoa hồng",
  ORDER_PAYMENT: "Thanh toán đơn hàng",
  WITHDRAWAL: "Rút tiền",
  REFUND: "Hoàn tiền",
  ADJUSTMENT: "Điều chỉnh số dư",
};

function formatCurrency(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return currencyFormatter.format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateFormatter.format(date);
}

function getTransactionLabel(type: string): string {
  return transactionLabels[type] ?? type;
}

function getTransactionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Không thể tải dữ liệu ví. Vui lòng thử lại.";
  }

  const messages: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
    PERSON_ID_NOT_FOUND: "Không tìm thấy thông tin tài khoản thành viên.",
    PROFILE_LOAD_FAILED: "Không thể tải hồ sơ thành viên.",
    WALLET_NOT_FOUND: "Tài khoản của bạn chưa có ví thành viên.",
    INVALID_API_RESPONSE: "Dữ liệu trả về không hợp lệ. Vui lòng thử lại.",
  };

  return (
    messages[error.message] ??
    "Không thể tải dữ liệu ví. Vui lòng thử lại."
  );
}

export default function MemberWalletPage() {
  const [balance, setBalance] = useState<MemberWalletBalance | null>(null);
  const [transactions, setTransactions] = useState<
    MemberWalletTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [memberAccountId, setMemberAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<
    MemberWithdrawalBankAccount[]
  >([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");

  const [topUpAmount, setTopUpAmount] = useState("");
  const [submittingTopUp, setSubmittingTopUp] = useState(false);
  const [topUpError, setTopUpError] = useState("");
  const [topUpInstruction, setTopUpInstruction] =
    useState<MemberWalletTopUpInstruction | null>(null);
  const [topUpCopySuccess, setTopUpCopySuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWallet() {
      setLoading(true);
      setError("");

      try {
        const profile = await getMemberProfile();

        if (cancelled) {
          return;
        }

        const memberAccount = profile.accounts.find(
          (account) => account.platform === "MEMBER",
        );

        if (!memberAccount) {
          throw new Error("MEMBER_ACCOUNT_NOT_FOUND");
        }

        const [walletBalance, walletTransactions, withdrawalBankAccounts] =
          await Promise.all([
            getMemberWalletBalance(memberAccount.id),
            getMemberWalletTransactions(memberAccount.id),
            getMemberWithdrawalBankAccounts(memberAccount.id),
          ]);

        if (cancelled) {
          return;
        }

        setMemberAccountId(memberAccount.id);
        setBalance(walletBalance);
        setTransactions(walletTransactions);
        setBankAccounts(withdrawalBankAccounts);

        setSelectedBankAccountId((current) => {
          if (withdrawalBankAccounts.some((account) => account.id === current)) {
            return current;
          }

          return withdrawalBankAccounts[0]?.id ?? "";
        });

        if (cancelled) {
          return;
        }

        setBalance(walletBalance);
        setTransactions(walletTransactions);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setBalance(null);
        setTransactions([]);
        setBankAccounts([]);
        setMemberAccountId("");
        setSelectedBankAccountId("");
        setError(getTransactionErrorMessage(loadError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWallet();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleReload() {
    setReloadKey((current) => current + 1);
  }

  async function handleWithdrawalSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setWithdrawalError("");
    setWithdrawalSuccess("");

    const amount = Number(withdrawalAmount);
    const availableBalance = Number(balance?.availableBalance ?? 0);

    if (!memberAccountId) {
      setWithdrawalError("Không tìm thấy tài khoản thành viên.");
      return;
    }

    if (!selectedBankAccountId) {
      setWithdrawalError("Vui lòng chọn tài khoản ngân hàng nhận tiền.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawalError("Số tiền rút phải lớn hơn 0.");
      return;
    }

    if (amount > availableBalance) {
      setWithdrawalError("Số tiền rút vượt quá số dư khả dụng.");
      return;
    }

    setSubmittingWithdrawal(true);

    try {
      const result = await createMemberWithdrawalRequest(memberAccountId, {
        bankAccountId: selectedBankAccountId,
        amount,
        note: withdrawalNote.trim() || undefined,
      });

      setWithdrawalSuccess(
        `Đã tạo yêu cầu rút tiền ${formatCurrency(result.amount)}. ` +
        `Mã yêu cầu: ${result.id}. Trạng thái: ${result.status}.`,
      );

      setWithdrawalAmount("");
      setWithdrawalNote("");
      handleReload();
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : "";

      const messages: Record<string, string> = {
        INVALID_AMOUNT: "Số tiền rút không hợp lệ.",
        INSUFFICIENT_AVAILABLE_BALANCE:
          "Số dư khả dụng không đủ. Vui lòng tải lại số dư.",
        INSUFFICIENT_BALANCE: "Số dư ví không đủ.",
        BANK_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản ngân hàng.",
        BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT:
          "Tài khoản ngân hàng không thuộc tài khoản của bạn.",
        INVALID_BANK_ACCOUNT_OWNER:
          "Tài khoản ngân hàng không hợp lệ để nhận tiền.",
        WALLET_NOT_FOUND: "Không tìm thấy ví thành viên.",
        AUTHORIZATION_REQUIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };

      setWithdrawalError(
        messages[errorCode] ??
        "Không thể tạo yêu cầu rút tiền. Vui lòng thử lại.",
      );
    } finally {
      setSubmittingWithdrawal(false);
    }
  }

  async function handleTopUpSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setTopUpError("");
    setTopUpCopySuccess(false);

    const amount = Number(topUpAmount);

    if (!memberAccountId) {
      setTopUpError("Không tìm thấy tài khoản thành viên.");
      return;
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setTopUpError("Số tiền nạp phải là số nguyên lớn hơn 0.");
      return;
    }

    setSubmittingTopUp(true);

    try {
      const instruction = await createMemberWalletTopUpInstruction(
        memberAccountId,
        { amount },
      );

      setTopUpInstruction(instruction);
      setTopUpAmount("");
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : "";

      const messages: Record<string, string> = {
        AUTHORIZATION_REQUIRED:
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        INVALID_AMOUNT: "Số tiền nạp không hợp lệ.",
        WALLET_NOT_FOUND: "Không tìm thấy ví thành viên.",
        SHOP_BANK_ACCOUNT_NOT_FOUND:
          "Hệ thống chưa cấu hình tài khoản ngân hàng nhận tiền.",
        MEMBER_ACCOUNT_NOT_FOUND:
          "Không tìm thấy tài khoản thành viên.",
      };

      setTopUpError(
        messages[errorCode] ??
        "Không thể tạo lệnh chuyển khoản. Vui lòng thử lại.",
      );
    } finally {
      setSubmittingTopUp(false);
    }
  }

  async function handleCopyTopUpContent() {
    if (!topUpInstruction?.transferContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        topUpInstruction.transferContent,
      );
      setTopUpCopySuccess(true);
      setTopUpError("");
    } catch {
      setTopUpCopySuccess(false);
      setTopUpError(
        "Không thể sao chép tự động. Vui lòng chọn và sao chép nội dung chuyển khoản.",
      );
    }
  }

  return (
    <main className="member-wallet-page">
      <div className="member-wallet-container">
        <nav className="member-wallet-breadcrumb" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link to="/member">Tài khoản</Link>
          <span aria-hidden="true">/</span>
          <span>Ví của tôi</span>
        </nav>

        <header className="member-wallet-header">
          <div>
            <span className="member-wallet-eyebrow">
              ICONDENIM MEMBERSHIP
            </span>

            <h1>Ví của tôi</h1>

            <p>
              Theo dõi số dư và lịch sử giao dịch trong tài khoản của bạn.
            </p>
          </div>

          <button
            type="button"
            className="member-wallet-refresh-button"
            onClick={handleReload}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Làm mới dữ liệu"}
          </button>
        </header>

        {error && (
          <section className="member-wallet-error" role="alert">
            <div>
              <strong>Không thể tải dữ liệu ví</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={handleReload}>
              Thử lại
            </button>
          </section>
        )}

        <section
          className="member-wallet-summary"
          aria-label="Tổng quan số dư ví"
          aria-busy={loading}
        >
          <article className="member-wallet-balance-card member-wallet-balance-main">
            <span className="member-wallet-card-label">
              TỔNG SỐ DƯ
            </span>

            <h2>
              {loading
                ? "Đang tải..."
                : balance
                  ? formatCurrency(balance.balance)
                  : "—"}
            </h2>

            <p>Tổng số tiền hiện có trong ví.</p>
          </article>

          <article className="member-wallet-balance-card">
            <span className="member-wallet-card-label">
              SỐ DƯ KHẢ DỤNG
            </span>

            <h2>
              {loading
                ? "Đang tải..."
                : balance
                  ? formatCurrency(balance.availableBalance)
                  : "—"}
            </h2>

            <p>Số tiền chưa bị giữ lại.</p>
          </article>

          <article className="member-wallet-balance-card">
            <span className="member-wallet-card-label">
              SỐ DƯ ĐANG GIỮ
            </span>

            <h2>
              {loading
                ? "Đang tải..."
                : balance
                  ? formatCurrency(balance.reservedBalance)
                  : "—"}
            </h2>

            <p>Số tiền đang được giữ trong ví.</p>
          </article>
        </section>

        <section
          className="member-wallet-withdrawal"
          aria-labelledby="member-wallet-withdrawal-title"
        >
          <div className="member-wallet-withdrawal-header">
            <span className="member-wallet-eyebrow">WALLET WITHDRAWAL</span>
            <h2 id="member-wallet-withdrawal-title">Rút tiền về ngân hàng</h2>
            <p>
              Chọn tài khoản ngân hàng đã kích hoạt và nhập số tiền muốn rút.
              Yêu cầu sẽ được chờ duyệt trước khi chuyển tiền.
            </p>
          </div>

          {bankAccounts.length === 0 ? (
            <p className="member-wallet-withdrawal-notice">
              Bạn chưa có tài khoản ngân hàng đang hoạt động để nhận tiền.
              Vui lòng đăng ký hoặc kích hoạt tài khoản ngân hàng trước khi rút.
            </p>
          ) : (
            <form
              className="member-wallet-withdrawal-form"
              onSubmit={handleWithdrawalSubmit}
            >
              <label htmlFor="member-wallet-bank-account">
                Tài khoản ngân hàng nhận tiền
              </label>
              <select
                id="member-wallet-bank-account"
                value={selectedBankAccountId}
                onChange={(event) =>
                  setSelectedBankAccountId(event.target.value)
                }
                required
                disabled={submittingWithdrawal || loading}
              >
                <option value="">Chọn tài khoản ngân hàng</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber}
                  </option>
                ))}
              </select>

              <label htmlFor="member-wallet-withdrawal-amount">
                Số tiền muốn rút (VNĐ)
              </label>
              <input
                id="member-wallet-withdrawal-amount"
                type="number"
                min="1"
                step="1"
                max={balance?.availableBalance ?? undefined}
                value={withdrawalAmount}
                onChange={(event) => setWithdrawalAmount(event.target.value)}
                placeholder="Nhập số tiền"
                required
                disabled={submittingWithdrawal || loading || !balance}
              />

              <p className="member-wallet-withdrawal-available">
                Số dư khả dụng:{" "}
                <strong>
                  {formatCurrency(balance?.availableBalance ?? "0")}
                </strong>
              </p>

              <label htmlFor="member-wallet-withdrawal-note">
                Ghi chú (không bắt buộc)
              </label>
              <textarea
                id="member-wallet-withdrawal-note"
                value={withdrawalNote}
                onChange={(event) => setWithdrawalNote(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Nhập ghi chú nếu cần"
                disabled={submittingWithdrawal}
              />

              {withdrawalError && (
                <p className="member-wallet-withdrawal-error" role="alert">
                  {withdrawalError}
                </p>
              )}

              {withdrawalSuccess && (
                <p className="member-wallet-withdrawal-success" role="status">
                  {withdrawalSuccess}
                </p>
              )}

              <button
                className="member-wallet-withdrawal-submit"
                type="submit"
                disabled={
                  submittingWithdrawal ||
                  loading ||
                  !balance ||
                  !selectedBankAccountId
                }
              >
                {submittingWithdrawal
                  ? "Đang gửi yêu cầu..."
                  : "Tạo yêu cầu rút tiền"}
              </button>
            </form>
          )}

          {bankAccounts.length === 0 && (
            <>
              {withdrawalError && (
                <p className="member-wallet-withdrawal-error" role="alert">
                  {withdrawalError}
                </p>
              )}
              {withdrawalSuccess && (
                <p className="member-wallet-withdrawal-success" role="status">
                  {withdrawalSuccess}
                </p>
              )}
            </>
          )}
        </section>

        <section
          className="member-wallet-topup"
          aria-labelledby="member-wallet-topup-title"
        >
          <div className="member-wallet-topup-header">
            <span className="member-wallet-eyebrow">
              WALLET TOP-UP
            </span>

            <h2 id="member-wallet-topup-title">
              Nạp tiền vào ví
            </h2>

            <p>
              Tạo lệnh chuyển khoản để nạp tiền vào ví thành viên.
              Hãy chuyển đúng số tiền và nội dung mà hệ thống cung cấp.
            </p>
          </div>

          <form
            className="member-wallet-topup-form"
            onSubmit={handleTopUpSubmit}
          >
            <label htmlFor="member-wallet-topup-amount">
              Số tiền muốn nạp (VNĐ)
            </label>

            <input
              id="member-wallet-topup-amount"
              type="number"
              min="1"
              step="1"
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
              placeholder="Nhập số tiền muốn nạp"
              required
              disabled={submittingTopUp || loading || !memberAccountId}
            />

            <p className="member-wallet-topup-hint">
              Lệnh chuyển khoản có thời hạn. Vui lòng hoàn tất giao dịch
              trước thời điểm hết hạn được hiển thị bên dưới.
            </p>

            {topUpError && (
              <p className="member-wallet-topup-error" role="alert">
                {topUpError}
              </p>
            )}

            <button
              className="member-wallet-topup-submit"
              type="submit"
              disabled={
                submittingTopUp ||
                loading ||
                !memberAccountId ||
                !topUpAmount.trim()
              }
            >
              {submittingTopUp
                ? "Đang tạo lệnh..."
                : "Tạo lệnh chuyển khoản"}
            </button>
          </form>

          {topUpInstruction && (
            <div className="member-wallet-topup-instruction">
              <div className="member-wallet-topup-instruction-header">
                <h3>Thông tin chuyển khoản</h3>
                <span className="member-wallet-topup-status">
                  {topUpInstruction.status}
                </span>
              </div>

              <div className="member-wallet-topup-detail">
                <span>Mã lệnh</span>
                <strong>{topUpInstruction.id}</strong>
              </div>

              <div className="member-wallet-topup-detail">
                <span>Số tiền cần chuyển</span>
                <strong>
                  {formatCurrency(topUpInstruction.expectedAmount)}
                </strong>
              </div>

              <div className="member-wallet-topup-detail">
                <span>Số tiền đã ghi nhận</span>
                <strong>
                  {formatCurrency(topUpInstruction.receivedAmount)}
                </strong>
              </div>

              <div className="member-wallet-topup-detail">
                <span>Số tài khoản nhận</span>
                <strong>
                  {topUpInstruction.bankAccount?.accountNumber ??
                    "Chưa có thông tin tài khoản"}
                </strong>
              </div>

              <div className="member-wallet-topup-transfer-content">
                <label htmlFor="member-wallet-topup-transfer-content">
                  Nội dung chuyển khoản
                </label>

                <div className="member-wallet-topup-copy-row">
                  <input
                    id="member-wallet-topup-transfer-content"
                    type="text"
                    value={topUpInstruction.transferContent}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />

                  <button
                    type="button"
                    onClick={() => void handleCopyTopUpContent()}
                  >
                    Sao chép
                  </button>
                </div>

                {topUpCopySuccess && (
                  <p
                    className="member-wallet-topup-copy-success"
                    role="status"
                  >
                    Đã sao chép nội dung chuyển khoản.
                  </p>
                )}
              </div>

              <div className="member-wallet-topup-detail">
                <span>Thời điểm tạo</span>
                <strong>{formatDate(topUpInstruction.createdAt)}</strong>
              </div>

              <div className="member-wallet-topup-detail">
                <span>Hạn chuyển khoản</span>
                <strong>{formatDate(topUpInstruction.expiresAt)}</strong>
              </div>

              <p className="member-wallet-topup-notice">
                Chỉ chuyển đúng số tiền và nội dung ở trên. Việc tạo lệnh
                chưa làm tăng số dư ví; số dư sẽ được cập nhật sau khi
                hệ thống xác nhận giao dịch hợp lệ.
              </p>
            </div>
          )}
        </section>

        <section
          className="member-wallet-history"
          aria-labelledby="member-wallet-history-title"
        >
          <div className="member-wallet-history-header">
            <div>
              <span className="member-wallet-eyebrow">
                WALLET ACTIVITY
              </span>

              <h2 id="member-wallet-history-title">
                Lịch sử giao dịch
              </h2>

              <p>Các giao dịch được sắp xếp từ mới nhất đến cũ nhất.</p>
            </div>

            {!loading && !error && (
              <span className="member-wallet-transaction-count">
                {transactions.length} giao dịch
              </span>
            )}
          </div>

          {loading ? (
            <div className="member-wallet-state">
              <span className="member-wallet-loading-indicator" />
              <p>Đang tải lịch sử giao dịch...</p>
            </div>
          ) : error ? (
            <div className="member-wallet-state">
              <p>Không thể hiển thị lịch sử giao dịch.</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="member-wallet-state">
              <div className="member-wallet-empty-icon" aria-hidden="true">
                ↗
              </div>

              <h3>Chưa có giao dịch</h3>

              <p>
                Lịch sử giao dịch sẽ xuất hiện tại đây khi ví phát sinh
                giao dịch.
              </p>

              <Link to="/products" className="member-wallet-shop-link">
                Khám phá sản phẩm
              </Link>
            </div>
          ) : (
            <div className="member-wallet-table-wrapper">
              <table className="member-wallet-table">
                <thead>
                  <tr>
                    <th scope="col">Giao dịch</th>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Số tiền</th>
                    <th scope="col">Số dư trước</th>
                    <th scope="col">Số dư sau</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const amount = Number(transaction.amount);
                    const isIncoming =
                      Number.isFinite(amount) && amount > 0;

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <div className="member-wallet-transaction-name">
                            <span
                              className={`member-wallet-transaction-icon ${isIncoming
                                ? "is-incoming"
                                : "is-outgoing"
                                }`}
                              aria-hidden="true"
                            >
                              {isIncoming ? "+" : "−"}
                            </span>

                            <div>
                              <strong>
                                {getTransactionLabel(transaction.type)}
                              </strong>

                              {transaction.description && (
                                <span className="member-wallet-transaction-description">
                                  {transaction.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="member-wallet-date">
                          {formatDate(transaction.createdAt)}
                        </td>

                        <td
                          className={`member-wallet-amount ${isIncoming
                            ? "is-positive"
                            : "is-negative"
                            }`}
                        >
                          {isIncoming ? "+" : ""}
                          {formatCurrency(transaction.amount)}
                        </td>

                        <td className="member-wallet-money">
                          {formatCurrency(transaction.balanceBefore)}
                        </td>

                        <td className="member-wallet-money">
                          {formatCurrency(transaction.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>



        <footer className="member-wallet-footer">
          <Link to="/member" className="member-wallet-back-link">
            ← Quay lại tài khoản
          </Link>

          <p>
            Thông tin số dư được lấy từ hệ thống ví thành viên.
          </p>
        </footer>
      </div>
    </main>
  );
}