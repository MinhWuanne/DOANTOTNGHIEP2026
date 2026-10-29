
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    getAdminInventoryIssueById,
    getAdminInventoryIssues,
    type AdminInventoryIssue,
    type AdminInventoryIssueSummary,
} from "../../../services/api/admin-inventory-issue.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminInventoryIssuePage.css";
import AdminInventoryIssuePrint from "./AdminInventoryIssuePrint";

function formatDate(value: string | null) {
    if (!value) {
        return "—";
    }

    return new Date(value).toLocaleString("vi-VN");
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

function getStatusLabel(
    status: AdminInventoryIssue["status"],
) {
    switch (status) {
        case "COMPLETED":
            return "Đã xuất";

        default:
            return status;
    }
}

function getStatusClass(
    status: AdminInventoryIssue["status"],
) {
    switch (status) {
        case "COMPLETED":
            return "completed";

        default:
            return "";
    }
}

function AdminInventoryIssuePage() {
    const [issues, setIssues] = useState<
        AdminInventoryIssue[]
    >([]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);

    const [summary, setSummary] =
        useState<AdminInventoryIssueSummary>({
            total: 0,
            today: 0,
            totalItems: 0,
            totalQuantity: 0,
        });

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] = useState<
        "ALL" | AdminInventoryIssue["status"]
    >("ALL");

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(
        null,
    );

    const [actionError, setActionError] =
        useState<string | null>(null);

    const [selectedIssue, setSelectedIssue] =
        useState<AdminInventoryIssue | null>(null);

    const [loadingDetail, setLoadingDetail] =
        useState(false);

    const [showPrint, setShowPrint] = useState(false);

    const accessToken = getAccessToken("ADMIN");
    const requestIdRef = useRef(0);


    const loadIssues = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        if (!accessToken) {
            setError("Không tìm thấy phiên đăng nhập.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await getAdminInventoryIssues(
                accessToken,
                {
                    page,
                    limit: pageSize,
                    search,
                    ...(statusFilter !== "ALL"
                        ? { status: statusFilter }
                        : {}),
                },
            );

            // Bỏ qua response cũ nếu người dùng đã đổi bộ lọc,
            // từ khóa hoặc trang trong lúc request trước đang chạy.
            if (requestId !== requestIdRef.current) {
                return;
            }

            setIssues(result.items);
            setTotalRecords(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
            setSummary(result.summary);

            if (
                result.pagination.totalPages > 0 &&
                page > result.pagination.totalPages
            ) {
                setPage(result.pagination.totalPages);
            } else if (result.pagination.totalPages === 0) {
                setPage(1);
            }
        } catch (err) {
            if (requestId !== requestIdRef.current) {
                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải danh sách phiếu xuất.",
            );
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [
        accessToken,
        page,
        pageSize,
        search,
        statusFilter,
    ]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadIssues();
        }, 300);

        return () => {
            window.clearTimeout(timer);
            requestIdRef.current += 1;
        };
    }, [loadIssues]);

    const selectedIssueTotalQuantity = useMemo(() => {
        if (!selectedIssue) {
            return 0;
        }

        return selectedIssue.items.reduce(
            (total, item) => total + item.quantity,
            0,
        );
    }, [selectedIssue]);

    const startRecord =
        totalRecords === 0
            ? 0
            : (page - 1) * pageSize + 1;

    const endRecord = Math.min(
        page * pageSize,
        totalRecords,
    );

    async function handleOpenIssue(
        issue: AdminInventoryIssue,
    ) {
        if (!accessToken) {
            setActionError(
                "Không tìm thấy phiên đăng nhập.",
            );
            return;
        }

        try {
            setLoadingDetail(true);
            setActionError(null);

            const detail =
                await getAdminInventoryIssueById(
                    accessToken,
                    issue.id,
                );

            setSelectedIssue(detail);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải chi tiết phiếu xuất.",
            );
        } finally {
            setLoadingDetail(false);
        }
    }

    function closeDrawer() {
        setSelectedIssue(null);
        setActionError(null);
        setShowPrint(false);
    }

    /*
     * Khi đang ở chế độ in, chỉ render phiếu in.
     * Không render lại danh sách hoặc drawer phía sau.
     */
    if (showPrint && selectedIssue) {
        return (
            <AdminInventoryIssuePrint
                issue={selectedIssue}
                onBack={() => setShowPrint(false)}
            />
        );
    }

    return (
        <div className="admin-inventory-issue-page">
            <div className="admin-inventory-issue-header">
                <div>
                    <span className="admin-inventory-issue-eyebrow">
                        KHO HÀNG
                    </span>

                    <h1>Xuất hàng</h1>

                    <p>
                        Theo dõi lịch sử xuất kho được hệ thống
                        ghi nhận khi đơn hàng hoàn tất giao hàng.
                    </p>
                </div>
            </div>

            <div className="admin-inventory-issue-stats">
                <div className="admin-inventory-issue-stat-card">
                    <span>Tổng phiếu xuất</span>
                    <strong>
                        {formatNumber(summary.total)}
                    </strong>
                </div>

                <div className="admin-inventory-issue-stat-card">
                    <span>Xuất hôm nay</span>
                    <strong>
                        {formatNumber(summary.today)}
                    </strong>
                </div>

                <div className="admin-inventory-issue-stat-card">
                    <span>Tổng mặt hàng</span>
                    <strong>
                        {formatNumber(summary.totalItems)}
                    </strong>
                </div>

                <div className="admin-inventory-issue-stat-card">
                    <span>Tổng số lượng</span>
                    <strong>
                        {formatNumber(summary.totalQuantity)}
                    </strong>
                </div>
            </div>

            {error && (
                <div className="admin-alert admin-alert-error">
                    {error}
                </div>
            )}

            {actionError && !selectedIssue && (
                <div className="admin-alert admin-alert-error">
                    {actionError}
                </div>
            )}

            <section className="admin-card admin-inventory-issue-content">
                <div className="admin-inventory-issue-toolbar">
                    <div className="admin-inventory-issue-search">
                        <input
                            className="admin-input"
                            type="search"
                            placeholder="Tìm mã phiếu, đơn hàng, khách hàng, sản phẩm, SKU..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <select
                        className="admin-select"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(
                                event.target.value as
                                | "ALL"
                                | AdminInventoryIssue["status"],
                            );
                            setPage(1);
                        }}
                    >
                        <option value="ALL">
                            Tất cả trạng thái
                        </option>

                        <option value="COMPLETED">
                            Đã xuất
                        </option>
                    </select>
                </div>

                {loading ? (
                    <div className="admin-inventory-issue-state">
                        Đang tải danh sách phiếu xuất...
                    </div>
                ) : error ? (
                    <div className="admin-inventory-issue-state">
                        Không thể tải danh sách phiếu xuất.
                    </div>
                ) : issues.length === 0 ? (
                    <div className="admin-inventory-issue-state">
                        <strong>
                            Không có phiếu xuất phù hợp
                        </strong>

                        <span>
                            Thử thay đổi từ khóa hoặc bộ lọc.
                        </span>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã phiếu</th>
                                    <th>Đơn hàng</th>
                                    <th>Khách hàng</th>
                                    <th>Số mặt hàng</th>
                                    <th>Tổng số lượng</th>
                                    <th>Ngày xuất</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {issues.map((issue) => {
                                    const totalQuantity =
                                        issue.items.reduce(
                                            (total, item) =>
                                                total + item.quantity,
                                            0,
                                        );

                                    return (
                                        <tr key={issue.id}>
                                            <td>
                                                <strong>
                                                    {issue.issueNumber}
                                                </strong>
                                            </td>

                                            <td>
                                                {issue.order.orderNumber}
                                            </td>

                                            <td>
                                                {issue.order.account.person.fullName}
                                            </td>

                                            <td>
                                                {formatNumber(
                                                    issue.items.length,
                                                )}
                                            </td>

                                            <td>
                                                {formatNumber(totalQuantity)}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    issue.order.deliveredAt ??
                                                    issue.createdAt,
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-badge admin-inventory-issue-status ${getStatusClass(
                                                        issue.status,
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        issue.status,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="admin-button admin-button-secondary admin-button-small"
                                                    onClick={() =>
                                                        void handleOpenIssue(
                                                            issue,
                                                        )
                                                    }
                                                    disabled={loadingDetail}
                                                >
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="admin-inventory-issue-pagination">
                    <div className="admin-inventory-issue-pagination-info">
                        <span>
                            Hiển thị{" "}
                            <strong>
                                {formatNumber(startRecord)}–
                                {formatNumber(endRecord)}
                            </strong>
                            {" / "}
                            <strong>
                                {formatNumber(totalRecords)}
                            </strong>
                            {" phiếu xuất"}
                        </span>

                        <select
                            className="admin-select admin-inventory-issue-page-size"
                            value={pageSize}
                            onChange={(event) => {
                                setPageSize(Number(event.target.value));
                                setPage(1);
                            }}
                            aria-label="Số phiếu xuất mỗi trang"
                        >
                            <option value={10}>10 / trang</option>
                            <option value={20}>20 / trang</option>
                            <option value={50}>50 / trang</option>
                        </select>
                    </div>

                    {totalPages > 0 && (
                    <div
                        className="admin-inventory-issue-pagination-controls"
                        aria-label="Phân trang danh sách phiếu xuất"
                    >
                        <button
                            type="button"
                            className="admin-button admin-button-secondary admin-button-small"
                            aria-label="Trang trước"
                            disabled={page <= 1 || loading}
                            onClick={() =>
                                setPage((current) => current - 1)
                            }
                        >
                            ‹
                        </button>

                        <span>
                            {formatNumber(page)} / {formatNumber(totalPages)}
                        </span>

                        <button
                            type="button"
                            className="admin-button admin-button-secondary admin-button-small"
                            aria-label="Trang sau"
                            disabled={page >= totalPages || loading}
                            onClick={() =>
                                setPage((current) => current + 1)
                            }
                        >
                            ›
                        </button>
                    </div>
                    )}
                </div>
            </section>

            {selectedIssue && (
                <div
                    className="admin-drawer-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget
                        ) {
                            closeDrawer();
                        }
                    }}
                >
                    <aside className="admin-drawer admin-inventory-issue-drawer">
                        <div className="admin-drawer-header">
                            <div>
                                <span className="admin-inventory-issue-eyebrow">
                                    PHIẾU XUẤT
                                </span>

                                <h2>
                                    {selectedIssue.issueNumber}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="admin-drawer-close"
                                onClick={closeDrawer}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="admin-drawer-body">
                            {actionError && (
                                <div className="admin-alert admin-alert-error">
                                    {actionError}
                                </div>
                            )}

                            <div className="admin-inventory-issue-detail-status">
                                <span
                                    className={`admin-badge admin-inventory-issue-status ${getStatusClass(
                                        selectedIssue.status,
                                    )}`}
                                >
                                    {getStatusLabel(
                                        selectedIssue.status,
                                    )}
                                </span>
                            </div>

                            <div className="admin-inventory-issue-detail-section">
                                <h3>Thông tin xuất kho</h3>

                                <div className="admin-inventory-issue-detail-grid">
                                    <div>
                                        <span>Mã phiếu</span>
                                        <strong>
                                            {selectedIssue.issueNumber}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Ngày tạo phiếu</span>
                                        <strong>
                                            {formatDate(
                                                selectedIssue.createdAt,
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Đơn hàng</span>
                                        <strong>
                                            {selectedIssue.order.orderNumber}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Ngày giao hàng</span>
                                        <strong>
                                            {formatDate(
                                                selectedIssue.order.deliveredAt,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-inventory-issue-detail-section">
                                <h3>Thông tin khách hàng</h3>

                                <div className="admin-inventory-issue-customer">
                                    <strong>
                                        {selectedIssue.order.account.person.fullName}
                                    </strong>

                                    <span>
                                        Account ID:{" "}
                                        {selectedIssue.order.account.id}
                                    </span>
                                </div>
                            </div>

                            <div className="admin-inventory-issue-detail-items">
                                <div className="admin-inventory-issue-detail-items-header">
                                    <h3>Chi tiết hàng hóa</h3>

                                    <strong>
                                        Tổng{" "}
                                        {formatNumber(
                                            selectedIssueTotalQuantity,
                                        )}
                                    </strong>
                                </div>

                                <div className="admin-inventory-issue-detail-list">
                                    {selectedIssue.items.map(
                                        (item, index) => (
                                            <div
                                                key={item.id}
                                                className="admin-inventory-issue-detail-row"
                                            >
                                                <div className="admin-inventory-issue-detail-index">
                                                    <span>
                                                        {index + 1}
                                                    </span>
                                                </div>

                                                <div className="admin-inventory-issue-detail-product">
                                                    <strong>
                                                        {item.productName}
                                                    </strong>

                                                    <span>
                                                        SKU: {item.sku}
                                                    </span>
                                                </div>

                                                <div className="admin-inventory-issue-detail-quantity">
                                                    ×{" "}
                                                    {formatNumber(
                                                        item.quantity,
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            <div className="admin-inventory-issue-detail-actions">
                                <button
                                    type="button"
                                    className="admin-button admin-button-primary"
                                    onClick={() =>
                                        setShowPrint(true)
                                    }
                                >
                                    🖨 In phiếu
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

export default AdminInventoryIssuePage;