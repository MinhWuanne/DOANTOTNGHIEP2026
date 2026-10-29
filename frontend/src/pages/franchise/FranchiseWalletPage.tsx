
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    getFranchiseAuth,
    getFranchiseWalletBalance,
    type FranchiseWalletBalance,
} from "../../services/api/franchise-dashboard.api";

import {
    getFranchiseWalletTransactions,
    getFranchiseWithdrawalBankAccounts,
    createFranchiseWithdrawalRequest,
    type FranchiseWalletTransaction,
    type FranchiseWithdrawalBankAccount,
} from "../../services/api/franchise-wallet.api";

import "./FranchiseWalletPage.css";

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
    return Number.isFinite(amount)
        ? currencyFormatter.format(amount)
        : "—";
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : dateFormatter.format(date);
}

function getErrorMessage(error: unknown): string {
    const code = error instanceof Error ? error.message : "";

    const messages: Record<string, string> = {
        AUTHORIZATION_REQUIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        INVALID_FRANCHISE_ACCOUNT: "Tài khoản nhượng quyền không hợp lệ.",
        WALLET_NOT_FOUND: "Không tìm thấy ví của tài khoản nhượng quyền.",
        INVALID_API_RESPONSE: "Dữ liệu phản hồi không hợp lệ.",
        INVALID_AMOUNT: "Số tiền rút không hợp lệ.",
        INSUFFICIENT_AVAILABLE_BALANCE:
            "Số dư khả dụng không đủ. Vui lòng tải lại số dư.",
        INSUFFICIENT_BALANCE: "Số dư ví không đủ.",
        BANK_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản ngân hàng.",
        BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT:
            "Tài khoản ngân hàng không thuộc cùng một chủ sở hữu.",
        INVALID_BANK_ACCOUNT_OWNER:
            "Tài khoản ngân hàng không hợp lệ để nhận tiền.",
    };

    return messages[code] ??
        "Không thể xử lý yêu cầu. Vui lòng thử lại.";
}

export default function FranchiseWalletPage() {
    const [accountId, setAccountId] = useState("");
    const [balance, setBalance] =
        useState<FranchiseWalletBalance | null>(null);
    const [transactions, setTransactions] =
        useState<FranchiseWalletTransaction[]>([]);
    const [bankAccounts, setBankAccounts] =
        useState<FranchiseWithdrawalBankAccount[]>([]);

    const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [withdrawalNote, setWithdrawalNote] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [withdrawalError, setWithdrawalError] = useState("");
    const [withdrawalSuccess, setWithdrawalSuccess] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const loadWallet = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const auth = await getFranchiseAuth();

            const [
                walletBalance,
                walletTransactions,
                withdrawalBankAccounts,
            ] = await Promise.all([
                getFranchiseWalletBalance(auth.accountId),
                getFranchiseWalletTransactions(auth.accountId),
                getFranchiseWithdrawalBankAccounts(auth.accountId),
            ]);

            setAccountId(auth.accountId);
            setBalance(walletBalance);
            setTransactions(walletTransactions);
            setBankAccounts(withdrawalBankAccounts);

            setSelectedBankAccountId((current) =>
                withdrawalBankAccounts.some((item) => item.id === current)
                    ? current
                    : withdrawalBankAccounts[0]?.id ?? "",
            );
        } catch (loadError) {
            setBalance(null);
            setTransactions([]);
            setBankAccounts([]);
            setAccountId("");
            setSelectedBankAccountId("");
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadWallet();
    }, [loadWallet, reloadKey]);

    async function handleWithdrawalSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setWithdrawalError("");
        setWithdrawalSuccess("");

        const amount = Number(withdrawalAmount);
        const availableBalance = Number(balance?.availableBalance ?? 0);

        if (!accountId) {
            setWithdrawalError("Không tìm thấy tài khoản nhượng quyền.");
            return;
        }

        if (!selectedBankAccountId) {
            setWithdrawalError("Vui lòng chọn tài khoản ngân hàng nhận tiền.");
            return;
        }

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            setWithdrawalError("Số tiền rút phải là số nguyên lớn hơn 0.");
            return;
        }

        if (amount > availableBalance) {
            setWithdrawalError("Số tiền rút vượt quá số dư khả dụng.");
            return;
        }

        setSubmitting(true);

        try {
            const result = await createFranchiseWithdrawalRequest(accountId, {
                bankAccountId: selectedBankAccountId,
                amount,
                note: withdrawalNote.trim() || undefined,
            });

            setWithdrawalSuccess(
                `Đã tạo yêu cầu rút ${formatCurrency(result.amount)}. ` +
                `Mã yêu cầu: ${result.id}. Trạng thái: ${result.status}.`,
            );

            setWithdrawalAmount("");
            setWithdrawalNote("");
            setReloadKey((current) => current + 1);
        } catch (submitError) {
            setWithdrawalError(getErrorMessage(submitError));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="franchise-wallet-page">
            <div className="franchise-wallet-container">
                <nav className="franchise-wallet-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/franchise">Tổng quan</Link>
                    <span>/</span>
                    <span>Ví của tôi</span>
                </nav>

                <header className="franchise-wallet-heading">
                    <div>
                        <span className="franchise-wallet-eyebrow">
                            FRANCHISE FINANCE
                        </span>
                        <h1>Ví của tôi</h1>
                        <p>
                            Theo dõi số dư, quản lý tiền khả dụng và yêu cầu rút tiền
                            về tài khoản ngân hàng.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="franchise-wallet-refresh"
                        onClick={() => setReloadKey((current) => current + 1)}
                        disabled={loading}
                    >
                        {loading ? "Đang tải..." : "Làm mới dữ liệu"}
                    </button>
                </header>

                {error && (
                    <div className="franchise-wallet-alert franchise-wallet-alert-error">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() => setReloadKey((current) => current + 1)}
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                <section
                    className="franchise-wallet-summary"
                    aria-label="Tổng quan số dư"
                >
                    <article className="franchise-wallet-balance-card franchise-wallet-balance-primary">
                        <span className="franchise-wallet-card-label">Tổng số dư</span>
                        <h2>{loading ? "Đang tải..." : formatCurrency(balance?.balance ?? "0")}</h2>
                        <p>Tổng số tiền hiện có trong ví</p>
                    </article>

                    <article className="franchise-wallet-balance-card">
                        <span className="franchise-wallet-card-label">Số dư khả dụng</span>
                        <h2>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(balance?.availableBalance ?? "0")}
                        </h2>
                        <p>Số tiền có thể sử dụng hoặc yêu cầu rút</p>
                    </article>

                    <article className="franchise-wallet-balance-card">
                        <span className="franchise-wallet-card-label">Số dư đang giữ</span>
                        <h2>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(balance?.reservedBalance ?? "0")}
                        </h2>
                        <p>Số tiền đang được giữ cho các giao dịch</p>
                    </article>
                </section>

                <section
                    className="franchise-wallet-withdrawal"
                    aria-labelledby="franchise-wallet-withdrawal-title"
                >
                    <div className="franchise-wallet-section-heading">
                        <span className="franchise-wallet-eyebrow">WITHDRAWAL</span>
                        <h2 id="franchise-wallet-withdrawal-title">
                            Rút tiền về ngân hàng
                        </h2>
                        <p>
                            Chọn tài khoản ngân hàng đã kích hoạt và nhập số tiền muốn rút.
                        </p>
                    </div>

                    {bankAccounts.length === 0 && !loading ? (
                        <p className="franchise-wallet-notice">
                            Chưa có tài khoản ngân hàng đang hoạt động để nhận tiền.
                            Vui lòng thêm hoặc kích hoạt tài khoản ngân hàng trước khi rút.
                        </p>
                    ) : (
                        <form
                            className="franchise-wallet-form"
                            onSubmit={handleWithdrawalSubmit}
                        >
                            <label htmlFor="franchise-wallet-bank-account">
                                Tài khoản ngân hàng nhận tiền
                            </label>
                            <select
                                id="franchise-wallet-bank-account"
                                value={selectedBankAccountId}
                                onChange={(event) =>
                                    setSelectedBankAccountId(event.target.value)
                                }
                                required
                                disabled={submitting || loading}
                            >
                                <option value="">Chọn tài khoản ngân hàng</option>
                                {bankAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.accountNumber}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="franchise-wallet-amount">
                                Số tiền muốn rút (VND)
                            </label>
                            <input
                                id="franchise-wallet-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={withdrawalAmount}
                                onChange={(event) => setWithdrawalAmount(event.target.value)}
                                placeholder="Nhập số tiền muốn rút"
                                required
                                disabled={submitting || loading}
                            />

                            <p className="franchise-wallet-available">
                                Số dư khả dụng:{" "}
                                <strong>
                                    {formatCurrency(balance?.availableBalance ?? "0")}
                                </strong>
                            </p>

                            <label htmlFor="franchise-wallet-note">
                                Ghi chú (không bắt buộc)
                            </label>
                            <textarea
                                id="franchise-wallet-note"
                                rows={3}
                                value={withdrawalNote}
                                onChange={(event) => setWithdrawalNote(event.target.value)}
                                placeholder="Nhập ghi chú cho yêu cầu rút tiền"
                                disabled={submitting || loading}
                            />

                            {withdrawalError && (
                                <p className="franchise-wallet-message franchise-wallet-message-error">
                                    {withdrawalError}
                                </p>
                            )}

                            {withdrawalSuccess && (
                                <p className="franchise-wallet-message franchise-wallet-message-success">
                                    {withdrawalSuccess}
                                </p>
                            )}

                            <button
                                className="franchise-wallet-submit"
                                type="submit"
                                disabled={
                                    submitting ||
                                    loading ||
                                    bankAccounts.length === 0 ||
                                    !selectedBankAccountId
                                }
                            >
                                {submitting ? "Đang gửi yêu cầu..." : "Tạo yêu cầu rút tiền"}
                            </button>
                        </form>
                    )}
                </section>

                <section
                    className="franchise-wallet-history"
                    aria-labelledby="franchise-wallet-history-title"
                >
                    <div className="franchise-wallet-history-header">
                        <div>
                            <span className="franchise-wallet-eyebrow">
                                TRANSACTION HISTORY
                            </span>
                            <h2 id="franchise-wallet-history-title">Lịch sử giao dịch</h2>
                            <p>Các biến động số dư được ghi nhận trong ví của bạn.</p>
                        </div>
                        <span className="franchise-wallet-count">
                            {transactions.length} giao dịch
                        </span>
                    </div>

                    <div className="franchise-wallet-table-wrapper">
                        <table className="franchise-wallet-table">
                            <thead>
                                <tr>
                                    <th>Giao dịch</th>
                                    <th>Thời gian</th>
                                    <th>Số tiền</th>
                                    <th>Số dư sau giao dịch</th>
                                    <th>Mô tả</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="franchise-wallet-empty">
                                            Đang tải lịch sử giao dịch...
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="franchise-wallet-empty">
                                            Chưa có giao dịch nào.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((transaction) => {
                                        const amount = Number(transaction.amount);
                                        const isCredit = Number.isFinite(amount) && amount > 0;
                                        const isDebit = Number.isFinite(amount) && amount < 0;

                                        return (
                                            <tr key={transaction.id}>
                                                <td>
                                                    <span className="franchise-wallet-transaction-name">
                                                        {transactionLabels[transaction.type] ??
                                                            transaction.type}
                                                    </span>
                                                    <span className="franchise-wallet-transaction-id">
                                                        #{transaction.id}
                                                    </span>
                                                </td>
                                                <td>{formatDate(transaction.createdAt)}</td>
                                                <td>
                                                    <span
                                                        className={
                                                            isCredit
                                                                ? "franchise-wallet-amount-credit"
                                                                : isDebit
                                                                    ? "franchise-wallet-amount-debit"
                                                                    : ""
                                                        }
                                                    >
                                                        {isCredit ? "+" : ""}
                                                        {formatCurrency(transaction.amount)}
                                                    </span>
                                                </td>
                                                <td>{formatCurrency(transaction.balanceAfter)}</td>
                                                <td>
                                                    {transaction.description || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
