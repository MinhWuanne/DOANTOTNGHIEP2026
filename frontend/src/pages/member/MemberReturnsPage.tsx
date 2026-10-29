import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    createMemberReturn,
    getMyMemberReturnById,
    getMyMemberReturns,
    type MemberReturnRequest,
    type MemberReturnStatus,
} from "../../services/api/member-return.api";

import {
    getMyMemberOrders,
    type MemberOrder,
} from "../../services/api/member-checkout.api";

import "./MemberReturnsPage.css";

const RETURN_STATUS_LABELS: Record<MemberReturnStatus, string> = {
    PENDING: "Đang chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    REFUNDED: "Đã hoàn tiền",
};

const ERROR_MESSAGES: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Vui lòng đăng nhập để tiếp tục.",
    MEMBER_ACCOUNT_REQUIRED: "Chức năng này chỉ dành cho thành viên.",
    ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
    ORDER_ACCESS_FORBIDDEN: "Bạn không có quyền truy cập đơn hàng này.",
    RETURN_REQUIRES_DELIVERED_ORDER: "Chỉ có thể yêu cầu trả hàng với đơn đã giao.",
    ORDER_DELIVERED_AT_REQUIRED: "Đơn hàng chưa có thời gian giao hàng hợp lệ.",
    RETURN_REQUIRES_PAID_ORDER: "Đơn hàng cần được thanh toán thành công trước khi trả hàng.",
    RETURN_REQUEST_ALREADY_EXISTS: "Đơn hàng này đã có yêu cầu trả hàng.",
    RETURN_WINDOW_EXPIRED: "Đã quá thời hạn 72 giờ để yêu cầu trả hàng.",
    RETURN_REQUEST_NOT_FOUND: "Không tìm thấy yêu cầu trả hàng.",
};

function getErrorMessage(error: unknown): string {
    const code =
        error instanceof Error ? error.message : "MEMBER_RETURN_REQUEST_FAILED";

    return ERROR_MESSAGES[code] ?? `Không thể xử lý yêu cầu: ${code}`;
}

function formatMoney(value: string | number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

function getStatusClass(status: MemberReturnStatus): string {
    return `member-return-status member-return-status--${status.toLowerCase()}`;
}

function isPotentiallyEligible(order: MemberOrder): boolean {
    return (
        order.status === "DELIVERED" &&
        order.paymentStatus === "PAID"
    );
}

export default function MemberReturnsPage() {
    const [returns, setReturns] = useState<MemberReturnRequest[]>([]);
    const [orders, setOrders] = useState<MemberOrder[]>([]);
    const [selectedReturn, setSelectedReturn] =
        useState<MemberReturnRequest | null>(null);

    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [note, setNote] = useState("");

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [pageError, setPageError] = useState("");
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setPageError("");

        try {
            const [returnRequests, memberOrders] = await Promise.all([
                getMyMemberReturns(),
                getMyMemberOrders(),
            ]);

            setReturns(returnRequests);
            setOrders(memberOrders);

            setSelectedOrderId((current) => {
                if (
                    current &&
                    memberOrders.some((order) => String(order.id) === current)
                ) {
                    return current;
                }

                const existingOrderIds = new Set(
                    returnRequests.map((item) => String(item.orderId)),
                );

                const availableOrder = memberOrders.find(
                    (order) =>
                        isPotentiallyEligible(order) &&
                        !existingOrderIds.has(String(order.id)),
                );

                return availableOrder ? String(availableOrder.id) : "";
            });
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    async function handleViewDetail(id: string) {
        setDetailLoading(true);
        setPageError("");

        try {
            const detail = await getMyMemberReturnById(id);
            setSelectedReturn(detail);
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleCreateReturn() {
        if (!selectedOrderId) {
            setFormError("Vui lòng chọn đơn hàng muốn trả.");
            return;
        }

        setSubmitting(true);
        setFormError("");
        setPageError("");
        setSuccessMessage("");

        try {
            await createMemberReturn({
                orderId: selectedOrderId,
                note: note.trim() || undefined,
            });

            setSelectedReturn(null);
            setNote("");
            setSuccessMessage("Đã gửi yêu cầu trả hàng thành công.");

            await loadData();
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    const existingOrderIds = new Set(
        returns.map((item) => String(item.orderId)),
    );

    const eligibleOrders = orders.filter(
        (order) =>
            isPotentiallyEligible(order) &&
            !existingOrderIds.has(String(order.id)),
    );

    return (
        <main className="member-returns-page">
            <div className="member-returns-container">
                <div className="member-returns-breadcrumb">
                    <Link to="/member">Tài khoản</Link>
                    <span>/</span>
                    <span>Yêu cầu trả hàng</span>
                </div>

                <header className="member-returns-header">
                    <div>
                        <p className="member-returns-eyebrow">HỖ TRỢ ĐƠN HÀNG</p>
                        <h1>Yêu cầu trả hàng</h1>
                        <p>
                            Theo dõi yêu cầu trả hàng và gửi yêu cầu cho đơn hàng của bạn.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="member-returns-refresh"
                        onClick={() => void loadData()}
                        disabled={loading}
                    >
                        Làm mới
                    </button>
                </header>

                {pageError && (
                    <div className="member-returns-alert member-returns-alert--error">
                        {pageError}
                    </div>
                )}

                {successMessage && (
                    <div className="member-returns-alert member-returns-alert--success">
                        {successMessage}
                    </div>
                )}

                <section className="member-returns-panel">
                    <div className="member-returns-section-heading">
                        <div>
                            <h2>Tạo yêu cầu mới</h2>
                            <p>
                                Chỉ những đơn đã giao và đã thanh toán mới được đưa vào danh sách chọn.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="member-returns-muted">Đang tải đơn hàng...</p>
                    ) : eligibleOrders.length === 0 ? (
                        <p className="member-returns-muted">
                            Hiện không có đơn hàng phù hợp để tạo yêu cầu mới. Đơn hàng đã có
                            yêu cầu trả hàng sẽ không xuất hiện ở đây.
                        </p>
                    ) : (
                        <div className="member-returns-form">
                            <label htmlFor="member-return-order">Đơn hàng</label>
                            <select
                                id="member-return-order"
                                value={selectedOrderId}
                                onChange={(event) => setSelectedOrderId(event.target.value)}
                                disabled={submitting}
                            >
                                <option value="">-- Chọn đơn hàng --</option>
                                {eligibleOrders.map((order) => (
                                    <option key={order.id} value={String(order.id)}>
                                        {order.orderNumber} — {formatMoney(order.totalAmount)}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="member-return-note">
                                Lý do trả hàng (không bắt buộc)
                            </label>
                            <textarea
                                id="member-return-note"
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="Mô tả lý do bạn muốn trả hàng..."
                                rows={4}
                                maxLength={1000}
                                disabled={submitting}
                            />

                            <p className="member-returns-field-hint">
                                Yêu cầu sẽ được quản trị viên xem xét. Việc gửi yêu cầu chưa đồng
                                nghĩa với việc đơn hàng đã được hoàn tiền.
                            </p>

                            {formError && (
                                <div className="member-returns-alert member-returns-alert--error">
                                    {formError}
                                </div>
                            )}

                            <button
                                type="button"
                                className="member-returns-submit"
                                onClick={() => void handleCreateReturn()}
                                disabled={submitting || !selectedOrderId}
                            >
                                {submitting ? "Đang gửi..." : "Gửi yêu cầu trả hàng"}
                            </button>
                        </div>
                    )}
                </section>

                <section className="member-returns-panel">
                    <div className="member-returns-section-heading">
                        <div>
                            <h2>Lịch sử yêu cầu</h2>
                            <p>Các yêu cầu trả hàng đã gửi từ tài khoản của bạn.</p>
                        </div>
                        <span className="member-returns-count">{returns.length}</span>
                    </div>

                    {loading ? (
                        <p className="member-returns-muted">Đang tải lịch sử...</p>
                    ) : returns.length === 0 ? (
                        <div className="member-returns-empty">
                            <h3>Chưa có yêu cầu trả hàng</h3>
                            <p>Các yêu cầu bạn gửi sẽ được hiển thị tại đây.</p>
                        </div>
                    ) : (
                        <div className="member-returns-list">
                            {returns.map((item) => (
                                <article className="member-returns-card" key={item.id}>
                                    <div className="member-returns-card-main">
                                        <div>
                                            <p className="member-returns-order-label">MÃ ĐƠN HÀNG</p>
                                            <h3>{item.order.orderNumber}</h3>
                                        </div>
                                        <span className={getStatusClass(item.status)}>
                                            {RETURN_STATUS_LABELS[item.status]}
                                        </span>
                                    </div>

                                    <div className="member-returns-card-meta">
                                        <span>
                                            Gửi lúc: {formatDate(item.requestedAt)}
                                        </span>
                                        <strong>{formatMoney(item.order.totalAmount)}</strong>
                                    </div>

                                    {item.note && (
                                        <p className="member-returns-note">{item.note}</p>
                                    )}

                                    <button
                                        type="button"
                                        className="member-returns-detail-button"
                                        onClick={() => void handleViewDetail(item.id)}
                                        disabled={detailLoading}
                                    >
                                        {detailLoading ? "Đang tải..." : "Xem chi tiết"}
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {selectedReturn && (
                    <section className="member-returns-panel member-returns-detail">
                        <div className="member-returns-section-heading">
                            <div>
                                <p className="member-returns-eyebrow">
                                    CHI TIẾT YÊU CẦU #{selectedReturn.id}
                                </p>
                                <h2>{selectedReturn.order.orderNumber}</h2>
                            </div>
                            <button
                                type="button"
                                className="member-returns-close-detail"
                                onClick={() => setSelectedReturn(null)}
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="member-returns-detail-status">
                            <span>Trạng thái</span>
                            <span className={getStatusClass(selectedReturn.status)}>
                                {RETURN_STATUS_LABELS[selectedReturn.status]}
                            </span>
                        </div>

                        <div className="member-returns-detail-grid">
                            <div>
                                <span>Ngày gửi yêu cầu</span>
                                <strong>{formatDate(selectedReturn.requestedAt)}</strong>
                            </div>
                            <div>
                                <span>Ngày duyệt</span>
                                <strong>
                                    {selectedReturn.approvedAt
                                        ? formatDate(selectedReturn.approvedAt)
                                        : "Chưa có"}
                                </strong>
                            </div>
                            <div>
                                <span>Ngày hoàn tiền</span>
                                <strong>
                                    {selectedReturn.refundedAt
                                        ? formatDate(selectedReturn.refundedAt)
                                        : "Chưa có"}
                                </strong>
                            </div>
                            <div>
                                <span>Tổng giá trị đơn</span>
                                <strong>{formatMoney(selectedReturn.order.totalAmount)}</strong>
                            </div>
                        </div>

                        <h3 className="member-returns-items-heading">Sản phẩm trong đơn</h3>
                        <div className="member-returns-items">
                            {selectedReturn.order.items.map((item) => (
                                <div className="member-returns-item" key={item.id}>
                                    <div>
                                        <strong>{item.productName}</strong>
                                        <span>
                                            {item.variant?.name ?? item.sku} · SL: {item.quantity}
                                        </span>
                                    </div>
                                    <strong>{formatMoney(item.subtotal)}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="member-returns-detail-note">
                            <strong>Lý do trả hàng</strong>
                            <p>{selectedReturn.note || "Không cung cấp lý do."}</p>
                        </div>

                        <p className="member-returns-policy-note">
                            Lưu ý: Gửi yêu cầu không tự động thay đổi trạng thái đơn hàng,
                            hoàn tiền hoặc khôi phục tồn kho. Các bước tiếp theo phụ thuộc vào
                            kết quả xử lý yêu cầu.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
