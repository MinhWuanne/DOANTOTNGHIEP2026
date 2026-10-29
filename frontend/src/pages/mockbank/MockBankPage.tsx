
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMockBankAccount,
  depositMockBankAccount,
  getMockBankAccounts,
  getMockBankTransactions,
  transferMockBank,
} from "../../services/api/mockbank.api";
import type {
  MockBankAccount,
  MockBankOwnerType,
  MockBankTransaction,
} from "../../services/api/mockbank.api";
import "./MockBankPage.css";

type ActiveTab = "overview" | "deposit" | "transfer" | "history";

const formatMoney = (value: string | number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  });

function getErrorText(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  const messages: Record<string, string> = {
    BANK_ACCOUNT_ALREADY_EXISTS: "Tài khoản ngân hàng của chủ sở hữu này đã tồn tại.",
    BANK_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản ngân hàng.",
    BANK_ACCOUNT_NOT_ACTIVE: "Tài khoản đang không hoạt động.",
    INVALID_AMOUNT: "Số tiền phải lớn hơn 0 và là một giá trị hợp lệ.",
    BANK_SELF_TRANSFER_NOT_ALLOWED: "Không thể chuyển khoản cho chính tài khoản gửi.",
    INSUFFICIENT_BANK_BALANCE: "Số dư không đủ để thực hiện giao dịch.",
    INVALID_BANK_ACCOUNT_ID: "Mã tài khoản không hợp lệ.",
    MOCKBANK_INVALID_RESPONSE: "Máy chủ trả về dữ liệu không hợp lệ.",
  };

  return messages[code] || `Giao dịch thất bại: ${code}`;
}

export default function MockBankPage() {
  const [accounts, setAccounts] = useState<MockBankAccount[]>([]);
  const [transactions, setTransactions] = useState<MockBankTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [ownerType, setOwnerType] = useState<MockBankOwnerType>("USER");
  const [ownerAccountId, setOwnerAccountId] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState(
    "Nap tien mo phong",
  );
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    setError("");

    try {
      const [accountData, transactionData] = await Promise.all([
        getMockBankAccounts(),
        getMockBankTransactions(accountId),
      ]);

      setAccounts(accountData);
      setTransactions(transactionData);

      setSelectedAccountId((current) =>
        current && accountData.some((account) => account.id === current)
          ? current
          : accountData[0]?.id || "",
      );

      setDepositAccountId((current) =>
        current && accountData.some((account) => account.id === current)
          ? current
          : accountData[0]?.id || "",
      );

      setFromAccountId((current) =>
        current && accountData.some((account) => account.id === current)
          ? current
          : accountData[0]?.id || "",
      );

      setToAccountId((current) =>
        current && accountData.some((account) => account.id === current)
          ? current
          : accountData.find((account) => account.id !== accountData[0]?.id)?.id || "",
      );
    } catch (loadError) {
      setError(getErrorText(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "ACTIVE"),
    [accounts],
  );

  const totalBalance = useMemo(
    () => accounts.reduce((total, account) => total + Number(account.balance), 0),
    [accounts],
  );

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const input: {
        ownerType: MockBankOwnerType;
        ownerAccountId?: string;
      } = { ownerType };

      if (ownerAccountId.trim()) {
        if (!/^[1-9]\d*$/.test(ownerAccountId.trim())) {
          throw new Error("INVALID_BANK_ACCOUNT_ID");
        }
        input.ownerAccountId = ownerAccountId.trim();
      }

      const account = await createMockBankAccount(input);
      setNotice(`Đã tạo tài khoản ${account.accountNumber}.`);
      setOwnerAccountId("");
      setSelectedAccountId(account.id);
      await loadData();
      setActiveTab("overview");
    } catch (createError) {
      setError(getErrorText(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const amount = Number(depositAmount);
    if (!depositAccountId || !Number.isFinite(amount) || amount <= 0) {
      setError("Hãy chọn tài khoản và nhập số tiền nạp lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      await depositMockBankAccount(depositAccountId, {
        amount,
        description: depositDescription.trim() || undefined,
      });
      setNotice("Nạp tiền mô phỏng thành công.");
      setDepositAmount("");
      await loadData(depositAccountId);
    } catch (depositError) {
      setError(getErrorText(depositError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const amount = Number(transferAmount);
    if (!fromAccountId || !toAccountId) {
      setError("Hãy chọn tài khoản gửi và tài khoản nhận.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Tài khoản gửi và nhận phải khác nhau.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số tiền chuyển phải lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const transaction = await transferMockBank({
        fromBankAccountId: fromAccountId,
        toBankAccountId: toAccountId,
        amount,
        description: transferDescription.trim() || undefined,
      });

      setNotice(`Chuyển khoản thành công. Mã giao dịch: ${transaction.id}`);
      setTransferAmount("");
      await loadData(fromAccountId);
      setActiveTab("history");
    } catch (transferError) {
      setError(getErrorText(transferError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHistoryFilter(value: string) {
    setSelectedAccountId(value);
    setError("");

    try {
      setTransactions(await getMockBankTransactions(value || undefined));
    } catch (historyError) {
      setError(getErrorText(historyError));
    }
  }

  return (
    <main className="mockbank-page">
      <header className="mockbank-header">
        <div className="mockbank-brand">
          <div className="mockbank-brand-mark">MB</div>
          <div>
            <p className="mockbank-eyebrow">ENVIRONMENT / SIMULATION</p>
            <h1>MockBank</h1>
            <p className="mockbank-subtitle">
              Ngân hàng mô phỏng phục vụ kiểm thử thanh toán IconDenim
            </p>
          </div>
        </div>
        <button
          className="mockbank-button mockbank-button-secondary"
          type="button"
          onClick={() => void loadData(selectedAccountId || undefined)}
          disabled={loading || submitting}
        >
          ↻ Làm mới dữ liệu
        </button>
      </header>

      <div className="mockbank-warning">
        <strong>Chế độ mô phỏng</strong>
        <span>
          Giao dịch ở đây không phải giao dịch ngân hàng thật. Chuyển khoản
          thành công chưa đồng nghĩa đơn hàng đã được hệ thống Payment đối soát.
        </span>
      </div>

      {error && (
        <div className="mockbank-alert mockbank-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="mockbank-alert mockbank-alert-success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}

      <section className="mockbank-stats">
        <article className="mockbank-stat-card mockbank-stat-primary">
          <span className="mockbank-stat-label">Tổng số dư mô phỏng</span>
          <strong>{formatMoney(totalBalance)}</strong>
          <span className="mockbank-stat-note">Tổng số dư các tài khoản đang hiển thị</span>
        </article>
        <article className="mockbank-stat-card">
          <span className="mockbank-stat-label">Tổng tài khoản</span>
          <strong>{accounts.length}</strong>
          <span className="mockbank-stat-note">USER và SHOP</span>
        </article>
        <article className="mockbank-stat-card">
          <span className="mockbank-stat-label">Tài khoản hoạt động</span>
          <strong>{activeAccounts.length}</strong>
          <span className="mockbank-stat-note">Có thể thực hiện giao dịch</span>
        </article>
        <article className="mockbank-stat-card">
          <span className="mockbank-stat-label">Giao dịch đã tải</span>
          <strong>{transactions.length}</strong>
          <span className="mockbank-stat-note">Tối đa 100 giao dịch gần nhất</span>
        </article>
      </section>

      <nav className="mockbank-tabs" aria-label="Chức năng MockBank">
        {([
          ["overview", "Tài khoản"],
          ["deposit", "Nạp tiền mô phỏng"],
          ["transfer", "Chuyển khoản"],
          ["history", "Lịch sử giao dịch"],
        ] as [ActiveTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "mockbank-tab active" : "mockbank-tab"}
            onClick={() => {
              setActiveTab(tab);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="mockbank-loading">Đang tải dữ liệu MockBank...</div>
      )}

      {!loading && activeTab === "overview" && (
        <section className="mockbank-content-grid">
          <article className="mockbank-panel">
            <div className="mockbank-panel-heading">
              <div>
                <p className="mockbank-eyebrow">BANK ACCOUNTS</p>
                <h2>Danh sách tài khoản</h2>
              </div>
              <span className="mockbank-count">{accounts.length} tài khoản</span>
            </div>

            {accounts.length === 0 ? (
              <div className="mockbank-empty">
                Chưa có tài khoản. Tạo tài khoản mô phỏng ở khung bên cạnh.
              </div>
            ) : (
              <div className="mockbank-account-list">
                {accounts.map((account) => (
                  <button
                    type="button"
                    key={account.id}
                    className={
                      selectedAccountId === account.id
                        ? "mockbank-account-card selected"
                        : "mockbank-account-card"
                    }
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <span className="mockbank-account-icon">
                      {account.ownerType === "SHOP" ? "S" : "U"}
                    </span>
                    <span className="mockbank-account-info">
                      <strong>{account.accountNumber}</strong>
                      <small>
                        {account.ownerType} · ID {account.id}
                        {account.ownerAccountId
                          ? ` · Chủ sở hữu ${account.ownerAccountId}`
                          : ""}
                      </small>
                    </span>
                    <span className="mockbank-account-balance">
                      <strong>{formatMoney(account.balance)}</strong>
                      <small className={account.status === "ACTIVE" ? "status-active" : "status-locked"}>
                        {account.status}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedAccount && (
              <div className="mockbank-selected-account">
                <span className="mockbank-eyebrow">TÀI KHOẢN ĐANG CHỌN</span>
                <strong>{selectedAccount.accountNumber}</strong>
                <span>Số dư: {formatMoney(selectedAccount.balance)}</span>
                <span>Loại: {selectedAccount.ownerType}</span>
              </div>
            )}
          </article>

          <article className="mockbank-panel">
            <div className="mockbank-panel-heading">
              <div>
                <p className="mockbank-eyebrow">NEW ACCOUNT</p>
                <h2>Tạo tài khoản mô phỏng</h2>
              </div>
            </div>
            <form className="mockbank-form" onSubmit={handleCreateAccount}>
              <label>
                Loại tài khoản
                <select
                  value={ownerType}
                  onChange={(event) =>
                    setOwnerType(event.target.value as MockBankOwnerType)
                  }
                >
                  <option value="USER">USER — Tài khoản người dùng</option>
                  <option value="SHOP">SHOP — Tài khoản cửa hàng</option>
                </select>
              </label>
              <label>
                ID chủ sở hữu (không bắt buộc)
                <input
                  value={ownerAccountId}
                  onChange={(event) => setOwnerAccountId(event.target.value)}
                  inputMode="numeric"
                  placeholder="Ví dụ: 12"
                />
                <small>
                  Để trống nếu chỉ cần tạo tài khoản thử nghiệm độc lập.
                </small>
              </label>
              <button
                className="mockbank-button mockbank-button-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "+ Tạo tài khoản"}
              </button>
            </form>
          </article>
        </section>
      )}

      {!loading && activeTab === "deposit" && (
        <section className="mockbank-panel mockbank-form-panel">
          <div className="mockbank-panel-heading">
            <div>
              <p className="mockbank-eyebrow">SIMULATED DEPOSIT</p>
              <h2>Nạp tiền vào tài khoản</h2>
              <p>Chỉ sử dụng để tạo số dư thử nghiệm cho MockBank.</p>
            </div>
          </div>
          <form className="mockbank-form" onSubmit={handleDeposit}>
            <label>
              Tài khoản nhận tiền
              <select
                required
                value={depositAccountId}
                onChange={(event) => setDepositAccountId(event.target.value)}
              >
                <option value="">Chọn tài khoản</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber} — {account.ownerType} — {formatMoney(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số tiền (VND)
              <input
                required
                type="number"
                min="1"
                step="1"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                placeholder="Ví dụ: 500000"
              />
            </label>
            <label>
              Nội dung nạp tiền
              <input
                value={depositDescription}
                onChange={(event) => setDepositDescription(event.target.value)}
                maxLength={255}
                placeholder="Nội dung giao dịch"
              />
            </label>
            <button
              className="mockbank-button mockbank-button-primary"
              type="submit"
              disabled={submitting || activeAccounts.length === 0}
            >
              {submitting ? "Đang xử lý..." : "Xác nhận nạp tiền"}
            </button>
          </form>
        </section>
      )}

      {!loading && activeTab === "transfer" && (
        <section className="mockbank-panel mockbank-form-panel">
          <div className="mockbank-panel-heading">
            <div>
              <p className="mockbank-eyebrow">BANK TRANSFER</p>
              <h2>Chuyển khoản nội bộ</h2>
              <p>Hệ thống sẽ ghi nhận giao dịch và cập nhật số dư hai tài khoản.</p>
            </div>
          </div>
          <form className="mockbank-form" onSubmit={handleTransfer}>
            <label>
              Tài khoản gửi
              <select
                required
                value={fromAccountId}
                onChange={(event) => setFromAccountId(event.target.value)}
              >
                <option value="">Chọn tài khoản gửi</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber} — {account.ownerType} — {formatMoney(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tài khoản nhận
              <select
                required
                value={toAccountId}
                onChange={(event) => setToAccountId(event.target.value)}
              >
                <option value="">Chọn tài khoản nhận</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber} — {account.ownerType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số tiền chuyển (VND)
              <input
                required
                type="number"
                min="1"
                step="1"
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
                placeholder="Ví dụ: 200000"
              />
            </label>
            <label>
              Nội dung chuyển khoản
              <input
                value={transferDescription}
                onChange={(event) => setTransferDescription(event.target.value)}
                maxLength={255}
                placeholder="Ví dụ: Thanh toan DH..."
              />
            </label>
            <button
              className="mockbank-button mockbank-button-primary"
              type="submit"
              disabled={submitting || activeAccounts.length < 2}
            >
              {submitting ? "Đang xử lý..." : "Xác nhận chuyển khoản"}
            </button>
            {activeAccounts.length < 2 && (
              <p className="mockbank-inline-note">
                Cần ít nhất hai tài khoản ACTIVE để thực hiện chuyển khoản.
              </p>
            )}
          </form>
        </section>
      )}

      {!loading && activeTab === "history" && (
        <section className="mockbank-panel">
          <div className="mockbank-panel-heading mockbank-history-heading">
            <div>
              <p className="mockbank-eyebrow">TRANSACTION LEDGER</p>
              <h2>Lịch sử giao dịch</h2>
              <p>Hiển thị tối đa 100 giao dịch gần nhất.</p>
            </div>
            <label className="mockbank-filter">
              Lọc theo tài khoản
              <select
                value={selectedAccountId}
                onChange={(event) => void handleHistoryFilter(event.target.value)}
              >
                <option value="">Tất cả tài khoản</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {transactions.length === 0 ? (
            <div className="mockbank-empty">Chưa có giao dịch phù hợp.</div>
          ) : (
            <div className="mockbank-table-wrap">
              <table className="mockbank-table">
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Loại</th>
                    <th>Tài khoản gửi</th>
                    <th>Tài khoản nhận</th>
                    <th>Số tiền</th>
                    <th>Nội dung</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>#{transaction.id}</td>
                      <td>
                        <span className={`mockbank-type-badge type-${transaction.type.toLowerCase()}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>{transaction.fromBankAccount?.accountNumber || "—"}</td>
                      <td>{transaction.toBankAccount?.accountNumber || "—"}</td>
                      <td className="mockbank-amount">{formatMoney(transaction.amount)}</td>
                      <td>{transaction.description || "—"}</td>
                      <td>{formatDate(transaction.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <footer className="mockbank-footer">
        <span>MockBank · Môi trường kiểm thử nội bộ</span>
        <span>Không thực hiện giao dịch ngân hàng thật</span>
      </footer>
    </main>
  );
}
