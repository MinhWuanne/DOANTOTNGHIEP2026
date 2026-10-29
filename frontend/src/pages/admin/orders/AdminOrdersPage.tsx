import { useEffect, useMemo, useState } from "react";
import {
  getAdminOrderById,
  getAdminOrders,
  type AdminOrderDetail,
  type AdminOrderListItem,
} from "../../../services/api/admin-order.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminOrdersPage.css";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

function getStatusLabel(status: AdminOrderListItem["status"]) {
  const labels: Record<AdminOrderListItem["status"], string> = {
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy",
    RETURNED: "Đã trả hàng",
  };
  return labels[status];
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

type OrderStatusFilter = "ALL" | AdminOrderListItem["status"];
type PaymentStatusFilter = "ALL" | AdminOrderListItem["paymentStatus"];
type PaymentMethodFilter = "ALL" | AdminOrderListItem["paymentMethod"];
type PlatformFilter = "ALL" | AdminOrderListItem["account"]["platform"];
type DatePreset =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

type SortOrder = "NEWEST" | "OLDEST";

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

function getPlatformLabel(platform: AdminOrderListItem["account"]["platform"]) {
  return platform === "MEMBER" ? "Member" : "Franchise";
}

function getDatePresetLabel(preset: DatePreset) {
  const labels: Record<DatePreset, string> = {
    ALL: "Tất cả thời gian",
    TODAY: "Hôm nay",
    YESTERDAY: "Hôm qua",
    LAST_7_DAYS: "7 ngày qua",
    LAST_30_DAYS: "30 ngày qua",
    THIS_MONTH: "Tháng này",
    LAST_MONTH: "Tháng trước",
    CUSTOM: "Khoảng ngày",
  };
  return labels[preset];
}

function getDateRange(preset: DatePreset, from: string, to: string) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  switch (preset) {
    case "TODAY":
      return { start: startOfToday, end: endOfToday };
    case "YESTERDAY": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 1);
      const end = new Date(startOfToday);
      end.setMilliseconds(-1);
      return { start, end };
    }
    case "LAST_7_DAYS": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfToday };
    }
    case "LAST_30_DAYS": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfToday };
    }
    case "THIS_MONTH":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfToday,
      };
    case "LAST_MONTH":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        ),
      };
    case "CUSTOM": {
      if (!from || !to) return null;
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T23:59:59.999`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }
      return { start, end };
    }
    case "ALL":
    default:
      return null;
  }
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] =
    useState<OrderStatusFilter>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [platformFilter, setPlatformFilter] =
    useState<PlatformFilter>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<SortOrder>("NEWEST");

  useEffect(() => {
    setPage(1);
  }, [
    search,
    datePreset,
    customFrom,
    customTo,
    orderStatusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    platformFilter,
    pageSize,
    sortOrder,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      const accessToken = getAccessToken("ADMIN");
      if (!accessToken) {
        if (!cancelled) {
          setError("AUTHORIZATION_REQUIRED");
          setLoading(false);
        }
        return;
      }

      try {
        const data = await getAdminOrders(accessToken);
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "ORDER_LIST_FAILED",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelectOrder(id: string) {
    const accessToken = getAccessToken("ADMIN");
    if (!accessToken) {
      setDetailError("AUTHORIZATION_REQUIRED");
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);
    setSelectedOrder(null);

    try {
      const data = await getAdminOrderById(accessToken, id);
      setSelectedOrder(data);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "ORDER_DETAIL_FAILED",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  const dateRange = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const hasIncompleteCustomDate =
    datePreset === "CUSTOM" && (!customFrom || !customTo);
  const hasInvalidCustomDate =
    datePreset === "CUSTOM" &&
    !!customFrom &&
    !!customTo &&
    customFrom > customTo;

  const dateFilteredOrders = useMemo(() => {
    if (hasIncompleteCustomDate || hasInvalidCustomDate) return [];
    if (!dateRange) return orders;

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
  }, [orders, dateRange, hasIncompleteCustomDate, hasInvalidCustomDate]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return dateFilteredOrders.filter((order) => {
      const matchesSearch =
        normalizedSearch === "" ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.account.person.fullName.toLowerCase().includes(normalizedSearch) ||
        order.account.person.email.toLowerCase().includes(normalizedSearch);

      const matchesOrderStatus =
        orderStatusFilter === "ALL" || order.status === orderStatusFilter;
      const matchesPaymentStatus =
        paymentStatusFilter === "ALL" ||
        order.paymentStatus === paymentStatusFilter;
      const matchesPaymentMethod =
        paymentMethodFilter === "ALL" ||
        order.paymentMethod === paymentMethodFilter;
      const matchesPlatform =
        platformFilter === "ALL" ||
        order.account.platform === platformFilter;

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesPaymentMethod &&
        matchesPlatform
      );
    });
  }, [
    dateFilteredOrders,
    search,
    orderStatusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    platformFilter,
  ]);

  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "NEWEST" ? dateB - dateA : dateA - dateB;
    });
  }, [filteredOrders, sortOrder]);

  const totalPages = Math.ceil(sortedFilteredOrders.length / pageSize);
  const currentPage =
    totalPages === 0 ? 1 : Math.min(page, totalPages);
  const startRecord =
    sortedFilteredOrders.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(
    currentPage * pageSize,
    sortedFilteredOrders.length,
  );
  const paginatedOrders = sortedFilteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const stats = useMemo(() => {
    const totalValue = dateFilteredOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );

    return {
      total: dateFilteredOrders.length,
      pending: dateFilteredOrders.filter((order) => order.status === "PENDING").length,
      confirmed: dateFilteredOrders.filter((order) => order.status === "CONFIRMED").length,
      processing: dateFilteredOrders.filter((order) => order.status === "PROCESSING").length,
      shipping: dateFilteredOrders.filter((order) => order.status === "SHIPPING").length,
      delivered: dateFilteredOrders.filter((order) => order.status === "DELIVERED").length,
      cancelled: dateFilteredOrders.filter((order) => order.status === "CANCELLED").length,
      returned: dateFilteredOrders.filter((order) => order.status === "RETURNED").length,
      totalValue,
    };
  }, [dateFilteredOrders]);

  const advancedFilterCount = [
    orderStatusFilter !== "ALL",
    paymentStatusFilter !== "ALL",
    paymentMethodFilter !== "ALL",
    platformFilter !== "ALL",
  ].filter(Boolean).length;

  const hasActiveFilters =
    search.trim() !== "" || datePreset !== "ALL" || advancedFilterCount > 0;

  function clearAllFilters() {
    setSearch("");
    setDatePreset("ALL");
    setCustomFrom("");
    setCustomTo("");
    setOrderStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setPaymentMethodFilter("ALL");
    setPlatformFilter("ALL");
    setDateMenuOpen(false);
    setFilterOpen(false);
  }

  function selectDatePreset(preset: DatePreset) {
    setDatePreset(preset);
    if (preset !== "CUSTOM") {
      setCustomFrom("");
      setCustomTo("");
    }
    setDateMenuOpen(false);
  }

  function clearAdvancedFilters() {
    setOrderStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setPaymentMethodFilter("ALL");
    setPlatformFilter("ALL");
  }

  const dateLabel =
    datePreset === "CUSTOM"
      ? customFrom && customTo
        ? `${formatShortDate(customFrom)} → ${formatShortDate(customTo)}`
        : "Khoảng ngày"
      : getDatePresetLabel(datePreset);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>Tra cứu, lọc và theo dõi các đơn hàng trong hệ thống.</p>
        </div>
      </div>

      {loading && <div className="admin-state">Đang tải danh sách đơn hàng...</div>}

      {!loading && error && (
        <div className="admin-state admin-state-error">
          Không thể tải đơn hàng: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="admin-order-statistics">
            <div className="admin-order-section-heading">
              <div>
                <h2>Thống kê</h2>
                <p>Thống kê theo ngày tạo đơn.</p>
              </div>
            </div>

            {datePreset === "CUSTOM" && (
              <div className="admin-order-custom-date">
                <label>
                  Từ ngày
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </label>
                <span>→</span>
                <label>
                  Đến ngày
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </label>
                {hasInvalidCustomDate && (
                  <span className="admin-order-date-error">
                    Ngày bắt đầu không được sau ngày kết thúc.
                  </span>
                )}
              </div>
            )}

            <div className="admin-order-stat-grid">
              <div className="admin-order-stat">
                <span>Tổng đơn</span>
                <strong>{formatNumber(stats.total)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Chờ xử lý</span>
                <strong>{formatNumber(stats.pending)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đã xác nhận</span>
                <strong>{formatNumber(stats.confirmed)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đang xử lý</span>
                <strong>{formatNumber(stats.processing)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đang giao</span>
                <strong>{formatNumber(stats.shipping)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đã giao</span>
                <strong>{formatNumber(stats.delivered)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đã hủy</span>
                <strong>{formatNumber(stats.cancelled)}</strong>
              </div>
              <div className="admin-order-stat">
                <span>Đã trả</span>
                <strong>{formatNumber(stats.returned)}</strong>
              </div>
              <div className="admin-order-stat admin-order-stat-value">
                <span>Tổng giá trị đơn hàng</span>
                <strong>{formatMoney(String(stats.totalValue))}</strong>
              </div>
            </div>
          </section>

          <section className="admin-card admin-order-list-card">
            <div className="admin-card-header admin-order-list-header">
              <div>
                <h2>Danh sách đơn hàng</h2>
                <p>
                  Tìm thấy {formatNumber(sortedFilteredOrders.length)} / {formatNumber(orders.length)} đơn hàng.
                </p>
              </div>
            </div>

            <div className="admin-order-toolbar">
              <div className="admin-order-search">
                <input
                  className="admin-input admin-search"
                  type="search"
                  placeholder="Tìm mã đơn, tên khách hàng hoặc email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Tìm kiếm đơn hàng"
                />
              </div>

              <div className="admin-order-sort-wrap">
                <select
                  className="admin-select admin-order-sort-select"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                  aria-label="Sắp xếp đơn hàng theo ngày tạo"
                >
                  <option value="NEWEST">Ngày tạo mới nhất</option>
                  <option value="OLDEST">Ngày tạo cũ nhất</option>
                </select>
              </div>

              <div className="admin-order-date-wrap">
                <button
                  type="button"
                  className="admin-button admin-button-secondary admin-order-date-button"
                  onClick={() => {
                    setDateMenuOpen((open) => !open);
                    setFilterOpen(false);
                  }}
                >
                  📅 {dateLabel} <span>▼</span>
                </button>

                {dateMenuOpen && (
                  <div className="admin-order-date-menu">
                    {(
                      [
                        "ALL",
                        "TODAY",
                        "YESTERDAY",
                        "LAST_7_DAYS",
                        "LAST_30_DAYS",
                        "THIS_MONTH",
                        "LAST_MONTH",
                      ] as DatePreset[]
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={datePreset === preset ? "active" : ""}
                        onClick={() => selectDatePreset(preset)}
                      >
                        {getDatePresetLabel(preset)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={datePreset === "CUSTOM" ? "active" : ""}
                      onClick={() => selectDatePreset("CUSTOM")}
                    >
                      Khoảng ngày...
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-order-filter-wrap">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => {
                    setFilterOpen((open) => !open);
                    setDateMenuOpen(false);
                  }}
                >
                  ⚙ Bộ lọc{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ""} ▼
                </button>

                {filterOpen && (
                  <div className="admin-order-filter-panel">
                    <div className="admin-order-filter-panel-header">
                      <strong>Bộ lọc đơn hàng</strong>
                      <button type="button" onClick={clearAdvancedFilters}>
                        Đặt lại
                      </button>
                    </div>

                    <label>
                      Trạng thái đơn hàng
                      <select
                        value={orderStatusFilter}
                        onChange={(event) =>
                          setOrderStatusFilter(event.target.value as OrderStatusFilter)
                        }
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="PENDING">Chờ xử lý</option>
                        <option value="CONFIRMED">Đã xác nhận</option>
                        <option value="PROCESSING">Đang xử lý</option>
                        <option value="SHIPPING">Đang giao</option>
                        <option value="DELIVERED">Đã giao</option>
                        <option value="CANCELLED">Đã hủy</option>
                        <option value="RETURNED">Đã trả hàng</option>
                      </select>
                    </label>

                    <label>
                      Trạng thái thanh toán
                      <select
                        value={paymentStatusFilter}
                        onChange={(event) =>
                          setPaymentStatusFilter(event.target.value as PaymentStatusFilter)
                        }
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="UNPAID">Chưa thanh toán</option>
                        <option value="PENDING">Đang chờ thanh toán</option>
                        <option value="PAID">Đã thanh toán</option>
                        <option value="FAILED">Thanh toán thất bại</option>
                        <option value="REFUNDED">Đã hoàn tiền</option>
                      </select>
                    </label>

                    <label>
                      Phương thức thanh toán
                      <select
                        value={paymentMethodFilter}
                        onChange={(event) =>
                          setPaymentMethodFilter(event.target.value as PaymentMethodFilter)
                        }
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="COD">COD</option>
                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                        <option value="WALLET">Ví</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </label>

                    <label>
                      Nền tảng
                      <select
                        value={platformFilter}
                        onChange={(event) =>
                          setPlatformFilter(event.target.value as PlatformFilter)
                        }
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="MEMBER">Member</option>
                        <option value="FRANCHISE">Franchise</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={clearAllFilters}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="admin-order-active-filters">
              {datePreset !== "ALL" && (
                <button
                  type="button"
                  className="admin-order-chip"
                  onClick={() => selectDatePreset("ALL")}
                >
                  📅 {dateLabel} ×
                </button>
              )}

              {orderStatusFilter !== "ALL" && (
                <button
                  type="button"
                  className="admin-order-chip"
                  onClick={() => setOrderStatusFilter("ALL")}
                >
                  Trạng thái đơn: {getStatusLabel(orderStatusFilter)} ×
                </button>
              )}

              {paymentStatusFilter !== "ALL" && (
                <button
                  type="button"
                  className="admin-order-chip"
                  onClick={() => setPaymentStatusFilter("ALL")}
                >
                  Thanh toán: {getPaymentStatusLabel(paymentStatusFilter)} ×
                </button>
              )}

              {paymentMethodFilter !== "ALL" && (
                <button
                  type="button"
                  className="admin-order-chip"
                  onClick={() => setPaymentMethodFilter("ALL")}
                >
                  Phương thức: {getPaymentMethodLabel(paymentMethodFilter)} ×
                </button>
              )}

              {platformFilter !== "ALL" && (
                <button
                  type="button"
                  className="admin-order-chip"
                  onClick={() => setPlatformFilter("ALL")}
                >
                  Nền tảng: {getPlatformLabel(platformFilter)} ×
                </button>
              )}
            </div>

            {hasInvalidCustomDate ? (
              <div className="admin-order-empty-filter">
                <strong>Khoảng ngày không hợp lệ</strong>
                <span>Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</span>
              </div>
            ) : hasIncompleteCustomDate ? (
              <div className="admin-order-empty-filter">
                <strong>Chọn khoảng ngày</strong>
                <span>Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.</span>
              </div>
            ) : sortedFilteredOrders.length === 0 ? (
              <div className="admin-order-empty-filter">
                <strong>Không tìm thấy đơn hàng phù hợp.</strong>
                <span>Thử thay đổi từ khóa, khoảng ngày hoặc bộ lọc.</span>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Khách hàng</th>
                      <th>Tổng tiền</th>
                      <th>Thanh toán</th>
                      <th>Payment Status</th>
                      <th>Order Status</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.orderNumber}</strong>
                        </td>
                        <td>
                          <div className="admin-order-customer">
                            <strong>{order.account.person.fullName}</strong>
                            <span>{order.account.person.email}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{formatMoney(order.totalAmount)}</strong>
                        </td>
                        <td>{getPaymentMethodLabel(order.paymentMethod)}</td>
                        <td>
                          <span
                            className={`admin-badge ${getPaymentStatusBadgeClass(
                              order.paymentStatus,
                            )}`}
                          >
                            {getPaymentStatusLabel(order.paymentStatus)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${getStatusBadgeClass(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => void handleSelectOrder(order.id)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-order-pagination">
              <div className="admin-order-pagination-info">
                <span>
                  Hiển thị <strong>{formatNumber(startRecord)}–{formatNumber(endRecord)}</strong>
                  {" / "}
                  <strong>{formatNumber(sortedFilteredOrders.length)}</strong>
                  {" đơn hàng"}
                </span>
                <select
                  className="admin-select admin-order-page-size"
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
                className="admin-order-pagination-controls"
                aria-label="Phân trang danh sách đơn hàng"
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
                  {formatNumber(totalPages === 0 ? 0 : currentPage)} / {formatNumber(totalPages)}
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
            <div
              className="admin-drawer-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedOrder(null);
                  setDetailError(null);
                  setDetailLoading(false);
                }
              }}
            >
              <aside className="admin-drawer admin-order-drawer" aria-label="Chi tiết đơn hàng">
                <div className="admin-drawer-header">
                  <div>
                    <h2>Chi tiết đơn hàng</h2>
                    <p>
                      {selectedOrder
                        ? `Order Number: ${selectedOrder.orderNumber}`
                        : "Đang tải thông tin đơn hàng..."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary admin-button-small"
                    onClick={() => {
                      setSelectedOrder(null);
                      setDetailError(null);
                    }}
                    aria-label="Đóng chi tiết đơn hàng"
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
                    <OrderDetail order={selectedOrder} />
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

interface OrderDetailProps {
  order: AdminOrderDetail;
}

function OrderDetail({ order }: OrderDetailProps) {
  const commissionTransactions = order.commissionTransactions ?? [];

  return (
    <div className="admin-order-detail">
      <div className="admin-order-detail-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <h3>Thông tin đơn hàng</h3>
          </div>
          <div className="admin-order-meta">
            <div>
              <span>Mã đơn hàng</span>
              <strong>{order.orderNumber}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>
                <span className={`admin-status-badge ${getStatusBadgeClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </strong>
            </div>
            <div>
              <span>Ngày tạo</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
            <div>
              <span>Cập nhật lần cuối</span>
              <strong>{formatDate(order.updatedAt)}</strong>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h3>Khách hàng</h3>
          </div>
          <div className="admin-order-info-list">
            <div>
              <span>Họ tên</span>
              <strong>{order.account.person.fullName}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{order.account.person.email}</strong>
            </div>
            <div>
              <span>Số điện thoại</span>
              <strong>{order.account.person.phone}</strong>
            </div>
            <div>
              <span>Platform</span>
              <strong>
                <span className="admin-platform-badge">{order.account.platform}</span>
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h3>Địa chỉ nhận hàng</h3>
          </div>
          {order.address ? (
            <div className="admin-order-info-list">
              <div>
                <span>Người nhận</span>
                <strong>{order.address.receiverName}</strong>
              </div>
              <div>
                <span>Số điện thoại</span>
                <strong>{order.address.phone}</strong>
              </div>
              <div>
                <span>Địa chỉ</span>
                <strong>{order.address.addressLine}</strong>
              </div>
              <div>
                <span>Khu vực</span>
                <strong>
                  {order.address.ward}, {order.address.district}, {order.address.province}
                </strong>
              </div>
            </div>
          ) : (
            <p className="admin-muted">Không có địa chỉ nhận hàng.</p>
          )}
        </section>

        <section className="admin-card admin-order-payment-card">
          <div className="admin-card-header">
            <h3>Thanh toán</h3>
          </div>
          <div className="admin-order-payment-summary">
            <div className="admin-order-payment-row">
              <span>Phương thức</span>
              <strong>{getPaymentMethodLabel(order.paymentMethod)}</strong>
            </div>
            <div className="admin-order-payment-row">
              <span>Trạng thái</span>
              <strong>
                <span
                  className={`admin-payment-status-badge ${getPaymentStatusBadgeClass(
                    order.paymentStatus,
                  )}`}
                >
                  {getPaymentStatusLabel(order.paymentStatus)}
                </span>
              </strong>
            </div>
            <div className="admin-order-payment-divider" />
            <div className="admin-order-payment-row">
              <span>Tạm tính</span>
              <strong>{formatMoney(order.subtotal)}</strong>
            </div>
            <div className="admin-order-payment-row">
              <span>Phí vận chuyển</span>
              <strong>{formatMoney(order.shippingFee)}</strong>
            </div>
            <div className="admin-order-payment-row">
              <span>Giảm giá</span>
              <strong className="admin-order-discount">-{formatMoney(order.discount)}</strong>
            </div>
            <div className="admin-order-payment-divider" />
            <div className="admin-order-payment-total">
              <span>Tổng tiền</span>
              <strong>{formatMoney(order.totalAmount)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Sản phẩm trong đơn</h3>
            <p className="admin-card-subtitle">{order.items.length} sản phẩm</p>
          </div>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table admin-order-items-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>Variant</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.productName}</strong></td>
                  <td><span className="admin-code-text">{item.sku}</span></td>
                  <td>{item.variant.name}</td>
                  <td className="admin-table-number">{item.quantity}</td>
                  <td className="admin-table-money">{formatMoney(item.unitPrice)}</td>
                  <td className="admin-table-money"><strong>{formatMoney(item.subtotal)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}><strong>Tổng tiền sản phẩm</strong></td>
                <td className="admin-table-money"><strong>{formatMoney(order.subtotal)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Commission</h3>
            <p className="admin-card-subtitle">Thông tin commission của đơn hàng</p>
          </div>
        </div>
        {commissionTransactions.length === 0 ? (
          <div className="admin-order-empty-section">
            <div className="admin-order-empty-icon">—</div>
            <div>
              <strong>Chưa phát sinh commission</strong>
              <p className="admin-muted">
                Đơn hàng hiện chưa có commission transaction.
              </p>
            </div>
          </div>
        ) : (
          <div className="admin-order-commission-summary">
            <strong>Có {commissionTransactions.length} commission transaction</strong>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Tiến trình đơn hàng</h3>
            <p className="admin-card-subtitle">Các mốc thời gian quan trọng của đơn hàng</p>
          </div>
        </div>
        <div className="admin-order-timeline admin-order-timeline-vertical">
          <div className="admin-order-timeline-item is-completed">
            <div className="admin-order-timeline-marker">✓</div>
            <div className="admin-order-timeline-content">
              <span>Tạo đơn</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
          </div>

          <div className={`admin-order-timeline-item ${order.shippedAt ? "is-completed" : "is-pending"}`}>
            <div className="admin-order-timeline-marker">{order.shippedAt ? "✓" : "○"}</div>
            <div className="admin-order-timeline-content">
              <span>Đã giao cho vận chuyển</span>
              <strong>{formatDate(order.shippedAt)}</strong>
            </div>
          </div>

          <div className={`admin-order-timeline-item ${order.deliveredAt ? "is-completed" : "is-pending"}`}>
            <div className="admin-order-timeline-marker">{order.deliveredAt ? "✓" : "○"}</div>
            <div className="admin-order-timeline-content">
              <span>Đã giao hàng</span>
              <strong>{formatDate(order.deliveredAt)}</strong>
            </div>
          </div>

          <div className={`admin-order-timeline-item ${order.customerReceivedAt ? "is-completed" : "is-pending"}`}>
            <div className="admin-order-timeline-marker">{order.customerReceivedAt ? "✓" : "○"}</div>
            <div className="admin-order-timeline-content">
              <span>Khách nhận hàng</span>
              <strong>{formatDate(order.customerReceivedAt)}</strong>
            </div>
          </div>

          <div className={`admin-order-timeline-item ${order.commissionEligibleAt ? "is-completed" : "is-pending"}`}>
            <div className="admin-order-timeline-marker">{order.commissionEligibleAt ? "✓" : "○"}</div>
            <div className="admin-order-timeline-content">
              <span>Commission đủ điều kiện</span>
              <strong>{formatDate(order.commissionEligibleAt)}</strong>
            </div>
          </div>

          {order.status === "CANCELLED" && (
            <div className="admin-order-timeline-item is-cancelled">
              <div className="admin-order-timeline-marker">×</div>
              <div className="admin-order-timeline-content">
                <span>Đơn hàng đã hủy</span>
                <strong>{formatDate(order.updatedAt)}</strong>
              </div>
            </div>
          )}

          {order.status === "RETURNED" && (
            <div className="admin-order-timeline-item is-completed">
              <div className="admin-order-timeline-marker">✓</div>
              <div className="admin-order-timeline-content">
                <span>Đã trả hàng</span>
                <strong>{formatDate(order.updatedAt)}</strong>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminOrdersPage;
