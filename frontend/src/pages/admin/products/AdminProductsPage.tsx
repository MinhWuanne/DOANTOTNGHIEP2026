import { getApiAssetUrl } from "../../../services/api/api-config";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


import {
    createAdminProduct,
    getAdminProducts,
    getAdminProductImages,
    type AdminProduct,
    type AdminProductImage,
    type ProductStatus,
} from "../../../services/api/admin-product.api";

import {
    getAdminCategories,
    type AdminCategory,
} from "../../../services/api/admin-category.api";
import { getAccessToken } from "../../../utils/auth";

import "./AdminProductsPage.css";

type StatusFilter = "ALL" | ProductStatus;
type PageSize = 10 | 20 | 50;

type PaginationItem =
    | number
    | "ellipsis-start"
    | "ellipsis-end";

function getStatusLabel(status: ProductStatus) {
    return status === "ACTIVE"
        ? "Đang hoạt động"
        : "Ngừng hoạt động";
}

function getStatusClass(status: ProductStatus) {
    return status === "ACTIVE"
        ? "product-status product-status-active"
        : "product-status product-status-inactive";
}

function getPaginationItems(
    currentPage: number,
    totalPages: number,
): PaginationItem[] {
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

function AdminProductsPage() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);


    const [productCoverImages, setProductCoverImages] =
        useState<Record<string, string>>({});


    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("ALL");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] =
        useState<PageSize>(10);

    const [totalProducts, setTotalProducts] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [summary, setSummary] = useState({
        total: 0,
        active: 0,
        inactive: 0,
    });

    const [showCreateProduct, setShowCreateProduct] =
        useState(false);

    const [categoryId, setCategoryId] = useState("");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    async function loadProducts() {
        try {
            setLoading(true);
            setError("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            const result = await getAdminProducts(
                accessToken,
                {
                    page,
                    limit: pageSize,
                    search,
                    status: statusFilter,
                },
            );

            setProducts(result.data);
            setTotalProducts(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
            setSummary(result.summary);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải dữ liệu sản phẩm.",
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadCategories() {
        try {
            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            const result = await getAdminCategories(accessToken, {
                page: 1,
                limit: 10,
            });

            if (!Array.isArray(result.data)) {
                throw new Error("INVALID_CATEGORY_RESPONSE");
            }

            setCategories(result.data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải danh mục sản phẩm.",
            );
        }
    }

    useEffect(() => {
        void loadCategories();
    }, []);


    useEffect(() => {
        void loadProducts();
    }, [
        page,
        pageSize,
        search,
        statusFilter,
    ]);


    useEffect(() => {
        let cancelled = false;

        async function loadProductCoverImages() {
            const accessToken = getAccessToken("ADMIN");

            if (!accessToken || products.length === 0) {
                setProductCoverImages({});
                return;
            }

            const entries = await Promise.all(
                products.map(async (product) => {
                    try {
                        const images = await getAdminProductImages(
                            accessToken,
                            product.id,
                        );

                        const primaryImage = images.find(
                            (image: AdminProductImage) =>
                                image.isPrimary,
                        );

                        return [
                            product.id,
                            primaryImage?.url ?? "",
                        ] as const;
                    } catch {
                        return [product.id, ""] as const;
                    }
                }),
            );

            if (!cancelled) {
                setProductCoverImages(
                    Object.fromEntries(entries),
                );
            }
        }

        void loadProductCoverImages();

        return () => {
            cancelled = true;
        };
    }, [products]);


    useEffect(() => {
        const searchParams = new URLSearchParams(
            location.search,
        );

        if (searchParams.get("create") !== "true") {
            return;
        }

        openCreateProduct();

        navigate("/admin/products", {
            replace: true,
        });
    }, [location.search]);

    const categoryMap = useMemo(() => {
        const list = Array.isArray(categories) ? categories : [];

        return new Map(
            list.map((category) => [category.id, category.name]),
        );
    }, [categories]);

    const paginationItems = useMemo(() => {
        return getPaginationItems(
            page,
            totalPages,
        );
    }, [page, totalPages]);

    function openCreateProduct() {
        setCategoryId("");
        setName("");
        setSlug("");
        setDescription("");

        setCreateError("");
        setCreateSuccess("");

        setShowCreateProduct(true);
    }

    function closeCreateProduct() {
        if (creating) {
            return;
        }

        setShowCreateProduct(false);
        setCreateError("");
        setCreateSuccess("");
    }

    function handleSearchChange(
        value: string,
    ) {
        setSearch(value);
        setPage(1);
    }

    function handleStatusChange(
        value: StatusFilter,
    ) {
        setStatusFilter(value);
        setPage(1);
    }

    function handlePageSizeChange(
        value: PageSize,
    ) {
        setPageSize(value);
        setPage(1);
    }

    async function handleCreateProduct() {
        const trimmedName = name.trim();
        const trimmedSlug = slug.trim();
        const trimmedDescription =
            description.trim();

        if (!categoryId) {
            setCreateError(
                "Vui lòng chọn danh mục.",
            );
            return;
        }

        if (!trimmedName) {
            setCreateError(
                "Vui lòng nhập tên sản phẩm.",
            );
            return;
        }

        if (!trimmedSlug) {
            setCreateError(
                "Vui lòng nhập slug sản phẩm.",
            );
            return;
        }

        try {
            setCreating(true);
            setCreateError("");
            setCreateSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                setCreateError(
                    "ADMIN_TOKEN_REQUIRED",
                );
                return;
            }

            await createAdminProduct(
                accessToken,
                {
                    categoryId,
                    name: trimmedName,
                    slug: trimmedSlug,
                    description:
                        trimmedDescription ||
                        undefined,
                },
            );

            setCreateSuccess(
                "Tạo sản phẩm thành công.",
            );

            setPage(1);

            await loadCategories();

            setTimeout(() => {
                setShowCreateProduct(false);
                setCreateSuccess("");
            }, 500);
        } catch (err) {
            setCreateError(
                err instanceof Error
                    ? err.message
                    : "Không thể tạo sản phẩm.",
            );
        } finally {
            setCreating(false);
        }
    }

    const firstRecord =
        totalProducts === 0
            ? 0
            : (page - 1) * pageSize + 1;

    const lastRecord =
        totalProducts === 0
            ? 0
            : Math.min(
                page * pageSize,
                totalProducts,
            );

    return (
        <section className="admin-products-page">
            {/* PAGE HEADER */}
            <div className="products-page-header">
                <div>
                    <div className="products-page-eyebrow">
                        CATALOG
                    </div>

                    <h1 className="products-page-title">
                        Sản phẩm
                    </h1>

                    <p className="products-page-description">
                        Quản lý sản phẩm, danh mục và
                        thông tin catalog trong hệ thống.
                    </p>
                </div>

                <button
                    type="button"
                    className="products-primary-button"
                    onClick={openCreateProduct}
                >
                    <span
                        className="products-button-icon"
                        aria-hidden="true"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </span>

                    Thêm sản phẩm
                </button>
            </div>

            {/* SUMMARY */}
            <div className="products-summary-grid">
                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Tổng sản phẩm
                    </div>

                    <div className="products-summary-value">
                        {summary.total}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Đang hoạt động
                    </div>

                    <div className="products-summary-value">
                        {summary.active}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Ngừng hoạt động
                    </div>

                    <div className="products-summary-value">
                        {summary.inactive}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Danh mục
                    </div>

                    <div className="products-summary-value">
                        {categories.length}
                    </div>
                </div>
            </div>

            {/* PRODUCT LIST */}
            <div className="products-content-card">
                <div className="products-toolbar">
                    <div className="products-toolbar-heading">
                        <h2>Danh sách sản phẩm</h2>

                        <span className="products-count">
                            {totalProducts.toLocaleString("vi-VN")} sản phẩm
                        </span>
                    </div>


                    <div className="products-toolbar-controls">
                        <div className="products-search">
                            <span
                                className="products-search-icon"
                                aria-hidden="true"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="18"
                                    height="18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <circle
                                        cx="11"
                                        cy="11"
                                        r="7"
                                    />
                                    <path d="m20 20-4-4" />
                                </svg>
                            </span>

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(
                                        event.target.value,
                                    )
                                }
                                placeholder="Tìm sản phẩm, slug hoặc danh mục..."
                                aria-label="Tìm kiếm sản phẩm"
                            />
                        </div>

                        <select
                            className="products-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                handleStatusChange(
                                    event.target.value as StatusFilter,
                                )
                            }
                            aria-label="Lọc trạng thái sản phẩm"
                        >
                            <option value="ALL">
                                Tất cả trạng thái
                            </option>

                            <option value="ACTIVE">
                                Đang hoạt động
                            </option>

                            <option value="INACTIVE">
                                Ngừng hoạt động
                            </option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="products-state">
                        <div className="products-loading-spinner" />

                        <p>
                            Đang tải danh sách sản phẩm...
                        </p>
                    </div>
                ) : error ? (
                    <div className="products-state products-state-error">
                        <div
                            className="products-state-icon"
                            aria-hidden="true"
                        >
                            !
                        </div>

                        <h3>
                            Không thể tải sản phẩm
                        </h3>

                        <p>{error}</p>

                        <button
                            type="button"
                            className="products-secondary-button"
                            onClick={() =>
                                void loadProducts()
                            }
                        >
                            Thử lại
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="products-state">
                        <div
                            className="products-empty-icon"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="34"
                                height="34"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            >
                                <path d="M6 3h9l3 3v15H6z" />
                                <path d="M15 3v4h4" />
                                <path d="M9 12h6M9 16h6" />
                            </svg>
                        </div>

                        <h3>
                            {search ||
                                statusFilter !== "ALL"
                                ? "Không tìm thấy sản phẩm"
                                : "Chưa có sản phẩm"}
                        </h3>

                        <p>
                            {search ||
                                statusFilter !== "ALL"
                                ? "Hãy thử thay đổi từ khóa hoặc bộ lọc."
                                : "Bắt đầu bằng cách thêm sản phẩm đầu tiên."}
                        </p>

                        {!search &&
                            statusFilter ===
                            "ALL" && (
                                <button
                                    type="button"
                                    className="products-secondary-button"
                                    onClick={
                                        openCreateProduct
                                    }
                                >
                                    Thêm sản phẩm
                                </button>
                            )}
                    </div>
                ) : (
                    <>
                        <div className="products-table-wrapper">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th className="products-col-id">
                                            ID
                                        </th>

                                        <th>
                                            Sản phẩm
                                        </th>

                                        <th>Slug</th>

                                        <th>
                                            Danh mục
                                        </th>

                                        <th>
                                            Trạng thái
                                        </th>

                                        <th className="products-col-action">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {products.map(
                                        (product) => {
                                            const categoryName =
                                                categoryMap.get(
                                                    product.categoryId,
                                                ) ??
                                                product.category
                                                    ?.name ??
                                                "Không xác định";

                                            return (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td className="products-id-cell">
                                                        #
                                                        {
                                                            product.id
                                                        }
                                                    </td>

                                                    <td>
                                                        <div className="products-name-cell">

                                                            <div className="products-product-cover">
                                                                {productCoverImages[product.id] ? (
                                                                    <img
                                                                        src={getApiAssetUrl(productCoverImages[product.id])}
                                                                        alt={product.name}
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <svg
                                                                        viewBox="0 0 24 24"
                                                                        width="22"
                                                                        height="22"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="1.7"
                                                                    >
                                                                        <path d="M6 4h12l2 4-2 13H6L4 8z" />
                                                                        <path d="M9 4a3 3 0 0 0 6 0" />
                                                                    </svg>
                                                                )}
                                                            </div>


                                                            <div>
                                                                <div className="products-name">
                                                                    {
                                                                        product.name
                                                                    }
                                                                </div>

                                                                {product.description && (
                                                                    <div className="products-description">
                                                                        {
                                                                            product.description
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <code className="products-slug">
                                                            {
                                                                product.slug
                                                            }
                                                        </code>
                                                    </td>

                                                    <td>
                                                        <span className="products-category">
                                                            {
                                                                categoryName
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={getStatusClass(
                                                                product.status,
                                                            )}
                                                        >
                                                            <span className="products-status-dot" />

                                                            {getStatusLabel(
                                                                product.status,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="products-row-actions">
                                                            <button
                                                                type="button"
                                                                className="products-row-button"
                                                                title="Xem chi tiết sản phẩm"
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/admin/products/${product.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                Xem chi tiết
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        {products.length > 0 && (
                            <div className="admin-pagination">
                                {/* ThÃ´ng tin báº£n ghi vÃ  sá»‘ dÃ²ng má»—i trang */}
                                <div className="products-pagination-info">
                                    <span>
                                        Hiển thị{" "}
                                        <strong>
                                            {firstRecord}–{lastRecord}
                                        </strong>
                                        {" / "}
                                        <strong>
                                            {totalProducts.toLocaleString("vi-VN")}
                                        </strong>
                                        {" sản phẩm"}
                                    </span>

                                    <select
                                        className="products-page-size"
                                        value={pageSize}
                                        onChange={(event) =>
                                            handlePageSizeChange(
                                                Number(event.target.value) as PageSize,
                                            )
                                        }
                                        aria-label="Số sản phẩm mỗi trang"
                                    >
                                        <option value={10}>10 / trang</option>
                                        <option value={20}>20 / trang</option>
                                        <option value={50}>50 / trang</option>
                                    </select>
                                </div>

                                {/* CÃ¡c nÃºt chuyá»ƒn trang */}
                                {totalPages > 1 && (
                                    <div
                                        className="products-pagination"
                                        aria-label="Phân trang danh sách sản phẩm"
                                    >
                                        <button
                                            type="button"
                                            className="products-pagination-button"
                                            disabled={page <= 1}
                                            onClick={() =>
                                                setPage((current) => current - 1)
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
                                                        className="products-pagination-ellipsis"
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
                                                    className={`products-pagination-button ${item === page
                                                        ? "products-pagination-button-active"
                                                        : ""
                                                        }`}
                                                    onClick={() => setPage(item)}
                                                    aria-current={
                                                        item === page ? "page" : undefined
                                                    }
                                                    aria-label={`Trang ${item}`}
                                                >
                                                    {item}
                                                </button>
                                            );
                                        })}

                                        <button
                                            type="button"
                                            className="products-pagination-button"
                                            disabled={page >= totalPages}
                                            onClick={() =>
                                                setPage((current) => current + 1)
                                            }
                                            aria-label="Trang sau"
                                        >
                                            ›
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CREATE PRODUCT MODAL */}
            {showCreateProduct && (
                <div
                    className="products-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeCreateProduct();
                        }
                    }}
                >
                    <div
                        className="products-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-product-title"
                    >
                        <div className="products-modal-header">
                            <div>
                                <div className="products-modal-eyebrow">
                                    PRODUCT
                                </div>

                                <h2 id="create-product-title">
                                    Thêm sản phẩm
                                </h2>

                                <p>
                                    Nhập thông tin cơ bản
                                    cho sản phẩm mới.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="products-modal-close"
                                onClick={
                                    closeCreateProduct
                                }
                                disabled={creating}
                                aria-label="Đóng"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="20"
                                    height="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M6 6l12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </div>

                        <div className="products-modal-body">
                            {createError && (
                                <div className="products-form-message products-form-error">
                                    {createError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="products-form-message products-form-success">
                                    {createSuccess}
                                </div>
                            )}

                            <div className="products-form-group">
                                <label htmlFor="create-product-category">
                                    Danh mục
                                    <span className="products-required">
                                        *
                                    </span>
                                </label>

                                <select
                                    id="create-product-category"
                                    className="products-input"
                                    value={categoryId}
                                    onChange={(event) =>
                                        setCategoryId(
                                            event.target
                                                .value,
                                        )
                                    }
                                    disabled={creating}
                                >
                                    <option value="">
                                        Chọn danh mục
                                    </option>

                                    {categories.map(
                                        (category) => (
                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>

                                {categories.length ===
                                    0 && (
                                        <span className="products-field-help">
                                            Chưa có danh mục để
                                            lựa chọn.
                                        </span>
                                    )}
                            </div>

                            <div className="products-form-group">
                                <label htmlFor="create-product-name">
                                    Tên sản phẩm
                                    <span className="products-required">
                                        *
                                    </span>
                                </label>

                                <input
                                    id="create-product-name"
                                    className="products-input"
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Ví dụ: Áo Denim Classic"
                                    disabled={creating}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="products-form-group">
                                <label htmlFor="create-product-slug">
                                    Slug
                                    <span className="products-required">
                                        *
                                    </span>
                                </label>

                                <input
                                    id="create-product-slug"
                                    className="products-input"
                                    type="text"
                                    value={slug}
                                    onChange={(event) =>
                                        setSlug(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="ao-denim-classic"
                                    disabled={creating}
                                    autoComplete="off"
                                />

                                <span className="products-field-help">
                                    Slug dùng cho định danh
                                    URL của sản phẩm.
                                    Không tự động thay
                                    đổi slug bạn nhập.
                                </span>
                            </div>

                            <div className="products-form-group">
                                <label htmlFor="create-product-description">
                                    Mô tả
                                </label>

                                <textarea
                                    id="create-product-description"
                                    className="products-input products-textarea"
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Mô tả ngắn về sản phẩm..."
                                    rows={4}
                                    disabled={creating}
                                />

                                <span className="products-field-help">
                                    Không bắt buộc. Có thể
                                    bổ sung hoặc chỉnh sửa
                                    sau khi tạo sản phẩm.
                                </span>
                            </div>
                        </div>

                        <div className="products-modal-footer">
                            <button
                                type="button"
                                className="products-secondary-button"
                                onClick={
                                    closeCreateProduct
                                }
                                disabled={creating}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="products-primary-button"
                                onClick={() =>
                                    void handleCreateProduct()
                                }
                                disabled={creating}
                            >
                                {creating
                                    ? "Đang tạo..."
                                    : "Tạo sản phẩm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default AdminProductsPage;
