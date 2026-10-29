import { useEffect, useMemo, useState } from "react";
import {
  getAdminOrderById,
  getAdminOrders,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderListItem,
} from "../../../services/api/admin-order.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminOrderProcessingPage.css";

type ProcessingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING";

type OrderActionStatus =
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

const PROCESSING_STATUSES: ProcessingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
];

const STATUS_LABELS: Record<AdminOrderListItem["status"], string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã trả hàng",
};

const ORDER_STATUS_LABELS: Record<OrderActionStatus, string> = {
  CONFIRMED: "Xác nhận đơn",
  PROCESSING: "Chuyển sang xử lý",
  SHIPPING: "Chuyển sang đang giao",
  DELIVERED: "Xác nhận đã giao",
  CANCELLED: "Hủy đơn",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN");
}

function getPaymentMethodLabel(
  method: AdminOrderListItem["paymentMethod"],
) {
  const labels: Record<AdminOrderListItem["paymentMethod"], string> = {
    COD: "COD",
    BANK_TRANSFER: "Chuyển khoản",
    WALLET: "Ví",
    ONLINE: "Online",
  };

  return labels[method];
}

function getPaymentStatusLabel(
  status: AdminOrderListItem["paymentStatus"],
) {
  const labels: Record<AdminOrderListItem["paymentStatus"], string> = {
    UNPAID: "Chưa thanh toán",
    PENDING: "Đang chờ thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thanh toán thất bại",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getStatusBadgeClass(status: AdminOrderListItem["status"]) {
  switch (status) {
    case "PENDING":
      return "admin-badge-pending";
    case "CONFIRMED":
      return "admin-badge-info";
    case "PROCESSING":
      return "admin-badge-warning";
    case "SHIPPING":
      return "admin-badge-info";
    case "DELIVERED":
      return "admin-badge-active";
    case "CANCELLED":
      return "admin-badge-danger";
    case "RETURNED":
      return "admin-badge-neutral";
    default:
      return "admin-badge-neutral";
  }
}

function getPaymentStatusBadgeClass(
  status: AdminOrderListItem["paymentStatus"],
) {
  switch (status) {
    case "PAID":
      return "admin-badge-active";
    case "PENDING":
      return "admin-badge-warning";
    case "UNPAID":
      return "admin-badge-neutral";
    case "FAILED":
      return "admin-badge-danger";
    case "REFUNDED":
      return "admin-badge-info";
    default:
      return "admin-badge-neutral";
  }
}

function getNextStatuses(
  status: AdminOrderListItem["status"],
): OrderActionStatus[] {
  switch (status) {
    case "PENDING":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PROCESSING", "CANCELLED"];
    case "PROCESSING":
      return ["SHIPPING", "CANCELLED"];
    case "SHIPPING":
      return ["DELIVERED", "CANCELLED"];
    default:
      return [];
  }
}

function getOrderStatusLabel(status: AdminOrderListItem["status"]) {
  return STATUS_LABELS[status] ?? status;
}

function AdminOrderProcessingPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | ProcessingStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function loadOrders() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("AUTHORIZATION_REQUIRED");
      setLoading(false);
      return;
    }

    try {
      const data = await getAdminOrders(accessToken);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ORDER_LIST_FAILED");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  // Reset to the first page when the search, status filter, or page size changes.
  useEffect(() => {
    setPage(1);
  }, [search, selectedStatus, pageSize]);

  const processingOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders
      .filter((order) =>
        PROCESSING_STATUSES.includes(order.status as ProcessingStatus),
      )
      .filter((order) => {
        const matchesStatus =
          selectedStatus === "ALL" || order.status === selectedStatus;

        const matchesSearch =
          normalizedSearch === "" ||
          order.orderNumber.toLowerCase().includes(normalizedSearch) ||
          order.account.person.fullName.toLowerCase().includes(normalizedSearch) ||
          order.account.person.email.toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      });
  }, [orders, selectedStatus, search]);

  const totalPages = Math.ceil(processingOrders.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const startRecord =
    processingOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, processingOrders.length);
  const paginatedOrders = processingOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Clamp the current page if an order leaves the processing queue after a status update.
  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPage(1);
    } else if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const statusCounts = useMemo(() => {
    return {
      total: orders.filter((order) =>
        PROCESSING_STATUSES.includes(order.status as ProcessingStatus),
      ).length,
      PENDING: orders.filter((order) => order.status === "PENDING").length,
      CONFIRMED: orders.filter((order) => order.status === "CONFIRMED").length,
      PROCESSING: orders.filter((order) => order.status === "PROCESSING").length,
      SHIPPING: orders.filter((order) => order.status === "SHIPPING").length,
    };
  }, [orders]);

  async function handleSelectOrder(orderId: string) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setDetailError("AUTHORIZATION_REQUIRED");
      return;
    }

    setDetailLoading(true);
    setDetailError(null);
    setStatusError(null);

    try {
      const data = await getAdminOrderById(accessToken, orderId);
      setSelectedOrder(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "ORDER_DETAIL_FAILED");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateStatus(status: OrderActionStatus) {
    if (!selectedOrder) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setStatusError("AUTHORIZATION_REQUIRED");
      return;
    }

    setStatusUpdating(true);
    setStatusError(null);

    try {
      const updatedOrder = await updateAdminOrderStatus(
        accessToken,
        selectedOrder.id,
        { status },
      );

      setSelectedOrder(updatedOrder);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === updatedOrder.id
            ? {
                ...order,
                status: updatedOrder.status,
                paymentStatus: updatedOrder.paymentStatus,
                updatedAt: updatedOrder.updatedAt,
              }
            : order,
        ),
      );

      // Reload after a successful transition so timestamps and payment state stay in sync.
      await loadOrders();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "ORDER_STATUS_UPDATE_FAILED",
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  function closeDrawer() {
    if (statusUpdating) {
      return;
    }

    setSelectedOrder(null);
    setDetailError(null);
    setStatusError(null);
  }

  return (
    <div className="admin-page admin-order-processing-page">
      <div className="admin-page-header">
        <div>
          <h1>Xử lý đơn hàng</h1>
          <p>Theo dõi và xử lý các đơn hàng đang trong quy trình vận hành.</p>
        </div>
      </div>

      {loading && <div className="admin-state">Đang tải đơn hàng...</div>}

      {!loading && error && (
        <div className="admin-state admin-state-error">
          Không thể tải đơn hàng: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="admin-order-processing-summary">
            <div className="admin-order-processing-summary-card">
              <span>Đang xử lý</span>
              <strong>{formatNumber(statusCounts.total)}</strong>
            </div>
            <div className="admin-order-processing-summary-card">
              <span>Chờ xử lý</span>
              <strong>{formatNumber(statusCounts.PENDING)}</strong>
            </div>
            <div className="admin-order-processing-summary-card">
              <span>Đã xác nhận</span>
              <strong>{formatNumber(statusCounts.CONFIRMED)}</strong>
            </div>
            <div className="admin-order-processing-summary-card">
              <span>Đang xử lý</span>
              <strong>{formatNumber(statusCounts.PROCESSING)}</strong>
            </div>
            <div className="admin-order-processing-summary-card">
              <span>Đang giao</span>
              <strong>{formatNumber(statusCounts.SHIPPING)}</strong>
            </div>
          </section>

          <section className="admin-card admin-order-processing-card">
            <div className="admin-card-header admin-order-processing-header">
              <div>
                <h2>Hàng đợi xử lý</h2>
                <p>
                  Tìm thấy {formatNumber(processingOrders.length)} đơn cần theo dõi.
                </p>
              </div>
            </div>

            <div className="admin-order-processing-toolbar">
              <input
                className="admin-input"
                type="search"
                placeholder="Tìm mã đơn, tên khách hàng hoặc email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Tìm kiếm đơn hàng cần xử lý"
              />

              <div className="admin-order-processing-status-filter">
                <button
                  type="button"
                  className={selectedStatus === "ALL" ? "active" : ""}
                  onClick={() => setSelectedStatus("ALL")}
                >
                  Tất cả <span>{formatNumber(statusCounts.total)}</span>
                </button>

                {PROCESSING_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={selectedStatus === status ? "active" : ""}
                    onClick={() => setSelectedStatus(status)}
                  >
                    {STATUS_LABELS[status]}
                    <span>{formatNumber(statusCounts[status])}</span>
                  </button>
                ))}
              </div>
            </div>

            {processingOrders.length === 0 ? (
              <div className="admin-order-processing-empty">
                <strong>Không có đơn hàng phù hợp.</strong>
                <span>Thử thay đổi trạng thái hoặc từ khóa tìm kiếm.</span>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table admin-order-processing-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Khách hàng</th>
                      <th>Platform</th>
                      <th>Tổng tiền</th>
                      <th>Thanh toán</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.orderNumber}</strong></td>
                        <td>
                          <div className="admin-order-processing-customer">
                            <strong>{order.account.person.fullName}</strong>
                            <span>{order.account.person.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className="admin-platform-badge">
                            {order.account.platform}
                          </span>
                        </td>
                        <td><strong>{formatMoney(order.totalAmount)}</strong></td>
                        <td>
                          <div className="admin-order-processing-payment">
                            <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                            <span
                              className={`admin-badge ${getPaymentStatusBadgeClass(
                                order.paymentStatus,
                              )}`}
                            >
                              {getPaymentStatusLabel(order.paymentStatus)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${getStatusBadgeClass(order.status)}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <div className="admin-order-processing-actions">
                            <button
                              type="button"
                              className="admin-button"
                              onClick={() => void handleSelectOrder(order.id)}
                            >
                              Xử lý
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-secondary"
                              onClick={() => void handleSelectOrder(order.id)}
                            >
                              Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-order-processing-pagination">
              <div className="admin-order-processing-pagination-info">
                <span>
                  Hiển thị <strong>{formatNumber(startRecord)}–{formatNumber(endRecord)}</strong>
                  {" / "}
                  <strong>{formatNumber(processingOrders.length)}</strong>
                  {" đơn hàng"}
                </span>

                <select
                  className="admin-select admin-order-processing-page-size"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  aria-label="Số đơn hàng mỗi trang"
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>

              <div
                className="admin-order-processing-pagination-controls"
                aria-label="Phân trang hàng đợi xử lý"
              >
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  aria-label="Trang trước"
                  disabled={totalPages === 0 || currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  ‹
                </button>

                <span>
                  {formatNumber(totalPages === 0 ? 0 : currentPage)}
                  {" / "}
                  {formatNumber(totalPages)}
                </span>

                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  aria-label="Trang sau"
                  disabled={totalPages === 0 || currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          </section>

          {(detailLoading || selectedOrder || detailError) && (
            <div className="admin-drawer-backdrop">
              <aside
                className="admin-drawer admin-order-processing-drawer"
                aria-label="Xử lý đơn hàng"
              >
                <div className="admin-drawer-header">
                  <div>
                    <h2>Xử lý đơn hàng</h2>
                    <p>
                      {selectedOrder
                        ? `Order Number: ${selectedOrder.orderNumber}`
                        : "Đang tải thông tin..."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary admin-button-small"
                    onClick={closeDrawer}
                    disabled={statusUpdating}
                  >
                    Đóng
                  </button>
                </div>

                <div className="admin-drawer-body">
                  {detailLoading && (
                    <div className="admin-state">Đang tải chi tiết đơn hàng...</div>
                  )}
                  {detailError && !detailLoading && (
                    <div className="admin-state admin-state-error">
                      Không thể tải chi tiết: {detailError}
                    </div>
                  )}
                  {selectedOrder && !detailLoading && !detailError && (
                    <ProcessingOrderDetail
                      order={selectedOrder}
                      statusUpdating={statusUpdating}
                      statusError={statusError}
                      onUpdateStatus={handleUpdateStatus}
                    />
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ProcessingOrderDetailProps {
  order: AdminOrderDetail;
  statusUpdating: boolean;
  statusError: string | null;
  onUpdateStatus: (status: OrderActionStatus) => void;
}

function ProcessingOrderDetail({
  order,
  statusUpdating,
  statusError,
  onUpdateStatus,
}: ProcessingOrderDetailProps) {
  const nextStatuses = getNextStatuses(order.status);
  const canProcess = nextStatuses.length > 0;

  return (
    <div className="admin-order-processing-detail">
      <section className="admin-card admin-order-processing-current-card">
        <div className="admin-card-header">
          <h3>Trạng thái đơn hàng</h3>
        </div>
        <div className="admin-order-processing-current-status">
          <span className={`admin-badge ${getStatusBadgeClass(order.status)}`}>
            {getOrderStatusLabel(order.status)}
          </span>

          {canProcess && (
            <div className="admin-order-processing-next-actions">
              {nextStatuses.map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  className={
                    nextStatus === "CANCELLED"
                      ? "admin-button admin-button-danger"
                      : "admin-button"
                  }
                  disabled={statusUpdating}
                  onClick={() => onUpdateStatus(nextStatus)}
                >
                  {statusUpdating
                    ? "Đang cập nhật..."
                    : ORDER_STATUS_LABELS[nextStatus]}
                </button>
              ))}
            </div>
          )}
        </div>

        {statusError && (
          <div className="admin-state-error admin-order-processing-status-error">
            Không thể cập nhật trạng thái: {statusError}
          </div>
        )}
        {!canProcess && (
          <p className="admin-muted">
            Đơn hàng không còn transition xử lý tiếp theo.
          </p>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-header"><h3>Thông tin khách hàng</h3></div>
        <div className="admin-order-processing-info">
          <div><span>Họ tên</span><strong>{order.account.person.fullName}</strong></div>
          <div><span>Email</span><strong>{order.account.person.email}</strong></div>
          <div><span>Số điện thoại</span><strong>{order.account.person.phone}</strong></div>
          <div><span>Platform</span><strong>{order.account.platform}</strong></div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header"><h3>Địa chỉ nhận hàng</h3></div>
        {order.address ? (
          <div className="admin-order-processing-info">
            <div><span>Người nhận</span><strong>{order.address.receiverName}</strong></div>
            <div><span>Số điện thoại</span><strong>{order.address.phone}</strong></div>
            <div><span>Địa chỉ</span><strong>{order.address.addressLine}</strong></div>
            <div>
              <span>Khu vực</span>
              <strong>{order.address.ward}, {order.address.district}, {order.address.province}</strong>
            </div>
          </div>
        ) : (
          <p className="admin-muted">Không có địa chỉ nhận hàng.</p>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-header"><h3>Thanh toán</h3></div>
        <div className="admin-order-processing-payment-summary">
          <div><span>Phương thức</span><strong>{getPaymentMethodLabel(order.paymentMethod)}</strong></div>
          <div><span>Trạng thái</span><strong>{getPaymentStatusLabel(order.paymentStatus)}</strong></div>
          <div className="admin-order-processing-payment-total">
            <span>Tổng tiền</span><strong>{formatMoney(order.totalAmount)}</strong>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Sản phẩm</h3>
            <p className="admin-card-subtitle">{formatNumber(order.items.length)} sản phẩm</p>
          </div>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table admin-order-processing-items">
            <thead>
              <tr><th>Sản phẩm</th><th>SKU</th><th>SL</th><th>Đơn giá</th></tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.productName}</strong>
                    <span className="admin-order-processing-variant">{item.variant.name}</span>
                  </td>
                  <td><span className="admin-code-text">{item.sku}</span></td>
                  <td>{formatNumber(item.quantity)}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header"><h3>Thời gian</h3></div>
        <div className="admin-order-processing-info">
          <div><span>Tạo đơn</span><strong>{formatDate(order.createdAt)}</strong></div>
          <div><span>Cập nhật</span><strong>{formatDate(order.updatedAt)}</strong></div>
          <div><span>Giao vận chuyển</span><strong>{formatDate(order.shippedAt)}</strong></div>
          <div><span>Đã giao</span><strong>{formatDate(order.deliveredAt)}</strong></div>
          <div><span>Khách đã nhận</span><strong>{formatDate(order.customerReceivedAt)}</strong></div>
          <div>
            <span>Đủ điều kiện hoa hồng</span>
            <strong>{formatDate(order.commissionEligibleAt)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminOrderProcessingPage;
