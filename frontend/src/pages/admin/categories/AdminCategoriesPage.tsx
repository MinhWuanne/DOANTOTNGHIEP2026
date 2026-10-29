import { useEffect, useState } from "react";

import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from "../../../services/api/admin-category.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminCategoriesPage.css";

type CategoryFormMode = "create" | "edit";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
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

function getCategoryErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Đã xảy ra lỗi. Vui lòng thử lại.";
  }

  switch (error.message) {
    case "CATEGORY_ALREADY_EXISTS":
      return "Tên hoặc slug danh mục đã tồn tại.";

    case "CATEGORY_NOT_FOUND":
      return "Không tìm thấy danh mục.";

    case "CATEGORY_HAS_PRODUCTS":
      return "Không thể xóa danh mục vì đang có sản phẩm sử dụng danh mục này.";

    case "INVALID_CATEGORY_NAME":
      return "Tên danh mục không hợp lệ.";

    case "INVALID_CATEGORY_SLUG":
      return "Slug danh mục không hợp lệ.";

    case "INVALID_CATEGORY_DESCRIPTION":
      return "Mô tả danh mục không hợp lệ.";

    case "NO_FIELDS_TO_UPDATE":
      return "Không có thông tin nào để cập nhật.";

    case "INVALID_PAGINATION":
      return "Thông tin phân trang không hợp lệ.";

    case "ADMIN_TOKEN_REQUIRED":
    case "AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập ADMIN không hợp lệ.";

    default:
      return error.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
}

function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Create / edit category
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [formMode, setFormMode] = useState<CategoryFormMode>("create");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Delete category
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] =
    useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const accessToken = getAccessToken("ADMIN");

  const paginationItems = getPaginationItems(page, totalPages);

  async function loadCategories(
    targetPage = page,
    targetPageSize = pageSize,
    targetSearch = searchQuery,
  ) {
    if (!accessToken) {
      setPageError("Phiên đăng nhập ADMIN không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPageError("");

      const result = await getAdminCategories(accessToken, {
        page: targetPage,
        limit: targetPageSize,
        search: targetSearch,
      });

      setCategories(result.data);
      setTotalCategories(result.pagination.total);
      setTotalPages(result.pagination.totalPages);

      const lastValidPage = Math.max(1, result.pagination.totalPages);

      if (targetPage > lastValidPage) {
        setPage(lastValidPage);
      }
    } catch (error) {
      setPageError(getCategoryErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories(page, pageSize, searchQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [page, pageSize, searchQuery]);

  function resetCategoryForm() {
    setCategoryName("");
    setCategorySlug("");
    setCategoryDescription("");
    setEditingCategoryId(null);
    setFormError("");
    setFormSuccess("");
  }

  function openCreateModal() {
    resetCategoryForm();
    setFormMode("create");
    setShowCategoryModal(true);
  }

  function openEditModal(category: AdminCategory) {
    setFormMode("edit");
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryDescription(category.description ?? "");

    setFormError("");
    setFormSuccess("");
    setShowCategoryModal(true);
  }

  function closeCategoryModal() {
    if (savingCategory) {
      return;
    }

    setShowCategoryModal(false);
    resetCategoryForm();
  }

  function validateCategoryForm() {
    const name = categoryName.trim();
    const slug = categorySlug.trim();

    if (!name) {
      return "Vui lòng nhập tên danh mục.";
    }

    if (!slug) {
      return "Vui lòng nhập slug danh mục.";
    }

    return "";
  }

  async function handleSubmitCategory(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationError = validateCategoryForm();

    if (validationError) {
      setFormError(validationError);
      setFormSuccess("");
      return;
    }

    if (!accessToken) {
      setFormError("Phiên đăng nhập ADMIN không hợp lệ.");
      return;
    }

    try {
      setSavingCategory(true);
      setFormError("");
      setFormSuccess("");

      const name = categoryName.trim();
      const slug = categorySlug.trim();
      const description = categoryDescription.trim();

      if (formMode === "create") {
        await createAdminCategory(accessToken, {
          name,
          slug,
          ...(description ? { description } : {}),
        });

        setFormSuccess("Thêm danh mục thành công.");
      } else {
        if (!editingCategoryId) {
          setFormError("Không xác định được danh mục cần cập nhật.");
          return;
        }

        await updateAdminCategory(accessToken, editingCategoryId, {
          name,
          slug,
          description,
        });

        setFormSuccess("Cập nhật danh mục thành công.");
      }

      setPage(1);
      await loadCategories(1, pageSize, searchQuery);

      window.setTimeout(() => {
        setShowCategoryModal(false);
        resetCategoryForm();
      }, 500);
    } catch (error) {
      setFormError(getCategoryErrorMessage(error));
    } finally {
      setSavingCategory(false);
    }
  }

  function openDeleteModal(category: AdminCategory) {
    setDeletingCategory(category);
    setDeleteError("");
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setShowDeleteModal(false);
    setDeletingCategory(null);
    setDeleteError("");
  }

  async function handleDeleteCategory() {
    if (!deletingCategory || !accessToken) {
      setDeleteError("Phiên đăng nhập ADMIN không hợp lệ.");
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteAdminCategory(accessToken, deletingCategory.id);

      setShowDeleteModal(false);
      setDeletingCategory(null);

      await loadCategories(page, pageSize, searchQuery);
    } catch (error) {
      setDeleteError(getCategoryErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const firstItem =
    totalCategories === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastItem = Math.min(page * pageSize, totalCategories);

  return (
    <section className="admin-categories-page">
      {/* PAGE HEADER */}
      <div className="categories-page-header">
        <div>
          <div className="categories-page-eyebrow">
            SẢN PHẨM / DANH MỤC
          </div>

          <h1 className="categories-page-title">Danh mục</h1>

          <p className="categories-page-description">
            Quản lý các danh mục sản phẩm trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="categories-primary-button"
          onClick={openCreateModal}
        >
          <span className="categories-button-icon">+</span>
          Thêm danh mục
        </button>
      </div>

      {/* SUMMARY */}
      <div className="categories-summary-grid">
        <div className="categories-summary-card">
          <div className="categories-summary-label">Tổng danh mục</div>

          <div className="categories-summary-value">
            {totalCategories.toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      {/* CATEGORY LIST */}
      <div className="categories-content-card">
        {/* TOOLBAR */}
        <div className="categories-toolbar">
          <div className="categories-toolbar-heading">
            <h2>Danh sách danh mục</h2>

            <span className="categories-count">
              {totalCategories.toLocaleString("vi-VN")} danh mục
            </span>
          </div>

          <div className="categories-toolbar-controls">
            <div className="categories-search">
              <span
                className="categories-search-icon"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="m16 16 4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên hoặc slug..."
                aria-label="Tìm kiếm danh mục"
              />
            </div>
          </div>
        </div>

        {/* ERROR */}
        {pageError && (
          <div className="categories-page-error" role="alert">
            <span>{pageError}</span>

            <button
              type="button"
              onClick={() =>
                void loadCategories(page, pageSize, searchQuery)
              }
            >
              Thử lại
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="categories-state">
            <div className="categories-loading-spinner" />
            <p>Đang tải danh sách danh mục...</p>
          </div>
        ) : categories.length > 0 ? (
          /* CATEGORY TABLE */
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th className="categories-col-id">ID</th>
                  <th>Danh mục</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th>Ngày tạo</th>
                  <th className="categories-col-action">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="categories-id-cell">{category.id}</td>

                    <td>
                      <div className="categories-name-cell">
                        <div className="categories-category-mark">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 14.5h6.5V21H4zM13.5 14.5H20V21h-6.5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <div className="categories-name">
                          {category.name}
                        </div>
                      </div>
                    </td>

                    <td>
                      <code className="categories-slug">
                        {category.slug}
                      </code>
                    </td>

                    <td>
                      <div
                        className={`categories-description ${
                          category.description ? "" : "is-empty"
                        }`}
                        title={category.description || undefined}
                      >
                        {category.description || "Chưa có mô tả"}
                      </div>
                    </td>

                    <td>
                      <span className="categories-date">
                        {formatDate(category.createdAt)}
                      </span>
                    </td>

                    <td className="categories-col-action">
                      <div className="categories-row-actions">
                        <button
                          type="button"
                          className="categories-row-button"
                          onClick={() => openEditModal(category)}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className="categories-row-button delete"
                          onClick={() => openDeleteModal(category)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="categories-state">
            <div className="categories-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 14.5h6.5V21H4zM13.5 14.5H20V21h-6.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>
              {searchQuery.trim()
                ? "Không tìm thấy danh mục"
                : "Chưa có danh mục"}
            </h3>

            <p>
              {searchQuery.trim()
                ? "Thử tìm kiếm bằng tên hoặc slug khác."
                : "Hãy tạo danh mục đầu tiên để tổ chức sản phẩm."}
            </p>

            {!searchQuery.trim() && (
              <button
                type="button"
                className="categories-empty-button"
                onClick={openCreateModal}
              >
                + Thêm danh mục
              </button>
            )}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalCategories > 0 && (
          <div className="categories-pagination">
            <div className="categories-pagination-info">
              <span>
                Hiển thị{" "}
                <strong>
                  {firstItem}–{lastItem}
                </strong>
                {" / "}
                <strong>
                  {totalCategories.toLocaleString("vi-VN")}
                </strong>
                {" danh mục"}
              </span>

              <select
                className="categories-page-size"
                value={pageSize}
                aria-label="Số danh mục mỗi trang"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div
                className="categories-pagination-actions"
                aria-label="Phân trang danh sách danh mục"
              >
                <button
                  type="button"
                  className="categories-pagination-button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
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
                        className="categories-pagination-ellipsis"
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
                      className={`categories-pagination-button ${
                        item === page
                          ? "categories-pagination-button-active"
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
                  className="categories-pagination-button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCategoryModal && (
        <div
          className="categories-modal-backdrop"
          onMouseDown={closeCategoryModal}
        >
          <div
            className="categories-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="categories-modal-header">
              <div>
                <div className="categories-modal-eyebrow">
                  {formMode === "create" ? "CREATE CATEGORY" : "EDIT CATEGORY"}
                </div>

                <h2>
                  {formMode === "create"
                    ? "Thêm danh mục"
                    : "Chỉnh sửa danh mục"}
                </h2>

                <p>
                  {formMode === "create"
                    ? "Tạo một danh mục mới cho sản phẩm."
                    : "Cập nhật thông tin danh mục."}
                </p>
              </div>

              <button
                type="button"
                className="categories-modal-close"
                onClick={closeCategoryModal}
                disabled={savingCategory}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitCategory}>
              <div className="categories-modal-body">
                {formError && (
                  <div className="categories-form-message categories-form-error">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="categories-form-message categories-form-success">
                    {formSuccess}
                  </div>
                )}

                <div className="categories-form-group">
                  <label htmlFor="category-name">
                    Tên danh mục
                    <span>*</span>
                  </label>

                  <input
                    id="category-name"
                    className="categories-input"
                    type="text"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="Ví dụ: Áo thun"
                    disabled={savingCategory}
                    autoFocus
                  />
                </div>

                <div className="categories-form-group">
                  <label htmlFor="category-slug">
                    Slug
                    <span>*</span>
                  </label>

                  <input
                    id="category-slug"
                    className="categories-input"
                    type="text"
                    value={categorySlug}
                    onChange={(event) => setCategorySlug(event.target.value)}
                    placeholder="Ví dụ: ao-thun"
                    disabled={savingCategory}
                  />

                  <small className="categories-field-help">
                    Slug dùng cho định danh danh mục trên hệ thống.
                  </small>
                </div>

                <div className="categories-form-group">
                  <label htmlFor="category-description">Mô tả</label>

                  <textarea
                    id="category-description"
                    className="categories-input categories-textarea"
                    value={categoryDescription}
                    onChange={(event) =>
                      setCategoryDescription(event.target.value)
                    }
                    placeholder="Nhập mô tả cho danh mục..."
                    rows={4}
                    disabled={savingCategory}
                  />
                </div>
              </div>

              <div className="categories-modal-footer">
                <button
                  type="button"
                  className="categories-secondary-button"
                  onClick={closeCategoryModal}
                  disabled={savingCategory}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="categories-primary-button"
                  disabled={savingCategory}
                >
                  {savingCategory
                    ? "Đang lưu..."
                    : formMode === "create"
                      ? "Tạo danh mục"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && deletingCategory && (
        <div
          className="categories-modal-backdrop"
          onMouseDown={closeDeleteModal}
        >
          <div
            className="categories-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="categories-delete-content">
              <div className="categories-delete-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 8v4m0 4h.01M5.5 20h13a1.5 1.5 0 0 0 1.3-2.25l-6.5-11.25a1.5 1.5 0 0 0-2.6 0L4.2 17.75A1.5 1.5 0 0 0 5.5 20Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2>Xóa danh mục?</h2>

              <p>
                Bạn có chắc muốn xóa danh mục{" "}
                <strong>{deletingCategory.name}</strong>?
              </p>

              <p className="categories-delete-note">
                Danh mục chỉ có thể xóa khi không có sản phẩm nào đang sử dụng.
              </p>
            </div>

            {deleteError && (
              <div className="categories-delete-error">{deleteError}</div>
            )}

            <div className="categories-modal-footer">
              <button
                type="button"
                className="categories-secondary-button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Hủy
              </button>

              <button
                type="button"
                className="categories-danger-button"
                onClick={() => void handleDeleteCategory()}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminCategoriesPage;