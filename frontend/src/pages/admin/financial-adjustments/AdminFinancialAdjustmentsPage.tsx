
import { useCallback, useEffect, useState } from "react";
import {
  confirmAdminFinancialAdjustment,
  createAdminFinancialAdjustment,
  getAdminFinancialAdjustments,
  type AdminFinancialAdjustment,
  type AdminFinancialAdjustmentListParams,
  type FinancialAdjustmentDirection,
  type FinancialAdjustmentReason,
  type FinancialAdjustmentStatus,
} from "../../../services/api/admin-wallet.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminFinancialAdjustmentsPage.css";

const PAGE_SIZE = 10;

const REASON_LABELS: Record<FinancialAdjustmentReason, string> = {
  LATE_BANK_TRANSFER: "Chuyển khoản đến trễ",
  MEMBER_COMPLAINT: "Khiếu nại Member",
  FRANCHISE_COMPLAINT: "Khiếu nại Franchise",
  COMPENSATION: "Bồi thường",
  TRANSACTION_CORRECTION: "Điều chỉnh sai lệch giao dịch",
  OTHER: "Lý do khác",
};

const STATUS_LABELS: Record<FinancialAdjustmentStatus, string> = {
  PENDING: "Chờ xác nhận",
  COMPLETED: "Đã hoàn tất",
  EXPIRED: "Đã hết hạn",
};

function formatMoney(value: string | number): string {
  return Number(value).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN");
}

function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const messages: Record<string, string> = {
    ADMIN_FINANCIAL_ADJUSTMENT_LIST_FAILED: "Không thể tải danh sách phiếu.",
    ADMIN_FINANCIAL_ADJUSTMENT_DETAIL_FAILED: "Không thể tải chi tiết phiếu.",
    ADMIN_FINANCIAL_ADJUSTMENT_CREATE_FAILED: "Không thể tạo phiếu điều chỉnh.",
    ADMIN_FINANCIAL_ADJUSTMENT_CONFIRM_FAILED: "Không thể xác nhận phiếu.",
    INVALID_PASSWORD: "Mật khẩu ADMIN không chính xác.",
    ADMIN_PASSWORD_INVALID: "Mật khẩu ADMIN không chính xác.",
    FINANCIAL_ADJUSTMENT_NOT_FOUND: "Không tìm thấy phiếu điều chỉnh.",
    FINANCIAL_ADJUSTMENT_EXPIRED: "Phiếu đã hết hạn xác nhận.",
    FINANCIAL_ADJUSTMENT_NOT_PENDING: "Phiếu không còn ở trạng thái chờ xác nhận.",
    WALLET_NOT_FOUND: "Không tìm thấy ví của tài khoản.",
    INSUFFICIENT_AVAILABLE_BALANCE: "Số dư khả dụng không đủ để thực hiện điều chỉnh.",
  };

  return messages[error.message] ?? error.message;
}

function getRemainingTime(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();

  if (remaining <= 0) {
    return "Đã hết hạn";
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return `${minutes} phút ${seconds.toString().padStart(2, "0")} giây`;
}

function AdminFinancialAdjustmentsPage() {
  const [items, setItems] = useState<AdminFinancialAdjustment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FinancialAdjustmentStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recipientAccountId, setRecipientAccountId] = useState("");
  const [direction, setDirection] =
    useState<FinancialAdjustmentDirection>("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] =
    useState<FinancialAdjustmentReason>("LATE_BANK_TRANSFER");
  const [note, setNote] = useState("");

  const [selectedTicket, setSelectedTicket] =
    useState<AdminFinancialAdjustment | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  const loadAdjustments = useCallback(async () => {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập ADMIN không hợp lệ. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params: AdminFinancialAdjustmentListParams = {
        page,
        limit: PAGE_SIZE,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status) {
        params.status = status;
      }

      const result = await getAdminFinancialAdjustments(
        accessToken,
        params,
      );

      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (loadError) {
      setError(getErrorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadAdjustments();
  }, [loadAdjustments]);

  async function handleCreateTicket(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập ADMIN không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    const parsedAmount = Number(amount);

    if (!recipientAccountId.trim()) {
      setError("Vui lòng nhập ID tài khoản nhận điều chỉnh.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Số tiền điều chỉnh phải lớn hơn 0.");
      return;
    }

    if (reason === "OTHER" && !note.trim()) {
      setError("Vui lòng ghi rõ lý do khi chọn Lý do khác.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createAdminFinancialAdjustment(
        accessToken,
        {
          recipientAccountId: recipientAccountId.trim(),
          direction,
          amount: parsedAmount,
          reason,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      );

      setSuccess(
        `Đã tạo phiếu ${created.ticketCode}. Phiếu chờ xác nhận và hết hạn sau 15 phút.`,
      );
      setShowCreateForm(false);
      setRecipientAccountId("");
      setAmount("");
      setReason("LATE_BANK_TRANSFER");
      setNote("");
      setPage(1);

      await loadAdjustments();
    } catch (createError) {
      setError(getErrorText(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmTicket(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken || !selectedTicket) {
      setError("Không thể xác định phiên ADMIN hoặc phiếu cần xác nhận.");
      return;
    }

    if (!confirmPassword) {
      setError("Vui lòng nhập mật khẩu ADMIN để xác nhận.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const completed = await confirmAdminFinancialAdjustment(
        accessToken,
        selectedTicket.ticketCode,
        confirmPassword,
      );

      setSuccess(`Phiếu ${completed.ticketCode} đã được xác nhận thành công.`);
      setSelectedTicket(null);
      setShowConfirmForm(false);
      setConfirmPassword("");

      await loadAdjustments();
    } catch (confirmError) {
      setError(getErrorText(confirmError));
    } finally {
      setSubmitting(false);
    }
  }

  function openTicket(ticket: AdminFinancialAdjustment) {
    setSelectedTicket(ticket);
    setShowConfirmForm(false);
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  function closeTicket() {
    setSelectedTicket(null);
    setShowConfirmForm(false);
    setConfirmPassword("");
  }

  return (
    <div className="admin-financial-adjustments">
      <div className="admin-fa-header">
        <div>
          <h1>Điều chỉnh số dư</h1>
          <p>
            Quản lý các phiếu cộng hoặc trừ tiền ví có xác nhận hai bước.
          </p>
        </div>

        <button
          type="button"
          className="admin-fa-primary-button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setError("");
            setSuccess("");
          }}
        >
          {showCreateForm ? "Đóng biểu mẫu" : "+ Tạo phiếu điều chỉnh"}
        </button>
      </div>

      <div className="admin-fa-stats">
        <div className="admin-fa-stat-card">
          <span>Tổng số phiếu</span>
          <strong>{total}</strong>
        </div>

        <div className="admin-fa-stat-card">
          <span>Trang hiện tại</span>
          <strong>{page}/{totalPages}</strong>
        </div>

        <div className="admin-fa-stat-card">
          <span>Quy trình</span>
          <strong>2 bước</strong>
        </div>
      </div>

      {error && (
        <div className="admin-fa-alert admin-fa-alert-error">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="admin-fa-alert admin-fa-alert-success">
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Đóng thông báo thành công"
          >
            ×
          </button>
        </div>
      )}

      {showCreateForm && (
        <section className="admin-fa-panel">
          <div className="admin-fa-panel-heading">
            <div>
              <h2>Tạo phiếu điều chỉnh mới</h2>
              <p>
                Tạo phiếu chưa làm thay đổi số dư. Số dư chỉ đổi sau khi xác nhận
                thành công.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTicket}>
            <div className="admin-fa-form-grid">
              <label className="admin-fa-field">
                <span>ID tài khoản nhận</span>
                <input
                  type="text"
                  value={recipientAccountId}
                  onChange={(event) =>
                    setRecipientAccountId(event.target.value)
                  }
                  placeholder="Nhập ID tài khoản MEMBER hoặc FRANCHISE"
                  required
                />
              </label>

              <label className="admin-fa-field">
                <span>Loại điều chỉnh</span>
                <select
                  value={direction}
                  onChange={(event) =>
                    setDirection(
                      event.target.value as FinancialAdjustmentDirection,
                    )
                  }
                >
                  <option value="CREDIT">Cộng tiền vào ví</option>
                  <option value="DEBIT">Trừ tiền khỏi ví</option>
                </select>
              </label>

              <label className="admin-fa-field">
                <span>Số tiền (VNĐ)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Nhập số tiền"
                  required
                />
              </label>

              <label className="admin-fa-field">
                <span>Lý do điều chỉnh</span>
                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as FinancialAdjustmentReason)
                  }
                >
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-fa-field admin-fa-field-full">
                <span>
                  Ghi chú {reason === "OTHER" ? "(bắt buộc)" : "(không bắt buộc)"}
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ghi rõ nội dung và căn cứ điều chỉnh"
                  rows={3}
                  required={reason === "OTHER"}
                />
              </label>
            </div>

            <div className="admin-fa-form-notice">
              <strong>Lưu ý:</strong> Phiếu sẽ hết hạn sau 15 phút. Sau khi tạo,
              ADMIN phải nhập lại mật khẩu để xác nhận. Trừ tiền không được làm
              giảm số dư khả dụng xuống dưới số tiền đang giữ chỗ.
            </div>

            <div className="admin-fa-form-actions">
              <button
                type="button"
                className="admin-fa-secondary-button"
                onClick={() => setShowCreateForm(false)}
                disabled={submitting}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-fa-primary-button"
                disabled={submitting}
              >
                {submitting ? "Đang tạo..." : "Tạo phiếu chờ xác nhận"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-fa-panel">
        <div className="admin-fa-panel-heading">
          <div>
            <h2>Danh sách phiếu điều chỉnh</h2>
            <p>Chọn một phiếu để xem chi tiết hoặc xác nhận.</p>
          </div>

          <button
            type="button"
            className="admin-fa-secondary-button"
            onClick={() => void loadAdjustments()}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        <div className="admin-fa-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm mã phiếu, ID tài khoản..."
            aria-label="Tìm kiếm phiếu điều chỉnh"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as FinancialAdjustmentStatus | "",
              );
              setPage(1);
            }}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
        </div>

        <div className="admin-fa-table-wrapper">
          <table className="admin-fa-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Tài khoản nhận</th>
                <th>Loại</th>
                <th>Số tiền</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Hạn xác nhận</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="admin-fa-table-message">
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-fa-table-message">
                    Không có phiếu điều chỉnh phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.ticketCode}</strong>
                    </td>

                    <td>
                      <div className="admin-fa-account-name">
                        {ticket.recipient.person.fullName}
                      </div>
                      <small>
                        {ticket.recipient.platform} · ID {ticket.recipient.id}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`admin-fa-direction admin-fa-direction-${ticket.direction.toLowerCase()}`}
                      >
                        {ticket.direction === "CREDIT" ? "Cộng tiền" : "Trừ tiền"}
                      </span>
                    </td>

                    <td
                      className={
                        ticket.direction === "CREDIT"
                          ? "admin-fa-money-credit"
                          : "admin-fa-money-debit"
                      }
                    >
                      {ticket.direction === "CREDIT" ? "+" : "−"}
                      {formatMoney(ticket.amount)}
                    </td>

                    <td>{REASON_LABELS[ticket.reason]}</td>

                    <td>
                      <span
                        className={`admin-fa-status admin-fa-status-${ticket.status.toLowerCase()}`}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>

                    <td>
                      {ticket.status === "PENDING" ? (
                        <span
                          className={
                            new Date(ticket.expiresAt).getTime() <= Date.now()
                              ? "admin-fa-expired-text"
                              : ""
                          }
                        >
                          {getRemainingTime(ticket.expiresAt)}
                        </span>
                      ) : (
                        formatDate(ticket.expiresAt)
                      )}
                    </td>

                    <td>{formatDate(ticket.createdAt)}</td>

                    <td>
                      <button
                        type="button"
                        className="admin-fa-link-button"
                        onClick={() => openTicket(ticket)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-fa-pagination">
          <span>
            Tổng {total} phiếu · Trang {page}/{totalPages}
          </span>

          <div>
            <button
              type="button"
              className="admin-fa-secondary-button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>

            <button
              type="button"
              className="admin-fa-secondary-button"
              disabled={loading || page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {selectedTicket && (
        <div
          className="admin-fa-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTicket();
            }
          }}
        >
          <section
            className="admin-fa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-fa-detail-title"
          >
            <div className="admin-fa-modal-header">
              <div>
                <h2 id="admin-fa-detail-title">Chi tiết phiếu</h2>
                <p>{selectedTicket.ticketCode}</p>
              </div>

              <button
                type="button"
                className="admin-fa-modal-close"
                onClick={closeTicket}
                aria-label="Đóng chi tiết phiếu"
              >
                ×
              </button>
            </div>

            <div className="admin-fa-detail-grid">
              <div>
                <span>Tài khoản nhận</span>
                <strong>{selectedTicket.recipient.person.fullName}</strong>
                <small>
                  {selectedTicket.recipient.platform} · ID{" "}
                  {selectedTicket.recipient.id}
                </small>
              </div>

              <div>
                <span>Loại điều chỉnh</span>
                <strong>
                  {selectedTicket.direction === "CREDIT"
                    ? "Cộng tiền"
                    : "Trừ tiền"}
                </strong>
              </div>

              <div>
                <span>Số tiền</span>
                <strong>
                  {formatMoney(selectedTicket.amount)}
                </strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>{STATUS_LABELS[selectedTicket.status]}</strong>
              </div>

              <div>
                <span>Lý do</span>
                <strong>{REASON_LABELS[selectedTicket.reason]}</strong>
              </div>

              <div>
                <span>Người tạo</span>
                <strong>{selectedTicket.createdBy.username}</strong>
              </div>

              <div>
                <span>Người xác nhận</span>
                <strong>
                  {selectedTicket.confirmedBy?.username ?? "Chưa xác nhận"}
                </strong>
              </div>

              <div>
                <span>Ngày tạo</span>
                <strong>{formatDate(selectedTicket.createdAt)}</strong>
              </div>

              <div>
                <span>Hạn xác nhận</span>
                <strong>{formatDate(selectedTicket.expiresAt)}</strong>
              </div>

              <div>
                <span>Ngày hoàn tất</span>
                <strong>{formatDate(selectedTicket.completedAt)}</strong>
              </div>

              <div className="admin-fa-detail-full">
                <span>Ghi chú</span>
                <strong>{selectedTicket.note || "Không có ghi chú"}</strong>
              </div>
            </div>

            {selectedTicket.status === "PENDING" &&
              new Date(selectedTicket.expiresAt).getTime() > Date.now() && (
                <div className="admin-fa-confirm-section">
                  {!showConfirmForm ? (
                    <button
                      type="button"
                      className="admin-fa-primary-button"
                      onClick={() => {
                        setShowConfirmForm(true);
                        setError("");
                      }}
                    >
                      Xác nhận phiếu
                    </button>
                  ) : (
                    <form onSubmit={handleConfirmTicket}>
                      <label className="admin-fa-field">
                        <span>Mật khẩu ADMIN</span>
                        <input
                          type="password"
                          autoComplete="current-password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Nhập mật khẩu để xác nhận"
                          required
                        />
                      </label>

                      <p className="admin-fa-confirm-warning">
                        Xác nhận sẽ cập nhật số dư ví và ghi nhận giao dịch.
                        Hành động này không nên thực hiện nếu chưa kiểm tra kỹ
                        thông tin phiếu.
                      </p>

                      <div className="admin-fa-form-actions">
                        <button
                          type="button"
                          className="admin-fa-secondary-button"
                          disabled={submitting}
                          onClick={() => {
                            setShowConfirmForm(false);
                            setConfirmPassword("");
                          }}
                        >
                          Hủy
                        </button>

                        <button
                          type="submit"
                          className="admin-fa-primary-button"
                          disabled={submitting}
                        >
                          {submitting
                            ? "Đang xác nhận..."
                            : "Xác nhận và cập nhật ví"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            {selectedTicket.status === "PENDING" &&
              new Date(selectedTicket.expiresAt).getTime() <= Date.now() && (
                <div className="admin-fa-form-notice">
                  Phiếu đã đến hạn. Không thể xác nhận phiếu này.
                </div>
              )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminFinancialAdjustmentsPage;
