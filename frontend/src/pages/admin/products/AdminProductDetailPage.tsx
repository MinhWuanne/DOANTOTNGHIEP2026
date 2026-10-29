import { getApiAssetUrl } from "../../../services/api/api-config";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    getAdminProductById,
    updateAdminProduct,
    getAdminProductImages,
    uploadAdminProductImage,
    setAdminProductPrimaryImage,
    deleteAdminProductImage,
    type AdminProduct,
    type AdminProductImage,
} from "../../../services/api/admin-product.api";

import {
    getAdminCategories,
    type AdminCategory,
} from "../../../services/api/admin-category.api";

import {
    createAdminProductVariant,
    getAdminProductVariants,
    updateAdminProductVariant,
    type AdminProductVariant,
} from "../../../services/api/admin-product-variant.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminProductDetailPage.css";

function formatMoney(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getProductStatusLabel(status: AdminProduct["status"]) {
    return status === "ACTIVE"
        ? "Đang hoạt động"
        : "Ngừng hoạt động";
}

function getVariantStatusLabel(status: AdminProductVariant["status"]) {
    return status === "ACTIVE"
        ? "Đang hoạt động"
        : "Ngừng hoạt động";
}

function AdminProductDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [product, setProduct] = useState<AdminProduct | null>(null);
    const [variants, setVariants] = useState<AdminProductVariant[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);

    // ========================================
    // PRODUCT IMAGES
    // ========================================

    const [images, setImages] = useState<AdminProductImage[]>([]);
    const [loadingImages] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageActionId, setImageActionId] = useState<string | null>(null);
    const [imageError, setImageError] = useState("");
    const [imageSuccess, setImageSuccess] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const productImageListRef = useRef<HTMLDivElement>(null);

    function scrollProductImages(direction: "left" | "right") {
        const container = productImageListRef.current;

        if (!container) {
            return;
        }

        const firstImage = container.querySelector<HTMLElement>(
            ".product-detail-image-item",
        );

        const scrollAmount = firstImage
            ? firstImage.offsetWidth + 16
            : container.clientWidth;

        container.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    }

    // ========================================
    // EDIT PRODUCT
    // ========================================

    const [showEditProduct, setShowEditProduct] = useState(false);

    const [editName, setEditName] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStatus, setEditStatus] =
        useState<AdminProduct["status"]>("ACTIVE");

    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    // ========================================
    // CREATE VARIANT
    // ========================================

    const [showCreateVariant, setShowCreateVariant] = useState(false);

    const [variantName, setVariantName] = useState("");
    const [variantSku, setVariantSku] = useState("");
    const [variantPrice, setVariantPrice] = useState("");
    const [variantCompareAtPrice, setVariantCompareAtPrice] =
        useState("");
    const [variantStatus, setVariantStatus] =
        useState<AdminProductVariant["status"]>("ACTIVE");

    const [creatingVariant, setCreatingVariant] = useState(false);
    const [variantCreateError, setVariantCreateError] = useState("");
    const [variantCreateSuccess, setVariantCreateSuccess] = useState("");

    // ========================================
    // EDIT VARIANT
    // ========================================

    const [showEditVariant, setShowEditVariant] = useState(false);

    const [editingVariantId, setEditingVariantId] =
        useState<string | null>(null);

    const [editVariantName, setEditVariantName] = useState("");
    const [editVariantSku, setEditVariantSku] = useState("");
    const [editVariantPrice, setEditVariantPrice] = useState("");
    const [editVariantCompareAtPrice, setEditVariantCompareAtPrice] =
        useState("");
    const [editVariantStatus, setEditVariantStatus] =
        useState<AdminProductVariant["status"]>("ACTIVE");

    const [updatingVariant, setUpdatingVariant] = useState(false);
    const [variantEditError, setVariantEditError] = useState("");
    const [variantEditSuccess, setVariantEditSuccess] = useState("");

    // ========================================
    // LOAD DATA
    // ========================================

    async function loadData() {
        if (!id) {
            setError("Không tìm thấy mã sản phẩm.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            const [
                productResult,
                variantsResult,
                categoriesResult,
                imagesResult,
            ] = await Promise.all([
                getAdminProductById(accessToken, id),
                getAdminProductVariants(accessToken, id),
                getAdminCategories(accessToken),
                getAdminProductImages(accessToken, id),
            ]);

            setProduct(productResult);
            setVariants(variantsResult);
            setCategories(categoriesResult.data);
            setImages(imagesResult);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải thông tin sản phẩm.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, [id]);

    // ========================================
    // PRODUCT IMAGES
    // ========================================

    async function refreshProductImages() {
        if (!id) {
            return;
        }

        const accessToken = getAccessToken("ADMIN");

        if (!accessToken) {
            throw new Error("ADMIN_TOKEN_REQUIRED");
        }

        const result = await getAdminProductImages(
            accessToken,
            id,
        );

        setImages(result);
    }

    async function handleUploadImage(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];

        // Cho phÃ©p chá»n láº¡i cÃ¹ng má»™t tá»‡p sau khi táº£i lÃªn.
        event.target.value = "";

        if (!file || !id) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setImageError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
            setImageSuccess("");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImageError("Dung lượng ảnh không được vượt quá 5 MB.");
            setImageSuccess("");
            return;
        }

        try {
            setUploadingImage(true);
            setImageError("");
            setImageSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            await uploadAdminProductImage(
                accessToken,
                id,
                file,
            );

            await refreshProductImages();

            setImageSuccess("Tải ảnh lên thành công.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải ảnh lên.",
            );
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleSetPrimaryImage(imageId: string) {
        if (!id) {
            return;
        }

        try {
            setImageActionId(imageId);
            setImageError("");
            setImageSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            await setAdminProductPrimaryImage(
                accessToken,
                id,
                imageId,
            );

            await refreshProductImages();

            setImageSuccess("Đã cập nhật ảnh chính.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "Không thể đặt ảnh chính.",
            );
        } finally {
            setImageActionId(null);
        }
    }

    async function handleDeleteImage(imageId: string) {
        if (!id) {
            return;
        }

        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn xóa ảnh này không?",
        );

        if (!confirmed) {
            return;
        }

        try {
            setImageActionId(imageId);
            setImageError("");
            setImageSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                throw new Error("ADMIN_TOKEN_REQUIRED");
            }

            await deleteAdminProductImage(
                accessToken,
                id,
                imageId,
            );

            await refreshProductImages();

            setImageSuccess("Đã xóa ảnh sản phẩm.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "Không thể xóa ảnh.",
            );
        } finally {
            setImageActionId(null);
        }
    }

    // ========================================
    // CATEGORY
    // ========================================

    const categoryName = useMemo(() => {
        if (!product) {
            return "Không xác định";
        }

        const category = categories.find(
            (item) => item.id === product.categoryId,
        );

        return category?.name ?? "Không xác định";
    }, [categories, product]);

    // ========================================
    // EDIT PRODUCT
    // ========================================

    function openEditProduct() {
        if (!product) {
            return;
        }

        setEditName(product.name);
        setEditSlug(product.slug);
        setEditDescription(product.description ?? "");
        setEditStatus(product.status);

        setEditError("");
        setEditSuccess("");

        setShowEditProduct(true);
    }

    function closeEditProduct() {
        if (editing) {
            return;
        }

        setShowEditProduct(false);
        setEditError("");
        setEditSuccess("");
    }

    async function handleUpdateProduct() {
        if (!id) {
            setEditError("Không tìm thấy mã sản phẩm.");
            return;
        }

        const trimmedName = editName.trim();
        const trimmedSlug = editSlug.trim();
        const trimmedDescription = editDescription.trim();

        if (!trimmedName) {
            setEditError("Vui lòng nhập tên sản phẩm.");
            return;
        }

        if (!trimmedSlug) {
            setEditError("Vui lòng nhập slug sản phẩm.");
            return;
        }

        try {
            setEditing(true);
            setEditError("");
            setEditSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                setEditError("ADMIN_TOKEN_REQUIRED");
                return;
            }

            await updateAdminProduct(accessToken, id, {
                name: trimmedName,
                slug: trimmedSlug,
                description: trimmedDescription,
                status: editStatus,
            });

            setEditSuccess("Cập nhật sản phẩm thành công.");

            await loadData();

            setTimeout(() => {
                setShowEditProduct(false);
                setEditSuccess("");
            }, 500);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật sản phẩm.",
            );
        } finally {
            setEditing(false);
        }
    }

    // ========================================
    // CREATE VARIANT
    // ========================================

    function openCreateVariant() {
        setVariantName("");
        setVariantSku("");
        setVariantPrice("");
        setVariantCompareAtPrice("");
        setVariantStatus("ACTIVE");

        setVariantCreateError("");
        setVariantCreateSuccess("");

        setShowCreateVariant(true);
    }

    function closeCreateVariant() {
        if (creatingVariant) {
            return;
        }

        setShowCreateVariant(false);
        setVariantCreateError("");
        setVariantCreateSuccess("");
    }

    async function handleCreateVariant() {
        if (!id) {
            setVariantCreateError("Không tìm thấy mã sản phẩm.");
            return;
        }

        const trimmedName = variantName.trim();
        const trimmedSku = variantSku.trim();
        const trimmedPrice = variantPrice.trim();
        const trimmedCompareAtPrice =
            variantCompareAtPrice.trim();

        if (!trimmedName) {
            setVariantCreateError("Vui lòng nhập tên mẫu mã.");
            return;
        }

        if (!trimmedSku) {
            setVariantCreateError("Vui lòng nhập SKU.");
            return;
        }

        if (!trimmedPrice) {
            setVariantCreateError("Vui lòng nhập giá sản phẩm.");
            return;
        }

        const price = Number(trimmedPrice);

        if (!Number.isFinite(price) || price <= 0) {
            setVariantCreateError(
                "Giá sản phẩm phải là số lớn hơn 0.",
            );
            return;
        }

        let compareAtPrice: number | undefined;

        if (trimmedCompareAtPrice) {
            compareAtPrice = Number(trimmedCompareAtPrice);

            if (
                !Number.isFinite(compareAtPrice) ||
                compareAtPrice < 0
            ) {
                setVariantCreateError(
                    "Giá so sánh phải là số lớn hơn hoặc bằng 0.",
                );
                return;
            }

            if (compareAtPrice < price) {
                setVariantCreateError(
                    "Giá so sánh phải lớn hơn hoặc bằng giá bán.",
                );
                return;
            }
        }

        try {
            setCreatingVariant(true);
            setVariantCreateError("");
            setVariantCreateSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                setVariantCreateError("ADMIN_TOKEN_REQUIRED");
                return;
            }

            await createAdminProductVariant(accessToken, {
                productId: id,
                name: trimmedName,
                sku: trimmedSku,
                price,
                ...(compareAtPrice !== undefined
                    ? { compareAtPrice }
                    : {}),
                status: variantStatus,
            });

            setVariantCreateSuccess(
                "Thêm mẫu mã thành công.",
            );

            await loadData();

            setTimeout(() => {
                setShowCreateVariant(false);
                setVariantCreateSuccess("");
            }, 500);
        } catch (err) {
            setVariantCreateError(
                err instanceof Error
                    ? err.message
                    : "Không thể thêm mẫu mã.",
            );
        } finally {
            setCreatingVariant(false);
        }
    }

    // ========================================
    // EDIT VARIANT
    // ========================================

    function openEditVariant(variant: AdminProductVariant) {
        setEditingVariantId(variant.id);

        setEditVariantName(variant.name ?? "");
        setEditVariantSku(variant.sku ?? "");
        setEditVariantPrice(String(variant.price ?? ""));

        setEditVariantCompareAtPrice(
            variant.compareAtPrice != null
                ? String(variant.compareAtPrice)
                : "",
        );

        setEditVariantStatus(variant.status);

        setVariantEditError("");
        setVariantEditSuccess("");
        setShowEditVariant(true);
    }

    function closeEditVariant() {
        if (updatingVariant) {
            return;
        }

        setShowEditVariant(false);
        setEditingVariantId(null);

        setVariantEditError("");
        setVariantEditSuccess("");
    }

    async function handleUpdateVariant() {
        if (!editingVariantId) {
            setVariantEditError("Không tìm thấy mã mẫu mã.");
            return;
        }

        // Chuáº©n hÃ³a dá»¯ liá»‡u Ä‘á»ƒ trÃ¡nh gá»i trim() trÃªn null/undefined.
        const trimmedName = String(editVariantName ?? "").trim();
        const trimmedSku = String(editVariantSku ?? "").trim();
        const trimmedPrice = String(editVariantPrice ?? "").trim();
        const trimmedCompareAtPrice = String(
            editVariantCompareAtPrice ?? "",
        ).trim();

        if (!trimmedName) {
            setVariantEditError("Vui lòng nhập tên mẫu mã.");
            return;
        }

        if (!trimmedSku) {
            setVariantEditError("Vui lòng nhập SKU.");
            return;
        }

        if (!trimmedPrice) {
            setVariantEditError("Vui lòng nhập giá sản phẩm.");
            return;
        }

        const price = Number(trimmedPrice);

        if (!Number.isFinite(price) || price <= 0) {
            setVariantEditError(
                "Giá sản phẩm phải là số lớn hơn 0.",
            );
            return;
        }

        let compareAtPrice: number | undefined;

        if (trimmedCompareAtPrice !== "") {
            compareAtPrice = Number(trimmedCompareAtPrice);

            if (
                !Number.isFinite(compareAtPrice) ||
                compareAtPrice < 0
            ) {
                setVariantEditError(
                    "Giá so sánh phải là số lớn hơn hoặc bằng 0.",
                );
                return;
            }

            if (compareAtPrice < price) {
                setVariantEditError(
                    "Giá so sánh phải lớn hơn hoặc bằng giá bán.",
                );
                return;
            }
        }

        try {
            setUpdatingVariant(true);
            setVariantEditError("");
            setVariantEditSuccess("");

            const accessToken = getAccessToken("ADMIN");

            if (!accessToken) {
                setVariantEditError("ADMIN_TOKEN_REQUIRED");
                return;
            }

            await updateAdminProductVariant(
                accessToken,
                editingVariantId,
                {
                    name: trimmedName,
                    sku: trimmedSku,
                    price,
                    ...(compareAtPrice !== undefined
                        ? { compareAtPrice }
                        : {}),
                    status: editVariantStatus,
                },
            );

            setVariantEditSuccess("Cập nhật mẫu mã thành công.");

            await loadData();

            setTimeout(() => {
                setShowEditVariant(false);
                setEditingVariantId(null);
                setVariantEditSuccess("");
            }, 500);
        } catch (err) {
            setVariantEditError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật mẫu mã.",
            );
        } finally {
            setUpdatingVariant(false);
        }
    }

    // ========================================
    // LOADING
    // ========================================

    if (loading) {
        return (
            <section className="admin-product-detail-page">
                <div className="product-detail-state">
                    <div className="product-detail-spinner" />

                    <p>Đang tải thông tin sản phẩm...</p>
                </div>
            </section>
        );
    }

    // ========================================
    // ERROR
    // ========================================

    if (error || !product) {
        return (
            <section className="admin-product-detail-page">
                <div className="product-detail-back-row">
                    <button
                        type="button"
                        className="product-detail-back-button"
                        onClick={() => navigate("/admin/products")}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="17"
                            height="17"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>

                        Quay lại danh sách
                    </button>
                </div>

                <div className="product-detail-state product-detail-state-error">
                    <div
                        className="product-detail-error-icon"
                        aria-hidden="true"
                    >
                        !
                    </div>

                    <h2>Không thể tải sản phẩm</h2>

                    <p>
                        {error ||
                            "Không tìm thấy thông tin sản phẩm."}
                    </p>

                    <button
                        type="button"
                        className="product-detail-secondary-button"
                        onClick={() => void loadData()}
                    >
                        Thử lại
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="admin-product-detail-page">
            <div className="product-detail-topbar">
                <button
                    type="button"
                    className="product-detail-back-button"
                    onClick={() => navigate("/admin/products")}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M19 12H5" />
                        <path d="m12 19-7-7 7-7" />
                    </svg>

                    Quay lại danh sách
                </button>
            </div>

            <div className="product-detail-header">
                <div>
                    <div className="product-detail-eyebrow">
                        PRODUCT DETAIL
                    </div>

                    <h1 className="product-detail-title">
                        {product.name}
                    </h1>

                    <p className="product-detail-description">
                        Chi tiết sản phẩm và các mẫu mã đang được
                        quản lý.
                    </p>
                </div>

                <div className="product-detail-header-actions">
                    <span
                        className={`product-detail-status ${product.status === "ACTIVE"
                            ? "product-detail-status-active"
                            : "product-detail-status-inactive"
                            }`}
                    >
                        <span className="product-detail-status-dot" />

                        {getProductStatusLabel(product.status)}
                    </span>

                    <button
                        type="button"
                        className="product-detail-secondary-button"
                        onClick={openEditProduct}
                    >
                        Chỉnh sửa
                    </button>
                </div>
            </div>

            <div className="product-detail-layout">
                <div className="product-detail-main">

                    {/* ========================================
                        PRODUCT IMAGES
                    ======================================== */}

                    <section className="product-detail-card">
                        <div className="product-detail-card-header product-detail-image-header">
                            <div>
                                <div className="product-detail-card-eyebrow">
                                    PRODUCT IMAGES
                                </div>

                                <h2>Hình ảnh sản phẩm</h2>

                                <p>
                                    {images.length} hình ảnh
                                </p>
                            </div>

                            <label
                                className={`product-detail-primary-button product-detail-image-upload-button ${uploadingImage ? "is-disabled" : ""
                                    }`}
                            >
                                <span aria-hidden="true">+</span>

                                {uploadingImage
                                    ? "Đang tải ảnh..."
                                    : "Tải ảnh lên"}

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        void handleUploadImage(event)
                                    }
                                    disabled={uploadingImage}
                                    hidden
                                />
                            </label>
                        </div>

                        <p className="product-detail-image-help">
                            Hỗ trợ JPEG, PNG, WebP. Dung lượng tối đa 5 MB mỗi ảnh.
                        </p>

                        {imageError && (
                            <div className="product-detail-form-message product-detail-form-error">
                                {imageError}
                            </div>
                        )}

                        {imageSuccess && (
                            <div className="product-detail-form-message product-detail-form-success">
                                {imageSuccess}
                            </div>
                        )}

                        {loadingImages ? (
                            <div className="product-detail-image-empty">
                                Đang tải danh sách ảnh...
                            </div>
                        ) : images.length === 0 ? (
                            <div className="product-detail-image-empty">
                                <div
                                    className="product-detail-empty-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="32"
                                        height="32"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect
                                            x="3"
                                            y="3"
                                            width="18"
                                            height="18"
                                            rx="2"
                                        />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="m21 15-5-5L5 21" />
                                    </svg>
                                </div>

                                <h3>Chưa có hình ảnh</h3>

                                <p>
                                    Tải ảnh lên để hiển thị hình ảnh sản phẩm.
                                </p>
                            </div>
                        ) : (
                            <div className="product-detail-image-carousel">
                                <button
                                    type="button"
                                    className="product-detail-image-nav"
                                    aria-label="Xem ảnh trước"
                                    onClick={() =>
                                        scrollProductImages("left")
                                    }
                                >
                                    &#8249;
                                </button>

                                <div
                                    className="product-detail-image-grid"
                                    ref={productImageListRef}
                                >
                                    {images.map((image) => (
                                        <article
                                            className={`product-detail-image-item ${image.isPrimary
                                                ? "is-primary"
                                                : ""
                                                }`}
                                            key={image.id}
                                        >
                                            <div className="product-detail-image-preview">
                                                <img
                                                    src={getApiAssetUrl(image.url)}
                                                    alt={`${product.name} - ảnh ${image.id}`}
                                                    loading="lazy"
                                                />

                                                {image.isPrimary && (
                                                    <span className="product-detail-image-primary-badge">
                                                        Ảnh chính
                                                    </span>
                                                )}
                                            </div>

                                            <div className="product-detail-image-actions">
                                                {!image.isPrimary && (
                                                    <button
                                                        type="button"
                                                        className="product-detail-image-action"
                                                        onClick={() =>
                                                            void handleSetPrimaryImage(
                                                                image.id,
                                                            )
                                                        }
                                                        disabled={
                                                            imageActionId !== null ||
                                                            uploadingImage
                                                        }
                                                    >
                                                        {imageActionId === image.id
                                                            ? "Đang xử lý..."
                                                            : "Đặt làm ảnh chính"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="product-detail-image-delete"
                                                    onClick={() =>
                                                        void handleDeleteImage(
                                                            image.id,
                                                        )
                                                    }
                                                    disabled={
                                                        imageActionId !== null ||
                                                        uploadingImage
                                                    }
                                                >
                                                    Xóa ảnh
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="product-detail-image-nav"
                                    aria-label="Xem ảnh tiếp theo"
                                    onClick={() =>
                                        scrollProductImages("right")
                                    }
                                >
                                    &#8250;
                                </button>
                            </div>
                        )}
                    </section>



                    {/* ========================================
                        PRODUCT INFORMATION
                    ======================================== */}

                    <section className="product-detail-card">
                        <div className="product-detail-card-header">
                            <div>
                                <div className="product-detail-card-eyebrow">
                                    INFORMATION
                                </div>

                                <h2>Thông tin sản phẩm</h2>
                            </div>
                        </div>

                        <div className="product-detail-info-grid">
                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Tên sản phẩm
                                </span>

                                <span className="product-detail-info-value">
                                    {product.name}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    ID sản phẩm
                                </span>

                                <span className="product-detail-info-value product-detail-monospace">
                                    #{product.id}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Slug
                                </span>

                                <span className="product-detail-info-value product-detail-monospace">
                                    {product.slug}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Danh mục
                                </span>

                                <span className="product-detail-info-value">
                                    {categoryName}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Ngày tạo
                                </span>

                                <span className="product-detail-info-value">
                                    {formatDate(product.createdAt)}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Cập nhật lần cuối
                                </span>

                                <span className="product-detail-info-value">
                                    {formatDate(product.updatedAt)}
                                </span>
                            </div>
                        </div>

                        <div className="product-detail-description-block">
                            <span className="product-detail-info-label">
                                Mô tả
                            </span>

                            {product.description ? (
                                <p>{product.description}</p>
                            ) : (
                                <p className="product-detail-description-empty">
                                    Chưa có mô tả cho sản phẩm này.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* ========================================
                        VARIANTS
                    ======================================== */}

                    <section className="product-detail-card">
                        <div className="product-detail-card-header product-detail-variant-header">
                            <div>
                                <div className="product-detail-card-eyebrow">
                                    VARIANTS
                                </div>

                                <h2>Mẫu mã sản phẩm</h2>

                                <p>{variants.length} mẫu mã</p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-primary-button"
                                onClick={openCreateVariant}
                            >
                                <span aria-hidden="true">+</span>

                                Thêm mẫu mã
                            </button>
                        </div>

                        {variants.length === 0 ? (
                            <div className="product-detail-empty-variants">
                                <div
                                    className="product-detail-empty-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="32"
                                        height="32"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M6 3h9l3 3v15H6z" />
                                        <path d="M15 3v4h4" />
                                        <path d="M9 12h6M9 16h6" />
                                    </svg>
                                </div>

                                <h3>Chưa có mẫu mã</h3>

                                <p>
                                    Sản phẩm này hiện chưa có mẫu mã
                                    nào.
                                </p>
                            </div>
                        ) : (
                            <div className="product-detail-variants-wrapper">
                                <table className="product-detail-variants-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Tên mẫu mã</th>
                                            <th>SKU</th>
                                            <th>Giá</th>
                                            <th>Giá so sánh</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {variants.map((variant) => (
                                            <tr key={variant.id}>
                                                <td className="product-detail-id">
                                                    #{variant.id}
                                                </td>

                                                <td>
                                                    <span className="product-detail-variant-name">
                                                        {variant.name}
                                                    </span>
                                                </td>

                                                <td>
                                                    <code className="product-detail-sku">
                                                        {variant.sku}
                                                    </code>
                                                </td>

                                                <td>
                                                    <span className="product-detail-price">
                                                        {formatMoney(
                                                            variant.price,
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    {variant.compareAtPrice !==
                                                        null ? (
                                                        <span className="product-detail-compare-price">
                                                            {formatMoney(
                                                                variant.compareAtPrice,
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="product-detail-no-value">
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`product-detail-variant-status ${variant.status ===
                                                            "ACTIVE"
                                                            ? "product-detail-variant-status-active"
                                                            : "product-detail-variant-status-inactive"
                                                            }`}
                                                    >
                                                        <span className="product-detail-status-dot" />

                                                        {getVariantStatusLabel(
                                                            variant.status,
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className="product-detail-row-button"
                                                        onClick={() =>
                                                            openEditVariant(
                                                                variant,
                                                            )
                                                        }
                                                    >
                                                        Sửa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {/* ========================================
                    SUMMARY
                ======================================== */}

                <aside className="product-detail-side">
                    <section className="product-detail-card product-detail-summary-card">
                        <div className="product-detail-card-eyebrow">
                            SUMMARY
                        </div>

                        <h2>Tổng quan</h2>

                        <div className="product-detail-summary-list">
                            <div>
                                <span>Sản phẩm</span>

                                <strong>{product.name}</strong>
                            </div>

                            <div>
                                <span>Danh mục</span>

                                <strong>{categoryName}</strong>
                            </div>

                            <div>
                                <span>Mẫu mã</span>

                                <strong>{variants.length}</strong>
                            </div>

                            <div>
                                <span>Trạng thái</span>

                                <strong>
                                    {getProductStatusLabel(
                                        product.status,
                                    )}
                                </strong>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            {/* ========================================
                EDIT PRODUCT MODAL
            ======================================== */}

            {showEditProduct && (
                <div
                    className="product-detail-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeEditProduct();
                        }
                    }}
                >
                    <div
                        className="product-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-product-title"
                    >
                        <div className="product-detail-modal-header">
                            <div>
                                <div className="product-detail-modal-eyebrow">
                                    PRODUCT
                                </div>

                                <h2 id="edit-product-title">
                                    Chỉnh sửa sản phẩm
                                </h2>

                                <p>
                                    Cập nhật thông tin cơ bản của sản
                                    phẩm.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeEditProduct}
                                disabled={editing}
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

                        <div className="product-detail-modal-body">
                            {editError && (
                                <div className="product-detail-form-message product-detail-form-error">
                                    {editError}
                                </div>
                            )}

                            {editSuccess && (
                                <div className="product-detail-form-message product-detail-form-success">
                                    {editSuccess}
                                </div>
                            )}

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-product-name">
                                    Tên sản phẩm
                                </label>

                                <input
                                    id="edit-product-name"
                                    className="product-detail-input"
                                    type="text"
                                    value={editName}
                                    onChange={(event) =>
                                        setEditName(event.target.value)
                                    }
                                    disabled={editing}
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-product-slug">
                                    Slug
                                </label>

                                <input
                                    id="edit-product-slug"
                                    className="product-detail-input"
                                    type="text"
                                    value={editSlug}
                                    onChange={(event) =>
                                        setEditSlug(event.target.value)
                                    }
                                    disabled={editing}
                                />

                                <span className="product-detail-field-help">
                                    Slug dùng cho định danh URL của
                                    sản phẩm.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-product-description">
                                    Mô tả
                                </label>

                                <textarea
                                    id="edit-product-description"
                                    className="product-detail-input product-detail-textarea"
                                    value={editDescription}
                                    onChange={(event) =>
                                        setEditDescription(
                                            event.target.value,
                                        )
                                    }
                                    rows={5}
                                    disabled={editing}
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-product-status">
                                    Trạng thái
                                </label>

                                <select
                                    id="edit-product-status"
                                    className="product-detail-input"
                                    value={editStatus}
                                    onChange={(event) =>
                                        setEditStatus(
                                            event.target
                                                .value as AdminProduct["status"],
                                        )
                                    }
                                    disabled={editing}
                                >
                                    <option value="ACTIVE">
                                        Đang hoạt động
                                    </option>

                                    <option value="INACTIVE">
                                        Ngừng hoạt động
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Danh mục
                                </span>

                                <strong>{categoryName}</strong>

                                <span>
                                    Danh mục không được thay đổi tại
                                    màn hình này.
                                </span>
                            </div>
                        </div>

                        <div className="product-detail-modal-footer">
                            <button
                                type="button"
                                className="product-detail-secondary-button"
                                onClick={closeEditProduct}
                                disabled={editing}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="product-detail-primary-button"
                                onClick={() =>
                                    void handleUpdateProduct()
                                }
                                disabled={editing}
                            >
                                {editing
                                    ? "Đang lưu..."
                                    : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================
                CREATE VARIANT MODAL
            ======================================== */}

            {showCreateVariant && (
                <div
                    className="product-detail-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCreateVariant();
                        }
                    }}
                >
                    <div
                        className="product-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-variant-title"
                    >
                        <div className="product-detail-modal-header">
                            <div>
                                <div className="product-detail-modal-eyebrow">
                                    VARIANT
                                </div>

                                <h2 id="create-variant-title">
                                    Thêm mẫu mã
                                </h2>

                                <p>
                                    Tạo một mẫu mã mới cho sản phẩm
                                    này.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeCreateVariant}
                                disabled={creatingVariant}
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

                        <div className="product-detail-modal-body">
                            {variantCreateError && (
                                <div className="product-detail-form-message product-detail-form-error">
                                    {variantCreateError}
                                </div>
                            )}

                            {variantCreateSuccess && (
                                <div className="product-detail-form-message product-detail-form-success">
                                    {variantCreateSuccess}
                                </div>
                            )}

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-name">
                                    Tên mẫu mã
                                </label>

                                <input
                                    id="create-variant-name"
                                    className="product-detail-input"
                                    type="text"
                                    value={variantName}
                                    onChange={(event) =>
                                        setVariantName(
                                            event.target.value,
                                        )
                                    }
                                    disabled={creatingVariant}
                                    placeholder="Ví dụ: Áo thun đen - M"
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-sku">
                                    SKU
                                </label>

                                <input
                                    id="create-variant-sku"
                                    className="product-detail-input"
                                    type="text"
                                    value={variantSku}
                                    onChange={(event) =>
                                        setVariantSku(
                                            event.target.value,
                                        )
                                    }
                                    disabled={creatingVariant}
                                    placeholder="Ví dụ: ATDEN-M"
                                />

                                <span className="product-detail-field-help">
                                    SKU là mã định danh riêng của mẫu
                                    mã.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-price">
                                    Giá bán
                                </label>

                                <input
                                    id="create-variant-price"
                                    className="product-detail-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={variantPrice}
                                    onChange={(event) =>
                                        setVariantPrice(
                                            event.target.value,
                                        )
                                    }
                                    disabled={creatingVariant}
                                    placeholder="Ví dụ: 299000"
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-compare-price">
                                    Giá so sánh
                                </label>

                                <input
                                    id="create-variant-compare-price"
                                    className="product-detail-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={variantCompareAtPrice}
                                    onChange={(event) =>
                                        setVariantCompareAtPrice(
                                            event.target.value,
                                        )
                                    }
                                    disabled={creatingVariant}
                                    placeholder="Không bắt buộc"
                                />

                                <span className="product-detail-field-help">
                                    Nếu nhập, giá so sánh phải lớn hơn
                                    hoặc bằng giá bán.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-status">
                                    Trạng thái
                                </label>

                                <select
                                    id="create-variant-status"
                                    className="product-detail-input"
                                    value={variantStatus}
                                    onChange={(event) =>
                                        setVariantStatus(
                                            event.target
                                                .value as AdminProductVariant["status"],
                                        )
                                    }
                                    disabled={creatingVariant}
                                >
                                    <option value="ACTIVE">
                                        Đang hoạt động
                                    </option>

                                    <option value="INACTIVE">
                                        Ngừng hoạt động
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Sản phẩm
                                </span>

                                <strong>{product.name}</strong>

                                <span>
                                    Mẫu mã sẽ được tạo trực tiếp cho
                                    sản phẩm này.
                                </span>
                            </div>
                        </div>

                        <div className="product-detail-modal-footer">
                            <button
                                type="button"
                                className="product-detail-secondary-button"
                                onClick={closeCreateVariant}
                                disabled={creatingVariant}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="product-detail-primary-button"
                                onClick={() =>
                                    void handleCreateVariant()
                                }
                                disabled={creatingVariant}
                            >
                                {creatingVariant
                                    ? "Đang tạo..."
                                    : "Tạo mẫu mã"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================
                EDIT VARIANT MODAL
            ======================================== */}

            {showEditVariant && (
                <div
                    className="product-detail-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeEditVariant();
                        }
                    }}
                >
                    <div
                        className="product-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-variant-title"
                    >
                        <div className="product-detail-modal-header">
                            <div>
                                <div className="product-detail-modal-eyebrow">
                                    VARIANT
                                </div>

                                <h2 id="edit-variant-title">
                                    Chỉnh sửa mẫu mã
                                </h2>

                                <p>
                                    Cập nhật thông tin của mẫu mã sản
                                    phẩm.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeEditVariant}
                                disabled={updatingVariant}
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

                        <div className="product-detail-modal-body">
                            {variantEditError && (
                                <div className="product-detail-form-message product-detail-form-error">
                                    {variantEditError}
                                </div>
                            )}

                            {variantEditSuccess && (
                                <div className="product-detail-form-message product-detail-form-success">
                                    {variantEditSuccess}
                                </div>
                            )}

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-name">
                                    Tên mẫu mã
                                </label>

                                <input
                                    id="edit-variant-name"
                                    className="product-detail-input"
                                    type="text"
                                    value={editVariantName}
                                    onChange={(event) =>
                                        setEditVariantName(
                                            event.target.value,
                                        )
                                    }
                                    disabled={updatingVariant}
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-sku">
                                    SKU
                                </label>

                                <input
                                    id="edit-variant-sku"
                                    className="product-detail-input"
                                    type="text"
                                    value={editVariantSku}
                                    onChange={(event) =>
                                        setEditVariantSku(
                                            event.target.value,
                                        )
                                    }
                                    disabled={updatingVariant}
                                />

                                <span className="product-detail-field-help">
                                    SKU là mã định danh riêng của mẫu
                                    mã.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-price">
                                    Giá bán
                                </label>

                                <input
                                    id="edit-variant-price"
                                    className="product-detail-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={editVariantPrice}
                                    onChange={(event) =>
                                        setEditVariantPrice(
                                            event.target.value,
                                        )
                                    }
                                    disabled={updatingVariant}
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-compare-price">
                                    Giá so sánh
                                </label>

                                <input
                                    id="edit-variant-compare-price"
                                    className="product-detail-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={editVariantCompareAtPrice}
                                    onChange={(event) =>
                                        setEditVariantCompareAtPrice(
                                            event.target.value,
                                        )
                                    }
                                    disabled={updatingVariant}
                                />

                                <span className="product-detail-field-help">
                                    Nếu nhập, giá so sánh phải lớn hơn
                                    hoặc bằng giá bán.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-status">
                                    Trạng thái
                                </label>

                                <select
                                    id="edit-variant-status"
                                    className="product-detail-input"
                                    value={editVariantStatus}
                                    onChange={(event) =>
                                        setEditVariantStatus(
                                            event.target
                                                .value as AdminProductVariant["status"],
                                        )
                                    }
                                    disabled={updatingVariant}
                                >
                                    <option value="ACTIVE">
                                        Đang hoạt động
                                    </option>

                                    <option value="INACTIVE">
                                        Ngừng hoạt động
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Sản phẩm
                                </span>

                                <strong>{product.name}</strong>

                                <span>
                                    Mẫu mã vẫn thuộc sản phẩm hiện tại
                                    và không thể chuyển sang sản phẩm
                                    khác.
                                </span>
                            </div>
                        </div>

                        <div className="product-detail-modal-footer">
                            <button
                                type="button"
                                className="product-detail-secondary-button"
                                onClick={closeEditVariant}
                                disabled={updatingVariant}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="product-detail-primary-button"
                                onClick={() =>
                                    void handleUpdateVariant()
                                }
                                disabled={updatingVariant}
                            >
                                {updatingVariant
                                    ? "Đang lưu..."
                                    : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default AdminProductDetailPage;
