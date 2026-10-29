import { useEffect, useMemo, useState } from "react";

import {
  approveAdminReturn,
  getAdminReturnById,
  getAdminReturns,
  rejectAdminReturn,
  type AdminReturnDetail,
  type AdminReturnListItem,
  type ReturnStatus,
} from "../../../services/api/admin-return.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminReturnsPage.css";

type ReturnSortOrder = "newest" | "oldest";
type ReturnStatusFilter = ReturnStatus | "ALL";

function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN");
}

function getReturnStatusLabel(status: ReturnStatus) {
  const labels: Record<ReturnStatus, string> = {
    PENDING: "Chờ xử lý",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getReturnStatusClass(status: ReturnStatus) {
  const classes: Record<ReturnStatus, string> = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    REFUNDED: "refunded",
  };

  return classes[status];
}

function getOrderStatusLabel(status: AdminReturnListItem["order"]["status"]) {
  const labels: Record<AdminReturnListItem["order"]["status"], string> = {
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
  status: AdminReturnListItem["order"]["paymentStatus"],
) {
  const labels: Record<AdminReturnListItem["order"]["paymentStatus"], string> = {
    UNPAID: "Chưa thanh toán",
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Đã hoàn tiền",
  };

  return labels[status];
}

function getPaymentMethodLabel(
  method: AdminReturnListItem["order"]["paymentMethod"],
) {
  const labels: Record<AdminReturnListItem["order"]["paymentMethod"], string> = {
    COD: "COD",
    BANK_TRANSFER: "Chuyển khoản",
    WALLET: "Ví",
    ONLINE: "Online",
  };

  return labels[method];
}

function AdminReturnsPage() {
  const [returns, setReturns] = useState<AdminReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<ReturnSortOrder>("newest");
  const [selectedReturn, setSelectedReturn] = useState<AdminReturnDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminReturnListItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadReturns() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await getAdminReturns(accessToken);
      setReturns(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách yêu cầu hoàn trả.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReturns();
  }, []);

  const statistics = useMemo(() => {
    const pending = returns.filter((item) => item.status === "PENDING").length;
    const refunded = returns.filter((item) => item.status === "REFUNDED").length;
    const rejected = returns.filter((item) => item.status === "REJECTED").length;

    return {
      total: returns.length,
      pending,
      refunded,
      rejected,
      refundedAmount: returns
        .filter((item) => item.status === "REFUNDED")
        .reduce((total, item) => total + Number(item.order.totalAmount || 0), 0),
    };
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");

    return returns
      .filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          item.order.orderNumber.toLocaleLowerCase("vi").includes(normalizedSearch) ||
          item.order.account.person.fullName
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch) ||
          item.order.account.person.email
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch) ||
          item.order.account.person.phone.includes(normalizedSearch);
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.requestedAt).getTime();
        const timeB = new Date(b.requestedAt).getTime();

        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [returns, searchTerm, statusFilter, sortOrder]);

  async function openDetail(item: AdminReturnListItem) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setDetailError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setSelectedReturn(null);
      setDetailLoading(true);
      setDetailError("");
      const detail = await getAdminReturnById(accessToken, item.id);
      setSelectedReturn(detail);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết yêu cầu hoàn trả.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApprove(item: AdminReturnListItem) {
    const confirmed = window.confirm(
      `Duyệt hoàn trả cho đơn ${item.order.orderNumber}? Thao tác này sẽ thực hiện hoàn tiền, cập nhật đơn hàng và hoàn kho theo nghiệp vụ hệ thống.`,
    );

    if (!confirmed) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessingReturnId(item.id);
      setError("");
      setActionError("");
      await approveAdminReturn(accessToken, item.id);
      setSelectedReturn(null);
      await loadReturns();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể duyệt yêu cầu hoàn trả.",
      );
    } finally {
      setProcessingReturnId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setActionError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessingReturnId(rejectTarget.id);
      setActionError("");
      await rejectAdminReturn(accessToken, rejectTarget.id, {
        ...(rejectNote.trim() ? { note: rejectNote.trim() } : {}),
      });
      setRejectTarget(null);
      setRejectNote("");
      setSelectedReturn(null);
      await loadReturns();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể từ chối yêu cầu hoàn trả.",
      );
    } finally {
      setProcessingReturnId(null);
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("ALL");
    setSortOrder("newest");
  }

  const hasActiveFilters =
    searchTerm.trim() !== "" || statusFilter !== "ALL" || sortOrder !== "newest";

  return (
    <section className="admin-returns-page">
      <div className="admin-page-header">
        <div>
          <h1>Return / Refund</h1>
          <p>Quản lý yêu cầu trả hàng và theo dõi quy trình hoàn tiền đơn hàng.</p>
        </div>
      </div>

      {(error || actionError) && (
        <div className="admin-return-error" role="alert">
          <span>{actionError || error}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setActionError("");
            }}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="admin-return-statistics">
        <div className="admin-return-stat-card">
          <div className="admin-return-stat-heading">
            <span className="admin-return-stat-icon total">↻</span>
            <span className="admin-return-stat-label">Tổng yêu cầu</span>
          </div>
          <strong className="admin-return-stat-value">
            {statistics.total.toLocaleString("vi-VN")}
          </strong>
          <span className="admin-return-stat-description">Tất cả yêu cầu hoàn trả</span>
        </div>

        <div className="admin-return-stat-card">
          <div className="admin-return-stat-heading">
            <span className="admin-return-stat-icon pending">◷</span>
            <span className="admin-return-stat-label">Chờ xử lý</span>
          </div>
          <strong className="admin-return-stat-value">
            {statistics.pending.toLocaleString("vi-VN")}
          </strong>
          <span className="admin-return-stat-description">Cần Admin xem xét</span>
        </div>

        <div className="admin-return-stat-card">
          <div className="admin-return-stat-heading">
            <span className="admin-return-stat-icon refunded">✓</span>
            <span className="admin-return-stat-label">Đã hoàn tiền</span>
          </div>
          <strong className="admin-return-stat-value">
            {statistics.refunded.toLocaleString("vi-VN")}
          </strong>
          <span className="admin-return-stat-description">
            {formatMoney(statistics.refundedAmount)}
          </span>
        </div>

        <div className="admin-return-stat-card">
          <div className="admin-return-stat-heading">
            <span className="admin-return-stat-icon rejected">×</span>
            <span className="admin-return-stat-label">Đã từ chối</span>
          </div>
          <strong className="admin-return-stat-value">
            {statistics.rejected.toLocaleString("vi-VN")}
          </strong>
          <span className="admin-return-stat-description">Yêu cầu không được chấp nhận</span>
        </div>
      </div>

      <div className="admin-return-toolbar">
        <div className="admin-return-toolbar-heading">
          <div>
            <h2>Danh sách yêu cầu</h2>
            <p>Tìm kiếm, lọc trạng thái và xử lý yêu cầu trả hàng.</p>
          </div>
          <button
            type="button"
            className="admin-return-refresh-button"
            onClick={() => void loadReturns()}
            disabled={loading || processingReturnId !== null}
          >
            Làm mới
          </button>
        </div>

        <div className="admin-return-filters">
          <div className="admin-return-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã đơn, tên, email hoặc số điện thoại..."
              aria-label="Tìm yêu cầu hoàn trả"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ReturnStatusFilter)}
            aria-label="Lọc theo trạng thái hoàn trả"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as ReturnSortOrder)}
            aria-label="Sắp xếp theo thời gian yêu cầu"
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="admin-return-reset-button"
              onClick={resetFilters}
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="admin-return-table-meta">
        <span>
          Hiển thị <strong>{filteredReturns.length.toLocaleString("vi-VN")}</strong> / {returns.length.toLocaleString("vi-VN")} yêu cầu
        </span>
      </div>

      {loading ? (
        <div className="admin-return-empty">
          <span className="admin-return-loading-spinner" />
          <span>Đang tải danh sách yêu cầu hoàn trả...</span>
        </div>
      ) : returns.length === 0 ? (
        <div className="admin-return-empty">
          <span className="admin-return-empty-icon">↻</span>
          <strong>Chưa có yêu cầu hoàn trả</strong>
          <p>Danh sách hiện chưa có yêu cầu nào.</p>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="admin-return-empty">
          <span className="admin-return-empty-icon">⌕</span>
          <strong>Không tìm thấy yêu cầu phù hợp</strong>
          <p>Hãy thay đổi từ khóa tìm kiếm hoặc điều kiện lọc.</p>
          <button type="button" className="admin-return-reset-button" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="admin-return-table-wrapper">
          <table className="admin-return-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Khách hàng</th>
                <th>Ngày yêu cầu</th>
                <th>Giá trị đơn</th>
                <th>Thanh toán</th>
                <th>Trạng thái yêu cầu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((item) => {
                const isProcessing = processingReturnId === item.id;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong className="admin-return-order-number">{item.order.orderNumber}</strong>
                      <span className="admin-return-subtext">{getOrderStatusLabel(item.order.status)}</span>
                    </td>
                    <td>
                      <span className="admin-return-customer">{item.order.account.person.fullName}</span>
                      <span className="admin-return-subtext">{item.order.account.person.phone || item.order.account.person.email}</span>
                    </td>
                    <td><span className="admin-return-date">{formatDate(item.requestedAt)}</span></td>
                    <td><strong className="admin-return-amount">{formatMoney(item.order.totalAmount)}</strong></td>
                    <td>
                      <span className="admin-return-payment-method">{getPaymentMethodLabel(item.order.paymentMethod)}</span>
                      <span className={`admin-return-payment-status ${item.order.paymentStatus.toLowerCase()}`}>
                        {getPaymentStatusLabel(item.order.paymentStatus)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-return-status admin-return-status-${getReturnStatusClass(item.status)}`}>
                        <span className="admin-return-status-dot" />
                        {getReturnStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-return-row-actions">
                        <button type="button" className="admin-return-button" onClick={() => void openDetail(item)}>
                          Chi tiết
                        </button>
                        {item.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="admin-return-button admin-return-button-success"
                              disabled={isProcessing}
                              onClick={() => void handleApprove(item)}
                            >
                              {isProcessing ? "Đang xử lý..." : "Duyệt"}
                            </button>
                            <button
                              type="button"
                              className="admin-return-button admin-return-button-danger"
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectTarget(item);
                                setRejectNote("");
                                setActionError("");
                              }}
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(detailLoading || selectedReturn || detailError) && (
        <div className="admin-return-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedReturn(null);
            setDetailError("");
          }
        }}>
          <div className="admin-return-modal admin-return-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-return-detail-title">
            <div className="admin-return-modal-header">
              <div>
                <span className="admin-return-modal-eyebrow">CHI TIẾT YÊU CẦU</span>
                <h2 id="admin-return-detail-title">Thông tin hoàn trả</h2>
              </div>
              <button type="button" className="admin-return-modal-close" onClick={() => {
                setSelectedReturn(null);
                setDetailError("");
              }} aria-label="Đóng chi tiết">×</button>
            </div>

            {detailLoading ? (
              <div className="admin-return-modal-loading"><span className="admin-return-loading-spinner" /> Đang tải chi tiết...</div>
            ) : detailError ? (
              <div className="admin-return-error" role="alert">{detailError}</div>
            ) : selectedReturn ? (
              <div className="admin-return-detail-content">
                <div className="admin-return-detail-summary">
                  <div>
                    <span className="admin-return-detail-label">Mã đơn hàng</span>
                    <strong>{selectedReturn.order.orderNumber}</strong>
                  </div>
                  <span className={`admin-return-status admin-return-status-${getReturnStatusClass(selectedReturn.status)}`}>
                    <span className="admin-return-status-dot" />
                    {getReturnStatusLabel(selectedReturn.status)}
                  </span>
                </div>

                <div className="admin-return-detail-grid">
                  <div className="admin-return-detail-panel">
                    <h3>Khách hàng</h3>
                    <dl>
                      <dt>Họ tên</dt><dd>{selectedReturn.order.account.person.fullName}</dd>
                      <dt>Email</dt><dd>{selectedReturn.order.account.person.email || "—"}</dd>
                      <dt>Số điện thoại</dt><dd>{selectedReturn.order.account.person.phone || "—"}</dd>
                      <dt>Loại tài khoản</dt><dd>{selectedReturn.order.platform === "MEMBER" ? "Thành viên" : "Đại lý"}</dd>
                    </dl>
                  </div>

                  <div className="admin-return-detail-panel">
                    <h3>Thông tin đơn hàng</h3>
                    <dl>
                      <dt>Trạng thái đơn</dt><dd>{getOrderStatusLabel(selectedReturn.order.status)}</dd>
                      <dt>Thanh toán</dt><dd>{getPaymentStatusLabel(selectedReturn.order.paymentStatus)}</dd>
                      <dt>Phương thức</dt><dd>{getPaymentMethodLabel(selectedReturn.order.paymentMethod)}</dd>
                      <dt>Ngày tạo đơn</dt><dd>{formatDate(selectedReturn.order.createdAt)}</dd>
                      <dt>Ngày giao hàng</dt><dd>{formatDate(selectedReturn.order.deliveredAt)}</dd>
                    </dl>
                  </div>
                </div>

                <div className="admin-return-detail-panel">
                  <h3>Sản phẩm trong đơn</h3>
                  <div className="admin-return-items-table-wrapper">
                    <table className="admin-return-items-table">
                      <thead><tr><th>Sản phẩm</th><th>SKU</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                      <tbody>
                        {selectedReturn.order.items.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.productName}</strong><span className="admin-return-subtext">{item.variant.name}</span></td>
                            <td>{item.sku}</td>
                            <td>{item.quantity}</td>
                            <td>{formatMoney(item.unitPrice)}</td>
                            <td>{formatMoney(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-return-total-row"><span>Tạm tính</span><strong>{formatMoney(selectedReturn.order.subtotal)}</strong></div>
                  <div className="admin-return-total-row"><span>Phí vận chuyển</span><strong>{formatMoney(selectedReturn.order.shippingFee)}</strong></div>
                  <div className="admin-return-total-row"><span>Giảm giá</span><strong>− {formatMoney(selectedReturn.order.discount)}</strong></div>
                  <div className="admin-return-total-row grand-total"><span>Tổng tiền hoàn trả</span><strong>{formatMoney(selectedReturn.order.totalAmount)}</strong></div>
                </div>

                {selectedReturn.order.address && (
                  <div className="admin-return-detail-panel">
                    <h3>Địa chỉ nhận hàng</h3>
                    <p className="admin-return-address-text">
                      <strong>{selectedReturn.order.address.receiverName}</strong> · {selectedReturn.order.address.phone}<br />
                      {selectedReturn.order.address.addressLine}, {selectedReturn.order.address.ward}, {selectedReturn.order.address.district}, {selectedReturn.order.address.province}
                    </p>
                  </div>
                )}

                <div className="admin-return-detail-panel">
                  <h3>Lịch sử yêu cầu</h3>
                  <dl>
                    <dt>Ngày gửi yêu cầu</dt><dd>{formatDate(selectedReturn.requestedAt)}</dd>
                    <dt>Ghi chú yêu cầu</dt><dd>{selectedReturn.note || "Không có ghi chú"}</dd>
                    <dt>Ngày duyệt</dt><dd>{formatDate(selectedReturn.approvedAt)}</dd>
                    <dt>Ngày hoàn tiền</dt><dd>{formatDate(selectedReturn.refundedAt)}</dd>
                  </dl>
                </div>

                {selectedReturn.status === "PENDING" && (
                  <div className="admin-return-modal-actions">
                    <button type="button" className="admin-return-button admin-return-button-danger" onClick={() => {
                      const item = returns.find((entry) => entry.id === selectedReturn.id);
                      if (item) {
                        setRejectTarget(item);
                        setRejectNote("");
                      }
                    }}>Từ chối yêu cầu</button>
                    <button type="button" className="admin-return-button admin-return-button-success" disabled={processingReturnId === selectedReturn.id} onClick={() => {
                      const item = returns.find((entry) => entry.id === selectedReturn.id);
                      if (item) {
                        void handleApprove(item);
                      }
                    }}>Duyệt và hoàn tiền</button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="admin-return-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && processingReturnId === null) {
            setRejectTarget(null);
            setRejectNote("");
          }
        }}>
          <div className="admin-return-modal admin-return-reject-modal" role="dialog" aria-modal="true" aria-labelledby="admin-return-reject-title">
            <div className="admin-return-modal-header">
              <div>
                <span className="admin-return-modal-eyebrow">TỪ CHỐI YÊU CẦU</span>
                <h2 id="admin-return-reject-title">Xác nhận từ chối</h2>
              </div>
              <button type="button" className="admin-return-modal-close" disabled={processingReturnId !== null} onClick={() => setRejectTarget(null)} aria-label="Đóng">×</button>
            </div>
            <p className="admin-return-reject-description">
              Bạn đang từ chối yêu cầu của đơn <strong>{rejectTarget.order.orderNumber}</strong>. Đơn hàng và thanh toán sẽ không được thay đổi bởi thao tác từ chối.
            </p>
            <label className="admin-return-note-label" htmlFor="admin-return-reject-note">Ghi chú từ chối <span>(không bắt buộc)</span></label>
            <textarea
              id="admin-return-reject-note"
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              maxLength={255}
              rows={4}
              placeholder="Nhập lý do từ chối để khách hàng dễ theo dõi..."
            />
            <div className="admin-return-note-meta">{rejectNote.length}/255 ký tự</div>
            {actionError && <div className="admin-return-error" role="alert">{actionError}</div>}
            <div className="admin-return-modal-actions">
              <button type="button" className="admin-return-button" disabled={processingReturnId !== null} onClick={() => setRejectTarget(null)}>Hủy</button>
              <button type="button" className="admin-return-button admin-return-button-danger" disabled={processingReturnId !== null} onClick={() => void handleReject()}>
                {processingReturnId === rejectTarget.id ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminReturnsPage;
