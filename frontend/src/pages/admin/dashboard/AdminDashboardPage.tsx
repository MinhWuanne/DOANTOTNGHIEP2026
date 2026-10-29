
import { useEffect, useMemo, useState } from "react";
import {
  getAdminProducts,
} from "../../../services/api/admin-product.api";
import {
  getAdminMembers,
  type AdminMember,
} from "../../../services/api/admin-member.api";
import {
  getAdminFranchises,
  type AdminFranchise,
} from "../../../services/api/admin-franchise.api";
import {
  getAdminOrders,
  type AdminOrderListItem,
} from "../../../services/api/admin-order.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminDashboardPage.css";

function formatMoney(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getOrderStatusLabel(status: AdminOrderListItem["status"]) {
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

function getPaymentStatusLabel(
  status: AdminOrderListItem["paymentStatus"],
) {
  const labels: Record<
    AdminOrderListItem["paymentStatus"],
    string
  > = {
    UNPAID: "Chưa thanh toán",
    PENDING: "Đang xử lý",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getOrderStatusClass(
  status: AdminOrderListItem["status"],
) {
  switch (status) {
    case "DELIVERED":
      return "admin-badge-success";

    case "CANCELLED":
    case "RETURNED":
      return "admin-badge-danger";

    case "PENDING":
      return "admin-badge-warning";

    default:
      return "admin-badge-info";
  }
}

function getPaymentStatusClass(
  status: AdminOrderListItem["paymentStatus"],
) {
  switch (status) {
    case "PAID":
      return "admin-badge-success";

    case "FAILED":
      return "admin-badge-danger";

    case "PENDING":
      return "admin-badge-warning";

    case "REFUNDED":
      return "admin-badge-info";

    default:
      return "admin-badge-neutral";
  }
}

function AdminDashboardPage() {
  const [productTotal, setProductTotal] = useState(0);
  const [activeProductTotal, setActiveProductTotal] = useState(0);

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [franchises, setFranchises] = useState<AdminFranchise[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const accessToken = getAccessToken("ADMIN");

      if (!accessToken) {
        setLoadError("Không tìm thấy phiên đăng nhập.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      const results = await Promise.allSettled([
        getAdminProducts(accessToken),
        getAdminMembers(accessToken),
        getAdminFranchises(accessToken),
        getAdminOrders(accessToken),
      ]);

      if (cancelled) {
        return;
      }

      const errors: string[] = [];

      // API sản phẩm trả về AdminProductsResult:
      // { data, pagination, summary }
      if (results[0].status === "fulfilled") {
        const productResult = results[0].value;

        setProductTotal(productResult.summary.total);
        setActiveProductTotal(productResult.summary.active);
      } else {
        errors.push("sản phẩm");
      }

      if (results[1].status === "fulfilled") {
        setMembers(results[1].value);
      } else {
        errors.push("thành viên");
      }

      if (results[2].status === "fulfilled") {
        setFranchises(results[2].value);
      } else {
        errors.push("franchise");
      }

      if (results[3].status === "fulfilled") {
        setOrders(results[3].value);
      } else {
        errors.push("đơn hàng");
      }

      if (errors.length > 0) {
        setLoadError(
          `Không thể tải dữ liệu: ${errors.join(", ")}.`,
        );
      }

      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    // Số sản phẩm hoạt động lấy trực tiếp từ summary của API.
    // Không gọi filter() trên activeProductTotal vì đây là number.
    const activeProducts = activeProductTotal;

    const activeMembers = members.filter(
      (member) => member.status === "ACTIVE",
    ).length;

    const activeFranchises = franchises.filter(
      (franchise) =>
        franchise.status === "ACTIVE" &&
        franchise.franchiseProfile?.status === "ACTIVE",
    ).length;

    const pendingOrders = orders.filter(
      (order) =>
        order.status === "PENDING" ||
        order.status === "CONFIRMED",
    ).length;

    return {
      totalProducts: productTotal,
      activeProducts,
      totalMembers: members.length,
      activeMembers,
      totalFranchises: franchises.length,
      activeFranchises,
      totalOrders: orders.length,
      pendingOrders,
    };
  }, [
    productTotal,
    activeProductTotal,
    members,
    franchises,
    orders,
  ]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Tổng quan hoạt động và tình hình vận hành hệ thống.
          </p>
        </div>

        <div className="admin-dashboard-status">
          <span className="admin-dashboard-status-dot" />
          Hệ thống đang hoạt động
        </div>
      </div>

      {loadError && (
        <div className="admin-alert admin-alert-warning">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="admin-card">
          <div className="admin-loading">
            Đang tải dữ liệu Dashboard...
          </div>
        </div>
      ) : (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon">□</div>

              <div className="admin-stat-label">
                Tổng sản phẩm
              </div>

              <div className="admin-stat-value">
                {stats.totalProducts}
              </div>

              <div className="admin-stat-description">
                {stats.activeProducts} sản phẩm đang hoạt động
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">♙</div>

              <div className="admin-stat-label">
                Thành viên
              </div>

              <div className="admin-stat-value">
                {stats.totalMembers}
              </div>

              <div className="admin-stat-description">
                {stats.activeMembers} tài khoản đang hoạt động
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">♜</div>

              <div className="admin-stat-label">
                Franchise
              </div>

              <div className="admin-stat-value">
                {stats.totalFranchises}
              </div>

              <div className="admin-stat-description">
                {stats.activeFranchises} franchise đang hoạt động
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">▤</div>

              <div className="admin-stat-label">
                Tổng đơn hàng
              </div>

              <div className="admin-stat-value">
                {stats.totalOrders}
              </div>

              <div className="admin-stat-description">
                {stats.pendingOrders} đơn đang cần xử lý
              </div>
            </div>
          </div>

          <div className="admin-dashboard-grid">
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>Đơn hàng gần đây</h3>
                  <p className="admin-dashboard-card-description">
                    5 đơn hàng được tạo gần nhất.
                  </p>
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <div className="admin-empty">
                  <strong>Chưa có đơn hàng</strong>
                  <p>
                    Hệ thống chưa có dữ liệu đơn hàng để hiển thị.
                  </p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Kênh</th>
                        <th>Giá trị</th>
                        <th>Thanh toán</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="admin-table-primary">
                            {order.orderNumber}
                          </td>

                          <td>
                            <div className="admin-dashboard-customer">
                              <strong>
                                {order.account.person.fullName}
                              </strong>

                              <span>
                                {order.account.person.email}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="admin-badge admin-badge-neutral">
                              {order.account.platform}
                            </span>
                          </td>

                          <td className="admin-table-primary">
                            {formatMoney(order.totalAmount)}
                          </td>

                          <td>
                            <span
                              className={`admin-badge ${getPaymentStatusClass(
                                order.paymentStatus,
                              )}`}
                            >
                              {getPaymentStatusLabel(
                                order.paymentStatus,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-badge ${getOrderStatusClass(
                                order.status,
                              )}`}
                            >
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </td>

                          <td className="admin-table-secondary">
                            {formatDate(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>Tình trạng dữ liệu</h3>
                  <p className="admin-dashboard-card-description">
                    Trạng thái các nhóm dữ liệu chính.
                  </p>
                </div>
              </div>

              <div className="admin-dashboard-health">
                <div className="admin-dashboard-health-item">
                  <div>
                    <strong>Sản phẩm</strong>
                    <span>{productTotal} bản ghi</span>
                  </div>

                  <span className="admin-health-ok">
                    Đã tải
                  </span>
                </div>

                <div className="admin-dashboard-health-item">
                  <div>
                    <strong>Thành viên</strong>
                    <span>{members.length} bản ghi</span>
                  </div>

                  <span className="admin-health-ok">
                    Đã tải
                  </span>
                </div>

                <div className="admin-dashboard-health-item">
                  <div>
                    <strong>Franchise</strong>
                    <span>{franchises.length} bản ghi</span>
                  </div>

                  <span className="admin-health-ok">
                    Đã tải
                  </span>
                </div>

                <div className="admin-dashboard-health-item">
                  <div>
                    <strong>Đơn hàng</strong>
                    <span>{orders.length} bản ghi</span>
                  </div>

                  <span className="admin-health-ok">
                    Đã tải
                  </span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;

