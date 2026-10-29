import { useEffect, useMemo, useState } from "react";
import {
  getAdminCommissions,
  type AdminCommission,
} from "../../../services/api/admin-commission.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminCommissionsPage.css";

type CommissionStatus = AdminCommission["status"];
type CommissionPlatform = AdminCommission["platform"];
type PaymentStatus = AdminCommission["order"]["paymentStatus"];

type CommissionSort =
  | "newest"
  | "oldest"
  | "amount-desc"
  | "amount-asc"
  | "eligible-asc"
  | "eligible-desc";

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

function getPlatformLabel(
  platform: CommissionPlatform,
) {
  const labels: Record<CommissionPlatform, string> = {
    MEMBER: "Member",
    FRANCHISE: "Franchise",
  };

  return labels[platform];
}

function getSourceTypeLabel(
  sourceType: AdminCommission["sourceType"],
) {
  const labels: Record<string, string> = {
    MEMBER_ORDER: "Đơn hàng Member",
    FRANCHISE_ORDER: "Đơn hàng Franchise",
  };

  return labels[sourceType] ?? sourceType;
}

function getCommissionStatusLabel(
  status: CommissionStatus,
) {
  const labels: Record<CommissionStatus, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    PAID: "Đã trả",
  };

  return labels[status];
}

function getCommissionStatusClass(
  status: CommissionStatus,
) {
  const classes: Record<CommissionStatus, string> = {
    PENDING: "pending",
    APPROVED: "approved",
    PAID: "paid",
  };

  return classes[status];
}

function getOrderStatusLabel(
  status: AdminCommission["order"]["status"],
) {
  const labels: Record<
    AdminCommission["order"]["status"],
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

function getPaymentStatusLabel(
  status: PaymentStatus,
) {
  const labels: Record<PaymentStatus, string> = {
    UNPAID: "Chưa thanh toán",
    PENDING: "Đang chờ thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thanh toán thất bại",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getPaymentStatusClass(
  status: PaymentStatus,
) {
  const classes: Record<PaymentStatus, string> = {
    UNPAID: "unpaid",
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  };

  return classes[status];
}

function getEligibleTimestamp(
  commission: AdminCommission,
) {
  const value = commission.order.commissionEligibleAt;

  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<
    AdminCommission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    CommissionStatus | ""
  >("");
  const [platformFilter, setPlatformFilter] = useState<
    CommissionPlatform | ""
  >("");
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatus | "">("");
  const [sortBy, setSortBy] =
    useState<CommissionSort>("newest");

  async function loadCommissions() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getAdminCommissions(accessToken);
      setCommissions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách hoa hồng.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommissions();
  }, []);

  const stats = useMemo(() => {
    return commissions.reduce(
      (result, commission) => {
        const amount = Number(commission.amount) || 0;

        result.total += amount;
        result.count += 1;

        if (commission.status === "PENDING") {
          result.pending += amount;
          result.pendingCount += 1;
        }

        if (commission.status === "APPROVED") {
          result.approved += amount;
          result.approvedCount += 1;
        }

        if (commission.status === "PAID") {
          result.paid += amount;
          result.paidCount += 1;
        }

        return result;
      },
      {
        total: 0,
        count: 0,
        pending: 0,
        pendingCount: 0,
        approved: 0,
        approvedCount: 0,
        paid: 0,
        paidCount: 0,
      },
    );
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");

    const filtered = commissions.filter((commission) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          commission.order.orderNumber,
          commission.account.person.fullName,
          commission.account.person.email,
        ].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedSearch),
        );

      const matchesStatus =
        !statusFilter || commission.status === statusFilter;

      const matchesPlatform =
        !platformFilter || commission.platform === platformFilter;

      const matchesPaymentStatus =
        !paymentStatusFilter ||
        commission.order.paymentStatus === paymentStatusFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlatform &&
        matchesPaymentStatus
      );
    });

    return filtered.sort((a, b) => {
      const aCreatedAt = new Date(a.createdAt).getTime();
      const bCreatedAt = new Date(b.createdAt).getTime();
      const aAmount = Number(a.amount) || 0;
      const bAmount = Number(b.amount) || 0;
      const aEligible = getEligibleTimestamp(a);
      const bEligible = getEligibleTimestamp(b);

      switch (sortBy) {
        case "oldest":
          return aCreatedAt - bCreatedAt;

        case "amount-desc":
          return bAmount - aAmount;

        case "amount-asc":
          return aAmount - bAmount;

        case "eligible-asc":
          if (aEligible === null) return 1;
          if (bEligible === null) return -1;
          return aEligible - bEligible;

        case "eligible-desc":
          if (aEligible === null) return 1;
          if (bEligible === null) return -1;
          return bEligible - aEligible;

        case "newest":
        default:
          return bCreatedAt - aCreatedAt;
      }
    });
  }, [
    commissions,
    search,
    statusFilter,
    platformFilter,
    paymentStatusFilter,
    sortBy,
  ]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setPlatformFilter("");
    setPaymentStatusFilter("");
    setSortBy("newest");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "" ||
    platformFilter !== "" ||
    paymentStatusFilter !== "" ||
    sortBy !== "newest";

  return (
    <section className="admin-commissions-page">
      <div className="admin-page-header">
        <div>
          <h1>Hoa hồng</h1>
          <p>
            Theo dõi các khoản hoa hồng phát sinh từ đơn hàng.
          </p>
        </div>

        <button
          type="button"
          className="admin-commission-refresh-button"
          onClick={() => void loadCommissions()}
          disabled={loading}
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="admin-commission-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadCommissions()}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="admin-commission-stats">
        <article className="admin-commission-stat-card total">
          <div className="admin-commission-stat-heading">
            <span>Tổng hoa hồng</span>
            <span className="admin-commission-stat-icon">₫</span>
          </div>
          <strong>{formatMoney(stats.total)}</strong>
          <span className="admin-commission-stat-caption">
            {stats.count.toLocaleString("vi-VN")} khoản hoa hồng
          </span>
        </article>

        <article className="admin-commission-stat-card pending">
          <div className="admin-commission-stat-heading">
            <span>Chờ duyệt</span>
            <span className="admin-commission-stat-icon">◷</span>
          </div>
          <strong>{formatMoney(stats.pending)}</strong>
          <span className="admin-commission-stat-caption">
            {stats.pendingCount.toLocaleString("vi-VN")} khoản
          </span>
        </article>

        <article className="admin-commission-stat-card approved">
          <div className="admin-commission-stat-heading">
            <span>Đã duyệt</span>
            <span className="admin-commission-stat-icon">✓</span>
          </div>
          <strong>{formatMoney(stats.approved)}</strong>
          <span className="admin-commission-stat-caption">
            {stats.approvedCount.toLocaleString("vi-VN")} khoản
          </span>
        </article>

        <article className="admin-commission-stat-card paid">
          <div className="admin-commission-stat-heading">
            <span>Đã trả</span>
            <span className="admin-commission-stat-icon">↗</span>
          </div>
          <strong>{formatMoney(stats.paid)}</strong>
          <span className="admin-commission-stat-caption">
            {stats.paidCount.toLocaleString("vi-VN")} khoản
          </span>
        </article>
      </div>

      <div className="admin-commission-toolbar">
        <div className="admin-commission-search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã đơn, tên hoặc email người nhận..."
            aria-label="Tìm kiếm hoa hồng"
          />
        </div>

        <div className="admin-commission-filters">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as CommissionStatus | "")
            }
            aria-label="Lọc theo trạng thái hoa hồng"
          >
            <option value="">Tất cả trạng thái hoa hồng</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="PAID">Đã trả</option>
          </select>

          <select
            value={platformFilter}
            onChange={(event) =>
              setPlatformFilter(
                event.target.value as CommissionPlatform | "",
              )
            }
            aria-label="Lọc theo nền tảng"
          >
            <option value="">Tất cả nền tảng</option>
            <option value="MEMBER">Member</option>
            <option value="FRANCHISE">Franchise</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(event) =>
              setPaymentStatusFilter(
                event.target.value as PaymentStatus | "",
              )
            }
            aria-label="Lọc theo trạng thái thanh toán"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PENDING">Đang chờ thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="FAILED">Thanh toán thất bại</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as CommissionSort)
            }
            aria-label="Sắp xếp danh sách hoa hồng"
          >
            <option value="newest">Ngày tạo mới nhất</option>
            <option value="oldest">Ngày tạo cũ nhất</option>
            <option value="amount-desc">Hoa hồng cao nhất</option>
            <option value="amount-asc">Hoa hồng thấp nhất</option>
            <option value="eligible-asc">Đủ điều kiện sớm nhất</option>
            <option value="eligible-desc">Đủ điều kiện muộn nhất</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-commission-reset-button"
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="admin-commission-results">
        <span>
          Hiển thị <strong>{filteredCommissions.length}</strong> /{" "}
          <strong>{commissions.length}</strong> khoản hoa hồng
        </span>
        <span>
          Thống kê phía trên tính trên toàn bộ dữ liệu đã tải.
        </span>
      </div>

      {loading ? (
        <div className="admin-commission-empty">
          Đang tải dữ liệu hoa hồng...
        </div>
      ) : error && commissions.length === 0 ? (
        <div className="admin-commission-empty">
          Không thể tải dữ liệu hoa hồng. Vui lòng thử lại.
        </div>
      ) : filteredCommissions.length === 0 ? (
        <div className="admin-commission-empty">
          {commissions.length === 0
            ? "Chưa có khoản hoa hồng nào."
            : "Không tìm thấy khoản hoa hồng phù hợp với bộ lọc."}
          {hasActiveFilters && (
            <div>
              <button
                type="button"
                className="admin-commission-reset-button"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-commission-table-wrapper">
          <table className="admin-commission-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Người nhận</th>
                <th>Nền tảng</th>
                <th>Nguồn</th>
                <th>Giá trị tính</th>
                <th>Tỷ lệ</th>
                <th>Hoa hồng</th>
                <th>Trạng thái hoa hồng</th>
                <th>Trạng thái đơn</th>
                <th>Thanh toán</th>
                <th>Đủ điều kiện</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>

            <tbody>
              {filteredCommissions.map((commission) => (
                <tr key={commission.id}>
                  <td>
                    <strong>
                      {commission.order.orderNumber}
                    </strong>
                  </td>

                  <td>
                    <div>
                      <strong>
                        {commission.account.person.fullName}
                      </strong>
                    </div>
                    <div className="admin-commission-secondary">
                      {commission.account.person.email}
                    </div>
                  </td>

                  <td>
                    {getPlatformLabel(commission.platform)}
                  </td>

                  <td>
                    {getSourceTypeLabel(commission.sourceType)}
                  </td>

                  <td>
                    {formatMoney(commission.commissionBase)}
                  </td>

                  <td>{commission.percentage}%</td>

                  <td>
                    <strong>{formatMoney(commission.amount)}</strong>
                  </td>

                  <td>
                    <span
                      className={`admin-commission-status ${getCommissionStatusClass(
                        commission.status,
                      )}`}
                    >
                      {getCommissionStatusLabel(commission.status)}
                    </span>
                  </td>

                  <td>
                    <span className="admin-commission-order-status">
                      {getOrderStatusLabel(commission.order.status)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`admin-commission-payment-status ${getPaymentStatusClass(
                        commission.order.paymentStatus,
                      )}`}
                    >
                      {getPaymentStatusLabel(
                        commission.order.paymentStatus,
                      )}
                    </span>
                  </td>

                  <td>
                    {commission.order.commissionEligibleAt
                      ? formatDate(
                          commission.order.commissionEligibleAt,
                        )
                      : "Chưa xác định"}
                  </td>

                  <td>{formatDate(commission.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminCommissionsPage;