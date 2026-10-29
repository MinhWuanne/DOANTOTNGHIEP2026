import type { AdminInventoryIssue } from "../../../services/api/admin-inventory-issue.api";

import "./AdminInventoryIssuePrint.css";

interface AdminInventoryIssuePrintProps {
    issue: AdminInventoryIssue;
    onBack: () => void;
}

function formatDate(value: string) {
    const date = new Date(value);

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function AdminInventoryIssuePrint({
    issue,
    onBack,
}: AdminInventoryIssuePrintProps) {
    const totalQuantity = issue.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

    const deliveryDate = issue.order.deliveredAt
        ? formatDate(issue.order.deliveredAt)
        : formatDate(issue.createdAt);

    return (
        <div className="inventory-issue-print">
            <div className="inventory-issue-print-sheet">
                {/* HEADER */}

                <header className="inventory-issue-print-header">
                    <div className="inventory-issue-print-company">
                        <strong>ICON DENIM</strong>
                        <span>Kho hàng</span>
                    </div>

                    <div className="inventory-issue-print-title">
                        <h1>PHIẾU XUẤT KHO</h1>

                        <div className="inventory-issue-print-meta">
                            <div>
                                <span>Số phiếu</span>
                                <strong>{issue.issueNumber}</strong>
                            </div>

                            <div>
                                <span>Ngày lập</span>
                                <strong>{formatDate(issue.createdAt)}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                {/* INFORMATION */}

                <section className="inventory-issue-print-information">
                    <div className="inventory-issue-print-information-row">
                        <span className="label">Đơn vị:</span>
                        <strong>ICON DENIM</strong>
                    </div>

                    <div className="inventory-issue-print-information-row">
                        <span className="label">Bộ phận:</span>
                        <strong>Kho hàng</strong>
                    </div>

                    <div className="inventory-issue-print-information-row">
                        <span className="label">Đơn hàng:</span>
                        <strong>{issue.order.orderNumber}</strong>
                    </div>

                    <div className="inventory-issue-print-information-row">
                        <span className="label">Ngày xuất:</span>
                        <strong>{deliveryDate}</strong>
                    </div>

                    <div className="inventory-issue-print-information-row">
                        <span className="label">Khách hàng:</span>
                        <strong>
                            {issue.order.account.person.fullName}
                        </strong>
                    </div>

                    <div className="inventory-issue-print-information-row">
                        <span className="label">Mã tài khoản:</span>
                        <strong>{issue.order.account.id}</strong>
                    </div>
                </section>

                {/* TABLE */}

                <section className="inventory-issue-print-table-section">
                    <table className="inventory-issue-print-table">
                        <thead>
                            <tr>
                                <th className="col-index">STT</th>

                                <th className="col-product">
                                    Tên hàng hóa / Variant
                                </th>

                                <th className="col-sku">
                                    Mã SKU
                                </th>

                                <th className="col-unit">
                                    ĐVT
                                </th>

                                <th className="col-quantity">
                                    Số lượng
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {issue.items.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="text-center">
                                        {index + 1}
                                    </td>

                                    <td>
                                        <div className="inventory-issue-print-product">
                                            <strong>
                                                {item.productName}
                                            </strong>
                                        </div>
                                    </td>

                                    <td>
                                        {item.sku}
                                    </td>

                                    <td className="text-center">
                                        Cái
                                    </td>

                                    <td className="text-right">
                                        {item.quantity.toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            ))}

                            <tr className="inventory-issue-print-total-row">
                                <td colSpan={4}>
                                    <strong>TỔNG CỘNG</strong>
                                </td>

                                <td className="text-right">
                                    <strong>
                                        {totalQuantity.toLocaleString("vi-VN")}
                                    </strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* FOOTER */}

                <footer className="inventory-issue-print-footer">
                    <div className="inventory-issue-print-footer-date">
                        Hà Nội, ngày{" "}
                        {new Date(issue.createdAt).getDate()} tháng{" "}
                        {new Date(issue.createdAt).getMonth() + 1} năm{" "}
                        {new Date(issue.createdAt).getFullYear()}
                    </div>

                    <div className="inventory-issue-print-signatures">
                        <div>
                            <strong>Người lập phiếu</strong>
                            <span>(Ký, họ tên)</span>
                        </div>

                        <div>
                            <strong>Người giao hàng</strong>
                            <span>(Ký, họ tên)</span>
                        </div>

                        <div>
                            <strong>Thủ kho</strong>
                            <span>(Ký, họ tên)</span>
                        </div>
                    </div>
                </footer>

                {/* PRINT ACTION */}

                <div className="inventory-issue-print-actions">
                    <button
                        type="button"
                        className="inventory-issue-print-back-button"
                        onClick={onBack}
                    >
                        ← Quay lại
                    </button>

                    <button
                        type="button"
                        className="inventory-issue-print-button"
                        onClick={() => window.print()}
                    >
                        🖨 In phiếu
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminInventoryIssuePrint;