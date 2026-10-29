import type { AdminInventoryReceipt } from "../../../services/api/admin-inventory-receipt.api";

import "./AdminInventoryReceiptPrint.css";

interface AdminInventoryReceiptPrintProps {
  receipt: AdminInventoryReceipt;
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

function formatDateLong(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getVariantName(
  name: string | null,
  sku: string,
) {
  if (name?.trim()) {
    return name.trim();
  }

  return sku;
}

function AdminInventoryReceiptPrint({
  receipt,
  onBack,
}: AdminInventoryReceiptPrintProps) {
  const totalQuantity = receipt.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <div className="inventory-receipt-print">
      <div className="inventory-receipt-print-sheet">
        {/* HEADER */}

        <header className="inventory-receipt-print-header">
          <div className="inventory-receipt-print-company">
            <strong>ICON DENIM</strong>
            <span>Kho hàng</span>
          </div>

          <div className="inventory-receipt-print-title">
            <h1>PHIẾU NHẬP KHO</h1>

            <div className="inventory-receipt-print-meta">
              <div>
                <span>Số phiếu</span>
                <strong>{receipt.receiptNumber}</strong>
              </div>

              <div>
                <span>Ngày lập</span>
                <strong>{formatDate(receipt.createdAt)}</strong>
              </div>
            </div>
          </div>
        </header>

        {/* INFORMATION */}

        <section className="inventory-receipt-print-information">
          <div className="inventory-receipt-print-information-row">
            <span className="label">Đơn vị:</span>
            <strong>ICON DENIM</strong>
          </div>

          <div className="inventory-receipt-print-information-row">
            <span className="label">Bộ phận:</span>
            <strong>Kho hàng</strong>
          </div>

          <div className="inventory-receipt-print-information-row">
            <span className="label">Người lập phiếu:</span>
            <strong>{receipt.createdBy.username}</strong>
          </div>

          <div className="inventory-receipt-print-information-row">
            <span className="label">Ngày nhập:</span>
            <strong>{formatDateLong(receipt.createdAt)}</strong>
          </div>
        </section>

        {/* TABLE */}

        <section className="inventory-receipt-print-table-section">
          <table className="inventory-receipt-print-table">
            <thead>
              <tr>
                <th className="col-index">STT</th>
                <th className="col-product">
                  Tên hàng hóa / Variant
                </th>
                <th className="col-sku">Mã SKU</th>
                <th className="col-unit">ĐVT</th>
                <th className="col-quantity">Số lượng</th>
              </tr>
            </thead>

            <tbody>
              {receipt.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="text-center">
                    {index + 1}
                  </td>

                  <td>
                    <div className="inventory-receipt-print-product">
                      <strong>
                        {item.variant.product.name}
                      </strong>

                      {item.variant.name && (
                        <span>
                          {getVariantName(
                            item.variant.name,
                            item.variant.sku,
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>{item.variant.sku}</td>

                  <td className="text-center">
                    Cái
                  </td>

                  <td className="text-right">
                    {item.quantity.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}

              <tr className="inventory-receipt-print-total-row">
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

        {/* NOTE */}

        {receipt.note && (
          <section className="inventory-receipt-print-note">
            <strong>Ghi chú:</strong>
            <span>{receipt.note}</span>
          </section>
        )}

        {/* FOOTER */}

        <footer className="inventory-receipt-print-footer">
          <div className="inventory-receipt-print-footer-date">
            Hà Nội, ngày{" "}
            {new Date(receipt.createdAt).getDate()} tháng{" "}
            {new Date(receipt.createdAt).getMonth() + 1} năm{" "}
            {new Date(receipt.createdAt).getFullYear()}
          </div>

          <div className="inventory-receipt-print-signatures">
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

        <div className="inventory-receipt-print-actions">
          <button
            type="button"
            className="inventory-receipt-print-back-button"
            onClick={onBack}
          >
            ← Quay lại
          </button>

          <button
            type="button"
            className="inventory-receipt-print-button"
            onClick={() => window.print()}
          >
            🖨 In phiếu
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminInventoryReceiptPrint;