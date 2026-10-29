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
        ? "Äang hoáº¡t Ä‘á»™ng"
        : "Ngá»«ng hoáº¡t Ä‘á»™ng";
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
                    : "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u sáº£n pháº©m.",
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
                    : "KhÃ´ng thá»ƒ táº£i danh má»¥c sáº£n pháº©m.",
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
                "Vui lÃ²ng chá»n danh má»¥c.",
            );
            return;
        }

        if (!trimmedName) {
            setCreateError(
                "Vui lÃ²ng nháº­p tÃªn sáº£n pháº©m.",
            );
            return;
        }

        if (!trimmedSlug) {
            setCreateError(
                "Vui lÃ²ng nháº­p slug sáº£n pháº©m.",
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
                "Táº¡o sáº£n pháº©m thÃ nh cÃ´ng.",
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
                    : "KhÃ´ng thá»ƒ táº¡o sáº£n pháº©m.",
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
                        Sáº£n pháº©m
                    </h1>

                    <p className="products-page-description">
                        Quáº£n lÃ½ sáº£n pháº©m, danh má»¥c vÃ 
                        thÃ´ng tin catalog trong há»‡ thá»‘ng.
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

                    ThÃªm sáº£n pháº©m
                </button>
            </div>

            {/* SUMMARY */}
            <div className="products-summary-grid">
                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Tá»•ng sáº£n pháº©m
                    </div>

                    <div className="products-summary-value">
                        {summary.total}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Äang hoáº¡t Ä‘á»™ng
                    </div>

                    <div className="products-summary-value">
                        {summary.active}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Ngá»«ng hoáº¡t Ä‘á»™ng
                    </div>

                    <div className="products-summary-value">
                        {summary.inactive}
                    </div>
                </div>

                <div className="products-summary-card">
                    <div className="products-summary-label">
                        Danh má»¥c
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
                        <h2>Danh sÃ¡ch sáº£n pháº©m</h2>

                        <span className="products-count">
                            {totalProducts.toLocaleString("vi-VN")} sáº£n pháº©m
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
                                placeholder="TÃ¬m sáº£n pháº©m, slug hoáº·c danh má»¥c..."
                                aria-label="TÃ¬m kiáº¿m sáº£n pháº©m"
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
                            aria-label="Lá»c tráº¡ng thÃ¡i sáº£n pháº©m"
                        >
                            <option value="ALL">
                                Táº¥t cáº£ tráº¡ng thÃ¡i
                            </option>

                            <option value="ACTIVE">
                                Äang hoáº¡t Ä‘á»™ng
                            </option>

                            <option value="INACTIVE">
                                Ngá»«ng hoáº¡t Ä‘á»™ng
                            </option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="products-state">
                        <div className="products-loading-spinner" />

                        <p>
                            Äang táº£i danh sÃ¡ch sáº£n pháº©m...
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
                            KhÃ´ng thá»ƒ táº£i sáº£n pháº©m
                        </h3>

                        <p>{error}</p>

                        <button
                            type="button"
                            className="products-secondary-button"
                            onClick={() =>
                                void loadProducts()
                            }
                        >
                            Thá»­ láº¡i
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
                                ? "KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m"
                                : "ChÆ°a cÃ³ sáº£n pháº©m"}
                        </h3>

                        <p>
                            {search ||
                                statusFilter !== "ALL"
                                ? "HÃ£y thá»­ thay Ä‘á»•i tá»« khÃ³a hoáº·c bá»™ lá»c."
                                : "Báº¯t Ä‘áº§u báº±ng cÃ¡ch thÃªm sáº£n pháº©m Ä‘áº§u tiÃªn."}
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
                                    ThÃªm sáº£n pháº©m
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
                                            Sáº£n pháº©m
                                        </th>

                                        <th>Slug</th>

                                        <th>
                                            Danh má»¥c
                                        </th>

                                        <th>
                                            Tráº¡ng thÃ¡i
                                        </th>

                                        <th className="products-col-action">
                                            Thao tÃ¡c
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
                                                "KhÃ´ng xÃ¡c Ä‘á»‹nh";

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
                                                                title="Xem chi tiáº¿t sáº£n pháº©m"
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/admin/products/${product.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                Xem chi tiáº¿t
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
                                        Hiá»ƒn thá»‹{" "}
                                        <strong>
                                            {firstRecord}â€“{lastRecord}
                                        </strong>
                                        {" / "}
                                        <strong>
                                            {totalProducts.toLocaleString("vi-VN")}
                                        </strong>
                                        {" sáº£n pháº©m"}
                                    </span>

                                    <select
                                        className="products-page-size"
                                        value={pageSize}
                                        onChange={(event) =>
                                            handlePageSizeChange(
                                                Number(event.target.value) as PageSize,
                                            )
                                        }
                                        aria-label="Sá»‘ sáº£n pháº©m má»—i trang"
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
                                        aria-label="PhÃ¢n trang danh sÃ¡ch sáº£n pháº©m"
                                    >
                                        <button
                                            type="button"
                                            className="products-pagination-button"
                                            disabled={page <= 1}
                                            onClick={() =>
                                                setPage((current) => current - 1)
                                            }
                                            aria-label="Trang trÆ°á»›c"
                                        >
                                            â€¹
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
                                                        â€¦
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
                                            â€º
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
                                    ThÃªm sáº£n pháº©m
                                </h2>

                                <p>
                                    Nháº­p thÃ´ng tin cÆ¡ báº£n
                                    cho sáº£n pháº©m má»›i.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="products-modal-close"
                                onClick={
                                    closeCreateProduct
                                }
                                disabled={creating}
                                aria-label="ÄÃ³ng"
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
                                    Danh má»¥c
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
                                        Chá»n danh má»¥c
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
                                            ChÆ°a cÃ³ danh má»¥c Ä‘á»ƒ
                                            lá»±a chá»n.
                                        </span>
                                    )}
                            </div>

                            <div className="products-form-group">
                                <label htmlFor="create-product-name">
                                    TÃªn sáº£n pháº©m
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
                                    placeholder="VÃ­ dá»¥: Ão Denim Classic"
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
                                    Slug dÃ¹ng cho Ä‘á»‹nh danh
                                    URL cá»§a sáº£n pháº©m.
                                    KhÃ´ng tá»± Ä‘á»™ng thay
                                    Ä‘á»•i slug báº¡n nháº­p.
                                </span>
                            </div>

                            <div className="products-form-group">
                                <label htmlFor="create-product-description">
                                    MÃ´ táº£
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
                                    placeholder="MÃ´ táº£ ngáº¯n vá» sáº£n pháº©m..."
                                    rows={4}
                                    disabled={creating}
                                />

                                <span className="products-field-help">
                                    KhÃ´ng báº¯t buá»™c. CÃ³ thá»ƒ
                                    bá»• sung hoáº·c chá»‰nh sá»­a
                                    sau khi táº¡o sáº£n pháº©m.
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
                                Há»§y
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
                                    ? "Äang táº¡o..."
                                    : "Táº¡o sáº£n pháº©m"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default AdminProductsPage;
