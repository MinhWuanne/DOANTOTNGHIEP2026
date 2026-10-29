import { useEffect, useMemo, useState } from "react";
import {
  getAdminOrders,
  type AdminOrderListItem,
} from "../../../services/api/admin-order.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminPaymentsPage.css";

import {
  getPendingAdminBankTransactions,
  processAdminBankTransaction,
  updateAdminPaymentStatus,
  type AdminBankTransaction,
} from "../../../services/api/admin-payment.api";
type PaymentStatus = AdminOrderListItem["paymentStatus"];
type PaymentMethod = AdminOrderListItem["paymentMethod"];

type PaymentSortOrder = "newest" | "oldest";

function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN");
}

function getPaymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    COD: "COD",
    BANK_TRANSFER: "Chuyển khoản",
    WALLET: "Ví",
    ONLINE: "Online",
  };

  return labels[method];
}

function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    UNPAID: "Chưa thanh toán",
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getPaymentStatusClass(status: PaymentStatus) {
  const classes: Record<PaymentStatus, string> = {
    UNPAID: "unpaid",
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  };

  return classes[status];
}

function getOrderStatusLabel(
  status: AdminOrderListItem["status"],
) {
  const labels: Record<
    AdminOrderListItem["status"],
    string
  > = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy",
    RETURNED: "Đã trả hàng",
  };

  return labels[status];
}

function AdminPaymentsPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  );

  const [bankTransactions, setBankTransactions] = useState<
    AdminBankTransaction[]
  >([]);
  const [bankTransactionsLoading, setBankTransactionsLoading] =
    useState(false);
  const [bankTransactionsError, setBankTransactionsError] = useState("");
  const [processingBankTransactionId, setProcessingBankTransactionId] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentStatus | "ALL"
  >("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    PaymentMethod | "ALL"
  >("ALL");
  const [sortOrder, setSortOrder] = useState<PaymentSortOrder>("newest");

  async function loadOrders() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getAdminOrders(accessToken);
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách thanh toán.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBankTransactions() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setBankTransactionsError("Vui lòng đăng nhập lại bằng tài khoản Admin.");
      setBankTransactions([]);
      setBankTransactionsLoading(false);
      return;
    }

    setBankTransactionsLoading(true);
    setBankTransactionsError("");

    try {
      const data =
        await getPendingAdminBankTransactions(accessToken);

      setBankTransactions(data);
    } catch (err) {
      setBankTransactionsError(
        err instanceof Error
          ? err.message
          : "Không thể tải giao dịch chuyển khoản.",
      );
    } finally {
      setBankTransactionsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    void loadBankTransactions();
  }, []);

  const statistics = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.paymentStatus === "PAID",
    );

    const waitingOrders = orders.filter(
      (order) =>
        order.paymentStatus === "UNPAID" ||
        order.paymentStatus === "PENDING",
    );

    const unsuccessfulOrders = orders.filter(
      (order) =>
        order.paymentStatus === "FAILED" ||
        order.paymentStatus === "REFUNDED",
    );

    const paidAmount = paidOrders.reduce(
      (total, order) => total + Number(order.totalAmount || 0),
      0,
    );

    return {
      total: orders.length,
      paid: paidOrders.length,
      waiting: waitingOrders.length,
      unsuccessful: unsuccessfulOrders.length,
      paidAmount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");

    return orders
      .filter((order) => {
        const matchesSearch =
          !normalizedSearch ||
          order.orderNumber
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch) ||
          order.account.person.fullName
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch);

        const matchesPaymentStatus =
          paymentStatusFilter === "ALL" ||
          order.paymentStatus === paymentStatusFilter;

        const matchesPaymentMethod =
          paymentMethodFilter === "ALL" ||
          order.paymentMethod === paymentMethodFilter;

        return (
          matchesSearch &&
          matchesPaymentStatus &&
          matchesPaymentMethod
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        return sortOrder === "newest"
          ? timeB - timeA
          : timeA - timeB;
      });
  }, [
    orders,
    searchTerm,
    paymentStatusFilter,
    paymentMethodFilter,
    sortOrder,
  ]);

  async function handlePaymentStatus(
    order: AdminOrderListItem,
    status: "PENDING" | "PAID" | "FAILED",
  ) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessingOrderId(order.id);
      setError("");

      await updateAdminPaymentStatus(
        accessToken,
        order.id,
        { status },
      );

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái thanh toán.",
      );
    } finally {
      setProcessingOrderId(null);
    }
  }

  async function handleProcessBankTransaction(
    transaction: AdminBankTransaction,
  ) {
    const confirmed = window.confirm(
      `Xác nhận đối soát giao dịch chuyển khoản ${transaction.id} với số tiền ${formatMoney(transaction.amount)}?`,
    );

    if (!confirmed) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setBankTransactionsError(
        "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      );
      return;
    }

    setProcessingBankTransactionId(transaction.id);
    setBankTransactionsError("");

    try {
      await processAdminBankTransaction(
        accessToken,
        transaction.id,
      );

      await Promise.all([
        loadBankTransactions(),
        loadOrders(),
      ]);
    } catch (err) {
      setBankTransactionsError(
        err instanceof Error
          ? err.message
          : "Không thể xử lý giao dịch chuyển khoản.",
      );
    } finally {
      setProcessingBankTransactionId(null);
    }
  }

  function renderActions(order: AdminOrderListItem) {
    const isProcessing = processingOrderId === order.id;


    if (order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PENDING") {
      return (
        <div className="admin-payment-actions">
          <button
            className="admin-payment-button admin-payment-button-danger"
            disabled={isProcessing}
            onClick={() => void handlePaymentStatus(order, "FAILED")}
          >
            {isProcessing ? "Đang xử lý..." : "Thất bại"}
          </button>
        </div>
      );
    }


    if (
      order.paymentMethod === "COD" &&
      order.paymentStatus === "UNPAID" &&
      order.status === "DELIVERED"
    ) {
      return (
        <button
          className="admin-payment-button admin-payment-button-success"
          disabled={isProcessing}
          onClick={() =>
            void handlePaymentStatus(order, "PAID")
          }
        >
          {isProcessing ? "Đang xử lý..." : "Xác nhận"}
        </button>
      );
    }

    return (
      <span className="admin-payment-terminal">
        Không có thao tác
      </span>
    );
  }

  function resetFilters() {
    setSearchTerm("");
    setPaymentStatusFilter("ALL");
    setPaymentMethodFilter("ALL");
    setSortOrder("newest");
  }

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    paymentStatusFilter !== "ALL" ||
    paymentMethodFilter !== "ALL" ||
    sortOrder !== "newest";

  return (
    <section className="admin-payments-page">
      <div className="admin-page-header">
        <div>
          <h1>Thanh toán</h1>
          <p>
            Theo dõi giao dịch và quản lý trạng thái thanh toán đơn hàng.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-payment-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            className="admin-payment-error-retry"
            onClick={() => void loadOrders()}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="admin-payment-statistics">
        <div className="admin-payment-stat-card">
          <div className="admin-payment-stat-heading">
            <span className="admin-payment-stat-icon total">
            </span>

            <span className="admin-payment-stat-label">
              Tổng giao dịch
            </span>
          </div>

          <strong className="admin-payment-stat-value">
            {statistics.total.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-payment-stat-description">
            Đơn hàng trong danh sách
          </span>
        </div>

        <div className="admin-payment-stat-card">
          <div className="admin-payment-stat-heading">
            <span className="admin-payment-stat-icon paid">
            </span>

            <span className="admin-payment-stat-label">
              Đã thanh toán
            </span>
          </div>

          <strong className="admin-payment-stat-value">
            {statistics.paid.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-payment-stat-description">
            {formatMoney(statistics.paidAmount)}
          </span>
        </div>

        <div className="admin-payment-stat-card">
          <div className="admin-payment-stat-heading">
            <span className="admin-payment-stat-icon waiting">
            </span>

            <span className="admin-payment-stat-label">
              Chờ thanh toán
            </span>
          </div>

          <strong className="admin-payment-stat-value">
            {statistics.waiting.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-payment-stat-description">
            Chưa thanh toán hoặc đang chờ
          </span>
        </div>

        <div className="admin-payment-stat-card">
          <div className="admin-payment-stat-heading">
            <span className="admin-payment-stat-icon unsuccessful">
            </span>

            <span className="admin-payment-stat-label">
              Thất bại / Hoàn tiền
            </span>
          </div>

          <strong className="admin-payment-stat-value">
            {statistics.unsuccessful.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-payment-stat-description">
            Giao dịch thất bại hoặc đã hoàn
          </span>
        </div>
      </div>

      <section className="admin-bank-reconciliation">
        <div className="admin-bank-reconciliation-header">
          <div>
            <h2>Đối soát chuyển khoản ngân hàng</h2>
            <p>
              Kiểm tra giao dịch chuyển khoản và đối soát tự động
              với hướng dẫn thanh toán của đơn hàng.
            </p>
          </div>

          <button
            type="button"
            className="admin-payment-refresh-button"
            onClick={() => void loadBankTransactions()}
            disabled={
              bankTransactionsLoading ||
              processingBankTransactionId !== null
            }
          >
            {bankTransactionsLoading ? "Đang tải..." : "Làm mới giao dịch"}
          </button>
        </div>

        {bankTransactionsError && (
          <div className="admin-payment-error">
            <span>{bankTransactionsError}</span>

            <button
              type="button"
              className="admin-payment-error-retry"
              onClick={() => void loadBankTransactions()}
              disabled={bankTransactionsLoading}
            >
              Thử lại
            </button>
          </div>
        )}

        {bankTransactionsLoading ? (
          <div className="admin-payment-empty">
            <p>Đang tải giao dịch chuyển khoản...</p>
          </div>
        ) : bankTransactions.length === 0 ? (
          <div className="admin-payment-empty">
            <strong>Không có giao dịch chờ đối soát</strong>
            <p>
              Các giao dịch chuyển khoản chưa xử lý sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="admin-payment-table-wrapper">
            <table className="admin-payment-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Tài khoản gửi</th>
                  <th>Tài khoản nhận</th>
                  <th>Số tiền</th>
                  <th>Nội dung chuyển khoản</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {bankTransactions.map((transaction) => {
                  const isProcessing =
                    processingBankTransactionId === transaction.id;

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <strong>{transaction.id}</strong>
                      </td>

                      <td>
                        {transaction.fromBankAccount?.accountNumber ?? "—"}
                      </td>

                      <td>
                        {transaction.toBankAccount?.accountNumber ?? "—"}
                      </td>

                      <td>
                        <strong className="admin-payment-amount">
                          {formatMoney(transaction.amount)}
                        </strong>
                      </td>

                      <td>
                        <span className="admin-bank-transaction-description">
                          {transaction.description || "Không có nội dung"}
                        </span>
                      </td>

                      <td>
                        <span className="admin-payment-date">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-payment-button admin-payment-button-success"
                          disabled={
                            processingBankTransactionId !== null ||
                            bankTransactionsLoading
                          }
                          onClick={() =>
                            void handleProcessBankTransaction(transaction)
                          }
                        >
                          {isProcessing ? "Đang xử lý..." : "Đối soát"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-payment-toolbar">
        <div className="admin-payment-toolbar-heading">
          <div>
            <h2>Danh sách giao dịch</h2>
            <p>
              Tìm kiếm, lọc và theo dõi các khoản thanh toán.
            </p>
          </div>

          <button
            type="button"
            className="admin-payment-refresh-button"
            onClick={() => void loadOrders()}
            disabled={loading || processingOrderId !== null}
          >
            Làm mới
          </button>
        </div>

        <div className="admin-payment-filters">
          <div className="admin-payment-search">

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã đơn, tên khách hàng..."
              aria-label="Tìm mã đơn hoặc tên khách hàng"
            />
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(event) =>
              setPaymentStatusFilter(
                event.target.value as PaymentStatus | "ALL",
              )
            }
            aria-label="Lọc theo trạng thái thanh toán"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="FAILED">Thất bại</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(event) =>
              setPaymentMethodFilter(
                event.target.value as PaymentMethod | "ALL",
              )
            }
            aria-label="Lọc theo phương thức thanh toán"
          >
            <option value="ALL">Tất cả phương thức</option>
            <option value="COD">COD</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="WALLET">Ví</option>
            <option value="ONLINE">Online</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value as PaymentSortOrder)
            }
            aria-label="Sắp xếp theo thời gian"
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="admin-payment-reset-button"
              onClick={resetFilters}
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="admin-payment-table-meta">
        <span>
          Hiển thị{" "}
          <strong>{filteredOrders.length.toLocaleString("vi-VN")}</strong>
          {" "} / {orders.length.toLocaleString("vi-VN")} đơn hàng
        </span>
      </div>

      {loading ? (
        <div className="admin-payment-empty">
          <span className="admin-payment-loading-spinner" />
          <span>Đang tải dữ liệu thanh toán...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-payment-empty">
          <span className="admin-payment-empty-icon">
            ▤
          </span>

          <strong>Chưa có giao dịch</strong>

          <p>Danh sách thanh toán hiện chưa có đơn hàng nào.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-payment-empty">
          <span className="admin-payment-empty-icon">
            ▤
          </span>

          <strong>Không tìm thấy giao dịch phù hợp</strong>

          <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc.</p>

          <button
            type="button"
            className="admin-payment-reset-button"
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="admin-payment-table-wrapper">
          <table className="admin-payment-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Khách hàng</th>
                <th>Phương thức</th>
                <th>Trạng thái thanh toán</th>
                <th>Trạng thái đơn</th>
                <th>Tổng tiền</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className="admin-payment-order-number">
                      {order.orderNumber}
                    </strong>
                  </td>

                  <td>
                    <span className="admin-payment-customer">
                      {order.account.person.fullName}
                    </span>
                  </td>

                  <td>
                    <span className="admin-payment-method">
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`admin-payment-status admin-payment-status-${getPaymentStatusClass(
                        order.paymentStatus,
                      )}`}
                    >
                      <span className="admin-payment-status-dot" />
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </span>
                  </td>

                  <td>
                    <span className="admin-payment-order-status">
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </td>

                  <td>
                    <strong className="admin-payment-amount">
                      {formatMoney(order.totalAmount)}
                    </strong>
                  </td>

                  <td>
                    <span className="admin-payment-date">
                      {formatDate(order.createdAt)}
                    </span>
                  </td>

                  <td>
                    {renderActions(order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminPaymentsPage;