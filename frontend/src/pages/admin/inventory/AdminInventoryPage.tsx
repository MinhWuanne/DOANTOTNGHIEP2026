
import { useEffect, useMemo, useState } from "react";

import {
  getAdminProducts,
  type AdminProduct,
} from "../../../services/api/admin-product.api";

import {
  getAdminProductVariants,
  type AdminProductVariant,
} from "../../../services/api/admin-product-variant.api";

import {
  createAdminInventory,
  getAdminInventories,
  type AdminInventory,
} from "../../../services/api/admin-inventory.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminInventoryPage.css";

interface InventoryRow {
  variant: AdminProductVariant;
  product: AdminProduct | null;
  inventory: AdminInventory | null;
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type InventoryFilter = "ALL" | "CREATED" | "NOT_CREATED";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-end",
      totalPages,
    ];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      ...Array.from(
        { length: 5 },
        (_, index) => totalPages - 4 + index,
      ),
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    "ellipsis-end",
    totalPages,
  ];
}

function AdminInventoryPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [rows, setRows] = useState<InventoryRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter>("ALL");

  const [selectedRow, setSelectedRow] =
    useState<InventoryRow | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createQuantity, setCreateQuantity] = useState("0");
  const [creating, setCreating] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // Load Products + Variants + Inventories
  // =====================================================

  useEffect(() => {
    const accessToken = getAccessToken("ADMIN");

    if (accessToken === null) {
      setError("Không tìm thấy phiên đăng nhập.");
      setLoading(false);
      return;
    }

    const token: string = accessToken;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const [firstProductResult, inventoryList] =
          await Promise.all([
            getAdminProducts(token, {
              page: 1,
              limit: 10,
            }),
            getAdminInventories(token),
          ]);

        const firstPageProducts = firstProductResult.data;

        if (!Array.isArray(firstPageProducts)) {
          throw new Error("INVALID_ADMIN_PRODUCTS_RESPONSE");
        }

        // Tải tất cả các trang sản phẩm còn lại.
        const remainingPages = Array.from(
          {
            length: Math.max(
              0,
              firstProductResult.pagination.totalPages - 1,
            ),
          },
          (_, index) => index + 2,
        );

        const remainingResults = await Promise.all(
          remainingPages.map((productPage) =>
            getAdminProducts(token, {
              page: productPage,
              limit: 10,
            }),
          ),
        );

        const productList: AdminProduct[] = [
          ...firstPageProducts,
          ...remainingResults.flatMap(
            (result) => result.data,
          ),
        ];

        if (cancelled) {
          return;
        }

        // Lấy Variant của từng sản phẩm.
        const variantResults = await Promise.all(
          productList
            .filter(
              (
                product,
              ): product is AdminProduct & { id: string } =>
                product.id !== null,
            )
            .map(async (product) => {
              const variants = await getAdminProductVariants(
                token,
                product.id,
              );

              return {
                product,
                variants,
              };
            }),
        );

        if (cancelled) {
          return;
        }

        const inventoryMap = new Map<string, AdminInventory>();

        for (const inventory of inventoryList) {
          inventoryMap.set(inventory.variantId, inventory);
        }

        const nextRows: InventoryRow[] = [];

        for (const result of variantResults) {
          for (const variant of result.variants) {
            nextRows.push({
              variant,
              product: result.product,
              inventory: inventoryMap.get(variant.id) ?? null,
            });
          }
        }

        setProducts(productList);
        setRows(nextRows);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu tồn kho.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // Filtered rows
  // =====================================================

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        normalizedSearch === "" ||
        row.variant.name.toLowerCase().includes(normalizedSearch) ||
        row.variant.sku.toLowerCase().includes(normalizedSearch);

      const matchesProduct =
        productFilter === "" ||
        row.variant.productId === productFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        row.variant.status === statusFilter;

      const matchesInventory =
        inventoryFilter === "ALL" ||
        (inventoryFilter === "CREATED" &&
          row.inventory !== null) ||
        (inventoryFilter === "NOT_CREATED" &&
          row.inventory === null);

      return (
        matchesSearch &&
        matchesProduct &&
        matchesStatus &&
        matchesInventory
      );
    });
  }, [
    rows,
    search,
    productFilter,
    statusFilter,
    inventoryFilter,
  ]);

  // =====================================================
  // Pagination
  // =====================================================

  const totalFilteredRows = filteredRows.length;

  const totalPages = Math.ceil(
    totalFilteredRows / pageSize,
  );

  const firstRecord =
    totalFilteredRows === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const lastRecord = Math.min(
    page * pageSize,
    totalFilteredRows,
  );

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return filteredRows.slice(
      startIndex,
      startIndex + pageSize,
    );
  }, [filteredRows, page, pageSize]);

  const paginationItems = useMemo(
    () => getPaginationItems(page, totalPages),
    [page, totalPages],
  );

  // Khi thay đổi bộ lọc, quay về trang đầu tiên.
  useEffect(() => {
    setPage(1);
  }, [
    search,
    productFilter,
    statusFilter,
    inventoryFilter,
  ]);

  // Tránh giữ trang không hợp lệ khi số kết quả giảm.
  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPage(1);
    } else if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // =====================================================
  // Statistics
  // Thống kê trên toàn bộ rows, không phụ thuộc trang/lọc.
  // =====================================================

  const statistics = useMemo(() => {
    const totalVariant = rows.length;

    const hasInventory = rows.filter(
      (row) => row.inventory !== null,
    ).length;

    const inStock = rows.filter(
      (row) =>
        row.inventory !== null &&
        row.inventory.availableQty > 0,
    ).length;

    const outOfStock = rows.filter(
      (row) =>
        row.inventory !== null &&
        row.inventory.availableQty <= 0,
    ).length;

    return {
      totalVariant,
      hasInventory,
      inStock,
      outOfStock,
    };
  }, [rows]);

  // =====================================================
  // Drawer
  // =====================================================

  function openDrawer(row: InventoryRow) {
    setSelectedRow(row);

    setCreateQuantity(
      row.inventory
        ? String(row.inventory.quantity)
        : "0",
    );

    setError("");
    setSuccess("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (creating) {
      return;
    }

    setDrawerOpen(false);
    setSelectedRow(null);
    setCreateQuantity("0");
  }

  // =====================================================
  // Create Inventory
  // =====================================================

  async function handleCreateInventory() {
    if (!selectedRow || selectedRow.inventory) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (accessToken === null) {
      setError("Không tìm thấy phiên đăng nhập.");
      return;
    }

    const token: string = accessToken;
    const quantity = Number(createQuantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError(
        "Số lượng phải là số nguyên lớn hơn hoặc bằng 0.",
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const inventory = await createAdminInventory(token, {
        variantId: selectedRow.variant.id,
        quantity,
      });

      setRows((current) =>
        current.map((row) =>
          row.variant.id === selectedRow.variant.id
            ? {
              ...row,
              inventory,
            }
            : row,
        ),
      );

      setSelectedRow((current) =>
        current
          ? {
            ...current,
            inventory,
          }
          : current,
      );

      setCreateQuantity(String(inventory.quantity));

      setSuccess(
        `Đã khởi tạo tồn kho cho Variant ${selectedRow.variant.sku}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể khởi tạo tồn kho.",
      );
    } finally {
      setCreating(false);
    }
  }

  // =====================================================
  // Clear filters
  // =====================================================

  function clearFilters() {
    setSearch("");
    setProductFilter("");
    setStatusFilter("ALL");
    setInventoryFilter("ALL");
    setPage(1);
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    productFilter !== "" ||
    statusFilter !== "ALL" ||
    inventoryFilter !== "ALL";

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="admin-page">
      {/* Header */}

      <div className="admin-page-header">
        <div>
          <h1>Quản lý tồn kho</h1>

          <p>
            Theo dõi số lượng tồn kho, hàng đang giữ
            và hàng có thể bán của các Variant.
          </p>
        </div>
      </div>

      {/* Alerts */}

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          {success}
        </div>
      )}

      {/* Statistics */}

      <section className="admin-inventory-stats">
        <div className="admin-inventory-stat-card">
          <span className="admin-inventory-stat-label">
            Tổng Variant
          </span>

          <strong className="admin-inventory-stat-value">
            {statistics.totalVariant}
          </strong>

          <span className="admin-inventory-stat-description">
            Tổng số Variant sản phẩm
          </span>
        </div>

        <div className="admin-inventory-stat-card">
          <span className="admin-inventory-stat-label">
            Đã có Inventory
          </span>

          <strong className="admin-inventory-stat-value">
            {statistics.hasInventory}
          </strong>

          <span className="admin-inventory-stat-description">
            Variant đã được khởi tạo tồn kho
          </span>
        </div>

        <div className="admin-inventory-stat-card">
          <span className="admin-inventory-stat-label">
            Còn hàng
          </span>

          <strong className="admin-inventory-stat-value">
            {statistics.inStock}
          </strong>

          <span className="admin-inventory-stat-description">
            Available lớn hơn 0
          </span>
        </div>

        <div className="admin-inventory-stat-card">
          <span className="admin-inventory-stat-label">
            Hết hàng
          </span>

          <strong className="admin-inventory-stat-value">
            {statistics.outOfStock}
          </strong>

          <span className="admin-inventory-stat-description">
            Available bằng 0
          </span>
        </div>
      </section>

      {/* Toolbar */}

      <section className="admin-card admin-inventory-toolbar">
        <div className="admin-inventory-search">
          <input
            type="search"
            className="admin-input"
            placeholder="Tìm Variant hoặc SKU..."
            aria-label="Tìm Variant hoặc SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="admin-inventory-filter">
          <select
            className="admin-select"
            aria-label="Lọc theo sản phẩm"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
          >
            <option value="">Tất cả sản phẩm</option>

            {products
              .filter(
                (product) => product.id !== null,
              )
              .map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
          </select>
        </div>

        <div className="admin-inventory-filter">
          <select
            className="admin-select"
            aria-label="Lọc theo trạng thái Variant"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div className="admin-inventory-filter">
          <select
            className="admin-select"
            aria-label="Lọc theo tình trạng tồn kho"
            value={inventoryFilter}
            onChange={(event) =>
              setInventoryFilter(
                event.target.value as InventoryFilter,
              )
            }
          >
            <option value="ALL">Tất cả tồn kho</option>
            <option value="CREATED">Đã khởi tạo</option>
            <option value="NOT_CREATED">Chưa khởi tạo</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={clearFilters}
          >
            Xóa bộ lọc
          </button>
        )}
      </section>

      {/* Inventory Table */}

      <section className="admin-card">
        <div className="admin-inventory-table-header">
          <div>
            <h2>Danh sách tồn kho</h2>

            <p className="admin-muted">
              {loading
                ? "Đang tải dữ liệu..."
                : `${totalFilteredRows.toLocaleString("vi-VN")} Variant`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-inventory-empty">
            <p className="admin-muted">
              Đang tải dữ liệu tồn kho...
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-inventory-empty">
            <p className="admin-muted">
              Chưa có Variant nào.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="admin-inventory-empty">
            <p className="admin-muted">
              Không tìm thấy Variant phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table admin-inventory-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
                  <th>Total</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((row) => {
                  const inventory = row.inventory;

                  return (
                    <tr key={row.variant.id}>
                      <td>
                        <div className="admin-inventory-variant">
                          <strong>{row.variant.name}</strong>

                          <span className="admin-muted">
                            #{row.variant.id}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="admin-inventory-sku">
                          {row.variant.sku}
                        </span>
                      </td>

                      <td>{row.product?.name ?? "—"}</td>

                      <td>
                        <span
                          className={`admin-badge ${row.variant.status === "ACTIVE"
                            ? "admin-badge-active"
                            : "admin-badge-inactive"
                            }`}
                        >
                          {row.variant.status}
                        </span>
                      </td>

                      <td>
                        {inventory ? inventory.quantity : "—"}
                      </td>

                      <td>
                        {inventory ? inventory.reservedQty : "—"}
                      </td>

                      <td>
                        {inventory ? (
                          <strong>{inventory.availableQty}</strong>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => openDrawer(row)}
                        >
                          {inventory ? "Xem chi tiết" : "Khởi tạo"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}



        {/* Pagination */}

        {!loading && totalFilteredRows > 0 && (
          <div className="admin-inventory-pagination">
            {/* Thông tin số bản ghi */}
            <div className="admin-inventory-pagination-info">
              <span>
                Hiển thị{" "}
                <strong>
                  {firstRecord}–{lastRecord}
                </strong>
                {" / "}
                <strong>
                  {totalFilteredRows.toLocaleString("vi-VN")}
                </strong>
                {" Variant"}
              </span>
            </div>

            {/* Chọn số bản ghi mỗi trang */}
            <select
              className="admin-select admin-inventory-page-size"
              aria-label="Số Variant mỗi trang"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            {/* Điều hướng trang */}
            <div
              className="admin-inventory-pagination-actions"
              aria-label="Phân trang danh sách tồn kho"
            >
              <button
                type="button"
                className="admin-inventory-pagination-button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                aria-label="Trang trước"
              >
                ‹
              </button>

              {paginationItems.map((item, index) => {
                if (
                  item === "ellipsis-start" ||
                  item === "ellipsis-end"
                ) {
                  return (
                    <span
                      key={`${item}-${index}`}
                      className="admin-inventory-pagination-ellipsis"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  );
                }

                return (
                  <button
                    key={item}
                    type="button"
                    className={`admin-inventory-pagination-button ${item === page
                      ? "admin-inventory-pagination-button-active"
                      : ""
                      }`}
                    onClick={() => setPage(item)}
                    aria-current={item === page ? "page" : undefined}
                    aria-label={`Trang ${item}`}
                  >
                    {item}
                  </button>
                );
              })}

              <button
                type="button"
                className="admin-inventory-pagination-button"
                disabled={page >= totalPages}
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
          </div>
        )}
      </section>

      {/* Inventory Drawer */}

      {drawerOpen && selectedRow && (
        <div
          className="admin-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDrawer();
            }
          }}
        >
          <aside
            className="admin-drawer"
            aria-label="Chi tiết tồn kho"
          >
            <div className="admin-drawer-header">
              <div>
                <h2>
                  {selectedRow.inventory
                    ? "Chi tiết tồn kho"
                    : "Khởi tạo tồn kho"}
                </h2>

                <p>{selectedRow.variant.name}</p>
              </div>

              <button
                type="button"
                className="admin-drawer-close"
                onClick={closeDrawer}
                disabled={creating}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="admin-drawer-body">
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Variant</label>

                  <div className="admin-readonly-field">
                    {selectedRow.variant.name}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>SKU</label>

                  <div className="admin-readonly-field">
                    {selectedRow.variant.sku}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Sản phẩm</label>

                  <div className="admin-readonly-field">
                    {selectedRow.product?.name ?? "—"}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Trạng thái Variant</label>

                  <div className="admin-readonly-field">
                    <span
                      className={`admin-badge ${selectedRow.variant.status === "ACTIVE"
                        ? "admin-badge-active"
                        : "admin-badge-inactive"
                        }`}
                    >
                      {selectedRow.variant.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRow.inventory ? (
                <>
                  <div className="admin-inventory-drawer-summary">
                    <div>
                      <span>Total</span>
                      <strong>
                        {selectedRow.inventory.quantity}
                      </strong>
                    </div>

                    <div>
                      <span>Reserved</span>
                      <strong>
                        {selectedRow.inventory.reservedQty}
                      </strong>
                    </div>

                    <div>
                      <span>Available</span>
                      <strong>
                        {selectedRow.inventory.availableQty}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <div className="admin-form-group">
                      <label>Inventory ID</label>

                      <div className="admin-readonly-field">
                        {selectedRow.inventory.id}
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label>Cập nhật lần cuối</label>

                      <div className="admin-readonly-field">
                        {new Date(
                          selectedRow.inventory.updatedAt,
                        ).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-inventory-create-panel">
                  <div>
                    <h3>Chưa khởi tạo Inventory</h3>

                    <p className="admin-muted">
                      Variant này chưa có bản ghi Inventory.
                      Nhập số lượng tồn kho ban đầu để khởi tạo.
                    </p>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="inventory-create-quantity">
                      Số lượng ban đầu
                    </label>

                    <input
                      id="inventory-create-quantity"
                      className="admin-input"
                      type="number"
                      min="0"
                      step="1"
                      value={createQuantity}
                      onChange={(event) =>
                        setCreateQuantity(event.target.value)
                      }
                      disabled={creating}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="admin-alert admin-alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="admin-alert admin-alert-success">
                  {success}
                </div>
              )}
            </div>

            <div className="admin-drawer-footer">
              {selectedRow.inventory ? (
                <button
                  type="button"
                  className="admin-button admin-button-secondary admin-inventory-footer-secondary"
                  onClick={closeDrawer}
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary admin-inventory-footer-secondary"
                    onClick={closeDrawer}
                    disabled={creating}
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => void handleCreateInventory()}
                    disabled={creating}
                  >
                    {creating
                      ? "Đang khởi tạo..."
                      : "Khởi tạo Inventory"}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminInventoryPage;