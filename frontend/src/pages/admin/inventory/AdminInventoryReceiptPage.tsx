
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    cancelAdminInventoryReceipt,
    confirmAdminInventoryReceipt,
    createAdminInventoryReceipt,
    getAdminInventoryReceiptById,
    getAdminInventoryReceipts,
    type AdminInventoryReceipt,
    type InventoryReceiptStatus,
    type AdminInventoryReceiptPagination,
    type AdminInventoryReceiptSummary,
} from "../../../services/api/admin-inventory-receipt.api";

import {
    getAdminInventories,
    type AdminInventory,
} from "../../../services/api/admin-inventory.api";

import { getAccessToken } from "../../../utils/auth";
import AdminInventoryReceiptPrint from "./AdminInventoryReceiptPrint";

import "./AdminInventoryReceiptPage.css";

type ReceiptItemDraft = {
    variantId: string;
    quantity: number;
};

const DEFAULT_PAGE_SIZE = 10;

function formatDate(value: string | null) {
    if (!value) {
        return "—";
    }

    return new Date(value).toLocaleString("vi-VN");
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

function getStatusLabel(status: InventoryReceiptStatus) {
    switch (status) {
        case "DRAFT":
            return "Nháp";
        case "CONFIRMED":
            return "Đã nhập";
        case "CANCELLED":
            return "Đã hủy";
        default:
            return status;
    }
}

function getStatusClass(status: InventoryReceiptStatus) {
    switch (status) {
        case "DRAFT":
            return "draft";
        case "CONFIRMED":
            return "confirmed";
        case "CANCELLED":
            return "cancelled";
        default:
            return "";
    }
}

function AdminInventoryReceiptPage() {
    const [receipts, setReceipts] = useState<AdminInventoryReceipt[]>([]);
    const [inventories, setInventories] = useState<AdminInventory[]>([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        "ALL" | InventoryReceiptStatus
    >("ALL");

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

    const [pagination, setPagination] =
        useState<AdminInventoryReceiptPagination>({
            page: 1,
            limit: DEFAULT_PAGE_SIZE,
            total: 0,
            totalPages: 0,
        });

    const [summary, setSummary] =
        useState<AdminInventoryReceiptSummary>({
            total: 0,
            draft: 0,
            confirmed: 0,
            cancelled: 0,
        });

    const [loading, setLoading] = useState(true);
    const [loadingInventories, setLoadingInventories] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [selectedReceipt, setSelectedReceipt] =
        useState<AdminInventoryReceipt | null>(null);

    const [showPrint, setShowPrint] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [note, setNote] = useState("");
    const [draftItems, setDraftItems] = useState<ReceiptItemDraft[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState("1");

    const accessToken = getAccessToken("ADMIN");

    const loadReceipts = useCallback(async (
        requestedPage = page,
        requestedLimit = limit,
    ) => {
        if (!accessToken) {
            setError("Không tìm thấy phiên đăng nhập.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await getAdminInventoryReceipts(accessToken, {
                page: requestedPage,
                limit: requestedLimit,
                search: search.trim(),
                status: statusFilter,
            });

            setReceipts(data.items);
            setPagination(data.pagination);
            setSummary(data.summary);

            // Backend có thể trả totalPages = 0 khi chưa có dữ liệu.
            // Nếu trang hiện tại vượt phạm vi sau khi dữ liệu thay đổi,
            // chuyển về trang hợp lệ và tải lại.
            if (
                data.pagination.totalPages > 0 &&
                requestedPage > data.pagination.totalPages
            ) {
                setPage(data.pagination.totalPages);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải danh sách phiếu nhập.",
            );
        } finally {
            setLoading(false);
        }
    }, [accessToken, limit, page, search, statusFilter]);

    async function loadInventories() {
        if (!accessToken) {
            setLoadingInventories(false);
            return;
        }

        try {
            setLoadingInventories(true);
            const data = await getAdminInventories(accessToken);
            setInventories(data);
        } catch {
            // Giữ trạng thái danh sách rỗng để form hiển thị phù hợp.
        } finally {
            setLoadingInventories(false);
        }
    }

    useEffect(() => {
        void loadReceipts(page, limit);
    }, [loadReceipts, page, limit]);

    useEffect(() => {
        void loadInventories();
        // Chỉ tải danh sách tồn kho ban đầu.
        // Sau khi xác nhận phiếu, hàm này được gọi lại thủ công.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounce tìm kiếm để không gọi API theo từng ký tự quá dày.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (page !== 1) {
                setPage(1);
            } else {
                void loadReceipts(1, limit);
            }
        }, 300);

        return () => window.clearTimeout(timer);
        // Không thêm loadReceipts vào dependency ở đây vì callback
        // thay đổi theo search; useEffect tải danh sách phía trên
        // đã xử lý request khi search thay đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (page !== 1) {
            setPage(1);
        } else {
            void loadReceipts(1, limit);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, limit]);

    const availableVariants = useMemo(() => {
        return [...inventories].sort((a, b) => {
            const productCompare = a.variant.product.name.localeCompare(
                b.variant.product.name,
                "vi",
            );

            if (productCompare !== 0) {
                return productCompare;
            }

            return a.variant.sku.localeCompare(b.variant.sku, "vi");
        });
    }, [inventories]);

    const draftItemIds = useMemo(
        () => new Set(draftItems.map((item) => item.variantId)),
        [draftItems],
    );

    function resetCreateForm() {
        setNote("");
        setDraftItems([]);
        setSelectedVariantId("");
        setSelectedQuantity("1");
        setActionError(null);
    }

    function openCreateModal() {
        resetCreateForm();
        setShowCreateModal(true);
    }

    function closeCreateModal() {
        if (submitting) {
            return;
        }

        setShowCreateModal(false);
        resetCreateForm();
    }

    function addDraftItem() {
        setActionError(null);

        if (!selectedVariantId) {
            setActionError("Vui lòng chọn biến thể sản phẩm.");
            return;
        }

        const quantity = Number(selectedQuantity);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setActionError("Số lượng phải là số nguyên lớn hơn 0.");
            return;
        }

        if (draftItemIds.has(selectedVariantId)) {
            setActionError("Biến thể này đã có trong phiếu nhập.");
            return;
        }

        setDraftItems((current) => [
            ...current,
            {
                variantId: selectedVariantId,
                quantity,
            },
        ]);

        setSelectedVariantId("");
        setSelectedQuantity("1");
    }

    function removeDraftItem(variantId: string) {
        setDraftItems((current) =>
            current.filter((item) => item.variantId !== variantId),
        );
    }

    function getInventoryByVariantId(variantId: string) {
        return inventories.find(
            (inventory) => inventory.variantId === variantId,
        );
    }

    async function handleCreateReceipt() {
        setActionError(null);

        if (draftItems.length === 0) {
            setActionError("Phiếu nhập phải có ít nhất một mặt hàng.");
            return;
        }

        if (!accessToken) {
            setActionError("Không tìm thấy phiên đăng nhập.");
            return;
        }

        try {
            setSubmitting(true);

            await createAdminInventoryReceipt(accessToken, {
                note: note.trim() || undefined,
                items: draftItems,
            });

            setShowCreateModal(false);
            resetCreateForm();

            // Phiếu mới nhất nằm đầu danh sách.
            setPage(1);
            await loadReceipts(1, limit);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Không thể tạo phiếu nhập.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleConfirmReceipt() {
        if (!selectedReceipt || selectedReceipt.status !== "DRAFT") {
            return;
        }

        if (!accessToken) {
            setActionError("Không tìm thấy phiên đăng nhập.");
            return;
        }

        const confirmed = window.confirm(
            `Xác nhận nhập hàng cho phiếu ${selectedReceipt.receiptNumber}? Tồn kho sẽ được cộng ngay sau khi xác nhận.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setActionError(null);

            await confirmAdminInventoryReceipt(
                accessToken,
                selectedReceipt.id,
            );

            const updated = await getAdminInventoryReceiptById(
                accessToken,
                selectedReceipt.id,
            );

            setSelectedReceipt(updated);
            await loadReceipts(page, limit);
            await loadInventories();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Không thể xác nhận phiếu nhập.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    async function handleCancelReceipt() {
        if (!selectedReceipt || selectedReceipt.status !== "DRAFT") {
            return;
        }

        if (!accessToken) {
            setActionError("Không tìm thấy phiên đăng nhập.");
            return;
        }

        const confirmed = window.confirm(
            `Bạn có chắc muốn hủy phiếu ${selectedReceipt.receiptNumber}?`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setActionError(null);

            await cancelAdminInventoryReceipt(
                accessToken,
                selectedReceipt.id,
            );

            const updated = await getAdminInventoryReceiptById(
                accessToken,
                selectedReceipt.id,
            );

            setSelectedReceipt(updated);
            await loadReceipts(page, limit);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Không thể hủy phiếu nhập.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    function handlePrintReceipt(receipt: AdminInventoryReceipt) {
        if (receipt.status !== "CONFIRMED") {
            return;
        }

        setSelectedReceipt(receipt);
        setShowPrint(true);
    }

    async function handleOpenReceipt(receipt: AdminInventoryReceipt) {
        if (!accessToken) {
            return;
        }

        try {
            setActionError(null);

            const detail = await getAdminInventoryReceiptById(
                accessToken,
                receipt.id,
            );

            setSelectedReceipt(detail);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải chi tiết phiếu nhập.",
            );
        }
    }

    const totalPages = pagination.totalPages;
    const startRecord = pagination.total === 0
        ? 0
        : (pagination.page - 1) * pagination.limit + 1;
    const endRecord = Math.min(
        pagination.page * pagination.limit,
        pagination.total,
    );

    if (showPrint && selectedReceipt) {
        return (
            <AdminInventoryReceiptPrint
                receipt={selectedReceipt}
                onBack={() => setShowPrint(false)}
            />
        );
    }

    return (
        <div className="admin-inventory-receipt-page">
            <div className="admin-inventory-receipt-header">
                <div>
                    <span className="admin-inventory-receipt-eyebrow">
                        KHO HÀNG
                    </span>
                    <h1>Nhập hàng</h1>
                    <p>
                        Quản lý các phiếu nhập và cập nhật tồn kho
                        thông qua quy trình xác nhận nhập hàng.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-button admin-button-primary"
                    onClick={openCreateModal}
                >
                    + Tạo phiếu nhập
                </button>
            </div>

            <div className="admin-inventory-receipt-stats">
                <div className="admin-inventory-receipt-stat-card">
                    <span>Tổng phiếu</span>
                    <strong>{formatNumber(summary.total)}</strong>
                </div>
                <div className="admin-inventory-receipt-stat-card">
                    <span>Nháp</span>
                    <strong>{formatNumber(summary.draft)}</strong>
                </div>
                <div className="admin-inventory-receipt-stat-card">
                    <span>Đã nhập</span>
                    <strong>{formatNumber(summary.confirmed)}</strong>
                </div>
                <div className="admin-inventory-receipt-stat-card">
                    <span>Đã hủy</span>
                    <strong>{formatNumber(summary.cancelled)}</strong>
                </div>
            </div>

            {error && (
                <div className="admin-alert admin-alert-error">
                    {error}
                </div>
            )}

            {actionError && !showCreateModal && (
                <div className="admin-alert admin-alert-error">
                    {actionError}
                </div>
            )}

            <section className="admin-card admin-inventory-receipt-content">
                <div className="admin-inventory-receipt-toolbar">
                    <div className="admin-inventory-receipt-search">
                        <input
                            className="admin-input"
                            type="search"
                            placeholder="Tìm mã phiếu, người tạo, sản phẩm, SKU..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <select
                        className="admin-select"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value as "ALL" | InventoryReceiptStatus,
                            )
                        }
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="CONFIRMED">Đã nhập</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>

                    <select
                        className="admin-select"
                        value={limit}
                        onChange={(event) => setLimit(Number(event.target.value))}
                        aria-label="Số phiếu mỗi trang"
                    >
                        <option value={10}>10 / trang</option>
                        <option value={20}>20 / trang</option>
                        <option value={50}>50 / trang</option>
                    </select>
                </div>

                {loading ? (
                    <div className="admin-inventory-receipt-state">
                        Đang tải danh sách phiếu nhập...
                    </div>
                ) : error ? (
                    <div className="admin-inventory-receipt-state">
                        Không thể tải danh sách. Vui lòng thử tải lại.
                        <div>
                            <button
                                type="button"
                                className="admin-button admin-button-secondary"
                                onClick={() => void loadReceipts(page, limit)}
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                ) : receipts.length === 0 ? (
                    <div className="admin-inventory-receipt-state">
                        <strong>Không có phiếu nhập phù hợp</strong>
                        <span>
                            Thử thay đổi bộ lọc hoặc tạo phiếu nhập mới.
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Mã phiếu</th>
                                        <th>Số mặt hàng</th>
                                        <th>Người tạo</th>
                                        <th>Ngày tạo</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map((receipt) => (
                                        <tr key={receipt.id}>
                                            <td>
                                                <strong>{receipt.receiptNumber}</strong>
                                            </td>
                                            <td>{formatNumber(receipt.items.length)}</td>
                                            <td>{receipt.createdBy.username}</td>
                                            <td>{formatDate(receipt.createdAt)}</td>
                                            <td>
                                                <span
                                                    className={`admin-badge admin-inventory-receipt-status ${getStatusClass(receipt.status)}`}
                                                >
                                                    {getStatusLabel(receipt.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="admin-button admin-button-secondary admin-button-small"
                                                    onClick={() => void handleOpenReceipt(receipt)}
                                                >
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                        <div className="admin-inventory-receipt-pagination">
                            <div className="admin-inventory-receipt-pagination-info">
                                <span>
                                    Hiển thị{" "}
                                    <strong>{formatNumber(startRecord)}–{formatNumber(endRecord)}</strong>
                                    {" / "}
                                    <strong>{formatNumber(pagination.total)}</strong>
                                    {" phiếu"}
                                </span>

                                <select
                                    className="admin-select admin-inventory-receipt-page-size"
                                    value={limit}
                                    onChange={(event) => setLimit(Number(event.target.value))}
                                    aria-label="Số phiếu mỗi trang"
                                >
                                    <option value={10}>10 / trang</option>
                                    <option value={20}>20 / trang</option>
                                    <option value={50}>50 / trang</option>
                                </select>
                            </div>
                            
                            {totalPages > 0 && (
                            <div
                                className="admin-inventory-receipt-pagination-controls"
                                aria-label="Phân trang danh sách phiếu nhập"
                            >
                                <button
                                    type="button"
                                    className="admin-button admin-button-secondary admin-button-small"
                                    disabled={page <= 1 || loading}
                                    onClick={() =>
                                        setPage((current) => Math.max(1, current - 1))
                                    }
                                    aria-label="Trang trước"
                                >
                                    ‹
                                </button>

                                <span>
                                    {formatNumber(pagination.page)} / {formatNumber(totalPages)}
                                </span>

                                <button
                                    type="button"
                                    className="admin-button admin-button-secondary admin-button-small"
                                    disabled={
                                        loading ||
                                        totalPages === 0 ||
                                        page >= totalPages
                                    }
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(totalPages, current + 1),
                                        )
                                    }
                                    aria-label="Trang sau"
                                >
                                    ›
                                </button>
                            </div>
                            )}
                        </div>


                    </>
                )}
            </section>

            {showCreateModal && (
                <div
                    className="admin-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCreateModal();
                        }
                    }}
                >
                    <div className="admin-modal admin-inventory-receipt-create-modal">
                        <div className="admin-modal-header">
                            <div>
                                <span className="admin-inventory-receipt-eyebrow">
                                    KHO HÀNG
                                </span>
                                <h2>Tạo phiếu nhập</h2>
                            </div>
                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={closeCreateModal}
                                disabled={submitting}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            {actionError && (
                                <div className="admin-alert admin-alert-error">
                                    {actionError}
                                </div>
                            )}

                            <div className="admin-form-group">
                                <label htmlFor="receipt-note">Ghi chú</label>
                                <textarea
                                    id="receipt-note"
                                    className="admin-input admin-inventory-receipt-note"
                                    rows={3}
                                    placeholder="Ví dụ: Nhập hàng đợt tháng 10..."
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                />
                            </div>

                            <div className="admin-inventory-receipt-add-item">
                                <div className="admin-form-group">
                                    <label htmlFor="receipt-variant">Biến thể</label>
                                    <select
                                        id="receipt-variant"
                                        className="admin-select"
                                        value={selectedVariantId}
                                        onChange={(event) =>
                                            setSelectedVariantId(event.target.value)
                                        }
                                        disabled={loadingInventories || submitting}
                                    >
                                        <option value="">
                                            {loadingInventories
                                                ? "Đang tải biến thể..."
                                                : "Chọn biến thể"}
                                        </option>

                                        {availableVariants.map((inventory) => (
                                            <option
                                                key={inventory.variantId}
                                                value={inventory.variantId}
                                                disabled={draftItemIds.has(inventory.variantId)}
                                            >
                                                {inventory.variant.product.name}
                                                {" — "}
                                                {inventory.variant.name}
                                                {" — SKU: "}
                                                {inventory.variant.sku}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admin-form-group admin-inventory-receipt-quantity">
                                    <label htmlFor="receipt-quantity">Số lượng</label>
                                    <input
                                        id="receipt-quantity"
                                        className="admin-input"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={selectedQuantity}
                                        onChange={(event) =>
                                            setSelectedQuantity(event.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="admin-button admin-button-secondary admin-inventory-receipt-add-button"
                                    onClick={addDraftItem}
                                    disabled={submitting}
                                >
                                    Thêm
                                </button>
                            </div>

                            <div className="admin-inventory-receipt-items">
                                <div className="admin-inventory-receipt-items-header">
                                    <strong>Mặt hàng trong phiếu</strong>
                                    <span>{draftItems.length} mặt hàng</span>
                                </div>

                                {draftItems.length === 0 ? (
                                    <div className="admin-inventory-receipt-empty-items">
                                        Chưa có mặt hàng nào.
                                    </div>
                                ) : (
                                    <div className="admin-inventory-receipt-draft-list">
                                        {draftItems.map((draftItem) => {
                                            const inventory = getInventoryByVariantId(
                                                draftItem.variantId,
                                            );

                                            if (!inventory) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={draftItem.variantId}
                                                    className="admin-inventory-receipt-draft-row"
                                                >
                                                    <div>
                                                        <strong>
                                                            {inventory.variant.product.name}
                                                        </strong>
                                                        <span>
                                                            {inventory.variant.name}
                                                            {" · SKU: "}
                                                            {inventory.variant.sku}
                                                        </span>
                                                    </div>

                                                    <strong>
                                                        × {formatNumber(draftItem.quantity)}
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        className="admin-button admin-button-danger admin-button-small"
                                                        onClick={() =>
                                                            removeDraftItem(draftItem.variantId)
                                                        }
                                                        disabled={submitting}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="admin-modal-footer">
                            <button
                                type="button"
                                className="admin-button admin-button-secondary"
                                onClick={closeCreateModal}
                                disabled={submitting}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="admin-button admin-button-primary"
                                onClick={() => void handleCreateReceipt()}
                                disabled={submitting || draftItems.length === 0}
                            >
                                {submitting ? "Đang tạo..." : "Tạo phiếu nháp"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedReceipt && (
                <div
                    className="admin-drawer-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedReceipt(null);
                            setActionError(null);
                        }
                    }}
                >
                    <aside className="admin-drawer admin-inventory-receipt-drawer">
                        <div className="admin-drawer-header">
                            <div>
                                <span className="admin-inventory-receipt-eyebrow">
                                    PHIẾU NHẬP
                                </span>
                                <h2>{selectedReceipt.receiptNumber}</h2>
                            </div>
                            <button
                                type="button"
                                className="admin-drawer-close"
                                onClick={() => {
                                    setSelectedReceipt(null);
                                    setActionError(null);
                                }}
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

                            <div className="admin-inventory-receipt-detail-status">
                                <span
                                    className={`admin-badge admin-inventory-receipt-status ${getStatusClass(selectedReceipt.status)}`}
                                >
                                    {getStatusLabel(selectedReceipt.status)}
                                </span>
                            </div>

                            <div className="admin-inventory-receipt-detail-grid">
                                <div>
                                    <span>Người tạo</span>
                                    <strong>{selectedReceipt.createdBy.username}</strong>
                                </div>
                                <div>
                                    <span>Ngày tạo</span>
                                    <strong>{formatDate(selectedReceipt.createdAt)}</strong>
                                </div>
                                <div>
                                    <span>Ngày xác nhận</span>
                                    <strong>{formatDate(selectedReceipt.confirmedAt)}</strong>
                                </div>
                                <div>
                                    <span>Số mặt hàng</span>
                                    <strong>{formatNumber(selectedReceipt.items.length)}</strong>
                                </div>
                            </div>

                            {selectedReceipt.note && (
                                <div className="admin-readonly-field">
                                    <span>Ghi chú</span>
                                    <p>{selectedReceipt.note}</p>
                                </div>
                            )}

                            <div className="admin-inventory-receipt-detail-items">
                                <h3>Chi tiết mặt hàng</h3>
                                <div className="admin-inventory-receipt-detail-list">
                                    {selectedReceipt.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="admin-inventory-receipt-detail-row"
                                        >
                                            <div>
                                                <strong>
                                                    {item.variant.product.name}
                                                </strong>
                                                <span>
                                                    {item.variant.name}
                                                    {" · SKU: "}
                                                    {item.variant.sku}
                                                </span>
                                            </div>
                                            <strong>× {formatNumber(item.quantity)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedReceipt.status === "DRAFT" && (
                            <div className="admin-drawer-footer">
                                <button
                                    type="button"
                                    className="admin-button admin-button-danger"
                                    onClick={() => void handleCancelReceipt()}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Đang xử lý..." : "Hủy phiếu"}
                                </button>
                                <button
                                    type="button"
                                    className="admin-button admin-button-primary"
                                    onClick={() => void handleConfirmReceipt()}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? "Đang xử lý..."
                                        : "Xác nhận nhập"}
                                </button>
                            </div>
                        )}

                        {selectedReceipt.status === "CONFIRMED" && (
                            <div className="admin-drawer-footer">
                                <button
                                    type="button"
                                    className="admin-button admin-button-primary"
                                    onClick={() => handlePrintReceipt(selectedReceipt)}
                                >
                                    In phiếu
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}

export default AdminInventoryReceiptPage;