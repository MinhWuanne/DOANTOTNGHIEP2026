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
        ? "Äang hoáº¡t Ä‘á»™ng"
        : "Ngá»«ng hoáº¡t Ä‘á»™ng";
}

function getVariantStatusLabel(status: AdminProductVariant["status"]) {
    return status === "ACTIVE"
        ? "Äang hoáº¡t Ä‘á»™ng"
        : "Ngá»«ng hoáº¡t Ä‘á»™ng";
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
            setError("KhÃ´ng tÃ¬m tháº¥y mÃ£ sáº£n pháº©m.");
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
                    : "KhÃ´ng thá»ƒ táº£i thÃ´ng tin sáº£n pháº©m.",
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
            setImageError("Chá»‰ cháº¥p nháº­n áº£nh JPEG, PNG hoáº·c WebP.");
            setImageSuccess("");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImageError("Dung lÆ°á»£ng áº£nh khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 5 MB.");
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

            setImageSuccess("Táº£i áº£nh lÃªn thÃ nh cÃ´ng.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "KhÃ´ng thá»ƒ táº£i áº£nh lÃªn.",
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

            setImageSuccess("ÄÃ£ cáº­p nháº­t áº£nh chÃ­nh.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "KhÃ´ng thá»ƒ Ä‘áº·t áº£nh chÃ­nh.",
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
            "Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a áº£nh nÃ y khÃ´ng?",
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

            setImageSuccess("ÄÃ£ xÃ³a áº£nh sáº£n pháº©m.");
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : "KhÃ´ng thá»ƒ xÃ³a áº£nh.",
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
            return "KhÃ´ng xÃ¡c Ä‘á»‹nh";
        }

        const category = categories.find(
            (item) => item.id === product.categoryId,
        );

        return category?.name ?? "KhÃ´ng xÃ¡c Ä‘á»‹nh";
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
            setEditError("KhÃ´ng tÃ¬m tháº¥y mÃ£ sáº£n pháº©m.");
            return;
        }

        const trimmedName = editName.trim();
        const trimmedSlug = editSlug.trim();
        const trimmedDescription = editDescription.trim();

        if (!trimmedName) {
            setEditError("Vui lÃ²ng nháº­p tÃªn sáº£n pháº©m.");
            return;
        }

        if (!trimmedSlug) {
            setEditError("Vui lÃ²ng nháº­p slug sáº£n pháº©m.");
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

            setEditSuccess("Cáº­p nháº­t sáº£n pháº©m thÃ nh cÃ´ng.");

            await loadData();

            setTimeout(() => {
                setShowEditProduct(false);
                setEditSuccess("");
            }, 500);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : "KhÃ´ng thá»ƒ cáº­p nháº­t sáº£n pháº©m.",
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
            setVariantCreateError("KhÃ´ng tÃ¬m tháº¥y mÃ£ sáº£n pháº©m.");
            return;
        }

        const trimmedName = variantName.trim();
        const trimmedSku = variantSku.trim();
        const trimmedPrice = variantPrice.trim();
        const trimmedCompareAtPrice =
            variantCompareAtPrice.trim();

        if (!trimmedName) {
            setVariantCreateError("Vui lÃ²ng nháº­p tÃªn máº«u mÃ£.");
            return;
        }

        if (!trimmedSku) {
            setVariantCreateError("Vui lÃ²ng nháº­p SKU.");
            return;
        }

        if (!trimmedPrice) {
            setVariantCreateError("Vui lÃ²ng nháº­p giÃ¡ sáº£n pháº©m.");
            return;
        }

        const price = Number(trimmedPrice);

        if (!Number.isFinite(price) || price <= 0) {
            setVariantCreateError(
                "GiÃ¡ sáº£n pháº©m pháº£i lÃ  sá»‘ lá»›n hÆ¡n 0.",
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
                    "GiÃ¡ so sÃ¡nh pháº£i lÃ  sá»‘ lá»›n hÆ¡n hoáº·c báº±ng 0.",
                );
                return;
            }

            if (compareAtPrice < price) {
                setVariantCreateError(
                    "GiÃ¡ so sÃ¡nh pháº£i lá»›n hÆ¡n hoáº·c báº±ng giÃ¡ bÃ¡n.",
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
                "ThÃªm máº«u mÃ£ thÃ nh cÃ´ng.",
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
                    : "KhÃ´ng thá»ƒ thÃªm máº«u mÃ£.",
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
            setVariantEditError("KhÃ´ng tÃ¬m tháº¥y mÃ£ máº«u mÃ£.");
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
            setVariantEditError("Vui lÃ²ng nháº­p tÃªn máº«u mÃ£.");
            return;
        }

        if (!trimmedSku) {
            setVariantEditError("Vui lÃ²ng nháº­p SKU.");
            return;
        }

        if (!trimmedPrice) {
            setVariantEditError("Vui lÃ²ng nháº­p giÃ¡ sáº£n pháº©m.");
            return;
        }

        const price = Number(trimmedPrice);

        if (!Number.isFinite(price) || price <= 0) {
            setVariantEditError(
                "GiÃ¡ sáº£n pháº©m pháº£i lÃ  sá»‘ lá»›n hÆ¡n 0.",
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
                    "GiÃ¡ so sÃ¡nh pháº£i lÃ  sá»‘ lá»›n hÆ¡n hoáº·c báº±ng 0.",
                );
                return;
            }

            if (compareAtPrice < price) {
                setVariantEditError(
                    "GiÃ¡ so sÃ¡nh pháº£i lá»›n hÆ¡n hoáº·c báº±ng giÃ¡ bÃ¡n.",
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

            setVariantEditSuccess("Cáº­p nháº­t máº«u mÃ£ thÃ nh cÃ´ng.");

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
                    : "KhÃ´ng thá»ƒ cáº­p nháº­t máº«u mÃ£.",
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

                    <p>Äang táº£i thÃ´ng tin sáº£n pháº©m...</p>
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

                        Quay láº¡i danh sÃ¡ch
                    </button>
                </div>

                <div className="product-detail-state product-detail-state-error">
                    <div
                        className="product-detail-error-icon"
                        aria-hidden="true"
                    >
                        !
                    </div>

                    <h2>KhÃ´ng thá»ƒ táº£i sáº£n pháº©m</h2>

                    <p>
                        {error ||
                            "KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin sáº£n pháº©m."}
                    </p>

                    <button
                        type="button"
                        className="product-detail-secondary-button"
                        onClick={() => void loadData()}
                    >
                        Thá»­ láº¡i
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

                    Quay láº¡i danh sÃ¡ch
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
                        Chi tiáº¿t sáº£n pháº©m vÃ  cÃ¡c máº«u mÃ£ Ä‘ang Ä‘Æ°á»£c
                        quáº£n lÃ½.
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
                        Chá»‰nh sá»­a
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

                                <h2>HÃ¬nh áº£nh sáº£n pháº©m</h2>

                                <p>
                                    {images.length} hÃ¬nh áº£nh
                                </p>
                            </div>

                            <label
                                className={`product-detail-primary-button product-detail-image-upload-button ${uploadingImage ? "is-disabled" : ""
                                    }`}
                            >
                                <span aria-hidden="true">+</span>

                                {uploadingImage
                                    ? "Äang táº£i áº£nh..."
                                    : "Táº£i áº£nh lÃªn"}

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
                            Há»— trá»£ JPEG, PNG, WebP. Dung lÆ°á»£ng tá»‘i Ä‘a 5 MB má»—i áº£nh.
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
                                Äang táº£i danh sÃ¡ch áº£nh...
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

                                <h3>ChÆ°a cÃ³ hÃ¬nh áº£nh</h3>

                                <p>
                                    Táº£i áº£nh lÃªn Ä‘á»ƒ hiá»ƒn thá»‹ hÃ¬nh áº£nh sáº£n pháº©m.
                                </p>
                            </div>
                        ) : (
                            <div className="product-detail-image-carousel">
                                <button
                                    type="button"
                                    className="product-detail-image-nav"
                                    aria-label="Xem áº£nh trÆ°á»›c"
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
                                                    alt={`${product.name} - áº£nh ${image.id}`}
                                                    loading="lazy"
                                                />

                                                {image.isPrimary && (
                                                    <span className="product-detail-image-primary-badge">
                                                        áº¢nh chÃ­nh
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
                                                            ? "Äang xá»­ lÃ½..."
                                                            : "Äáº·t lÃ m áº£nh chÃ­nh"}
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
                                                    XÃ³a áº£nh
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="product-detail-image-nav"
                                    aria-label="Xem áº£nh tiáº¿p theo"
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

                                <h2>ThÃ´ng tin sáº£n pháº©m</h2>
                            </div>
                        </div>

                        <div className="product-detail-info-grid">
                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    TÃªn sáº£n pháº©m
                                </span>

                                <span className="product-detail-info-value">
                                    {product.name}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    ID sáº£n pháº©m
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
                                    Danh má»¥c
                                </span>

                                <span className="product-detail-info-value">
                                    {categoryName}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    NgÃ y táº¡o
                                </span>

                                <span className="product-detail-info-value">
                                    {formatDate(product.createdAt)}
                                </span>
                            </div>

                            <div className="product-detail-info-item">
                                <span className="product-detail-info-label">
                                    Cáº­p nháº­t láº§n cuá»‘i
                                </span>

                                <span className="product-detail-info-value">
                                    {formatDate(product.updatedAt)}
                                </span>
                            </div>
                        </div>

                        <div className="product-detail-description-block">
                            <span className="product-detail-info-label">
                                MÃ´ táº£
                            </span>

                            {product.description ? (
                                <p>{product.description}</p>
                            ) : (
                                <p className="product-detail-description-empty">
                                    ChÆ°a cÃ³ mÃ´ táº£ cho sáº£n pháº©m nÃ y.
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

                                <h2>Máº«u mÃ£ sáº£n pháº©m</h2>

                                <p>{variants.length} máº«u mÃ£</p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-primary-button"
                                onClick={openCreateVariant}
                            >
                                <span aria-hidden="true">+</span>

                                ThÃªm máº«u mÃ£
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

                                <h3>ChÆ°a cÃ³ máº«u mÃ£</h3>

                                <p>
                                    Sáº£n pháº©m nÃ y hiá»‡n chÆ°a cÃ³ máº«u mÃ£
                                    nÃ o.
                                </p>
                            </div>
                        ) : (
                            <div className="product-detail-variants-wrapper">
                                <table className="product-detail-variants-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>TÃªn máº«u mÃ£</th>
                                            <th>SKU</th>
                                            <th>GiÃ¡</th>
                                            <th>GiÃ¡ so sÃ¡nh</th>
                                            <th>Tráº¡ng thÃ¡i</th>
                                            <th>Thao tÃ¡c</th>
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
                                                            â€”
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
                                                        Sá»­a
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

                        <h2>Tá»•ng quan</h2>

                        <div className="product-detail-summary-list">
                            <div>
                                <span>Sáº£n pháº©m</span>

                                <strong>{product.name}</strong>
                            </div>

                            <div>
                                <span>Danh má»¥c</span>

                                <strong>{categoryName}</strong>
                            </div>

                            <div>
                                <span>Máº«u mÃ£</span>

                                <strong>{variants.length}</strong>
                            </div>

                            <div>
                                <span>Tráº¡ng thÃ¡i</span>

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
                                    Chá»‰nh sá»­a sáº£n pháº©m
                                </h2>

                                <p>
                                    Cáº­p nháº­t thÃ´ng tin cÆ¡ báº£n cá»§a sáº£n
                                    pháº©m.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeEditProduct}
                                disabled={editing}
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
                                    TÃªn sáº£n pháº©m
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
                                    Slug dÃ¹ng cho Ä‘á»‹nh danh URL cá»§a
                                    sáº£n pháº©m.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-product-description">
                                    MÃ´ táº£
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
                                    Tráº¡ng thÃ¡i
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
                                        Äang hoáº¡t Ä‘á»™ng
                                    </option>

                                    <option value="INACTIVE">
                                        Ngá»«ng hoáº¡t Ä‘á»™ng
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Danh má»¥c
                                </span>

                                <strong>{categoryName}</strong>

                                <span>
                                    Danh má»¥c khÃ´ng Ä‘Æ°á»£c thay Ä‘á»•i táº¡i
                                    mÃ n hÃ¬nh nÃ y.
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
                                Há»§y
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
                                    ? "Äang lÆ°u..."
                                    : "LÆ°u thay Ä‘á»•i"}
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
                                    ThÃªm máº«u mÃ£
                                </h2>

                                <p>
                                    Táº¡o má»™t máº«u mÃ£ má»›i cho sáº£n pháº©m
                                    nÃ y.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeCreateVariant}
                                disabled={creatingVariant}
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
                                    TÃªn máº«u mÃ£
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
                                    placeholder="VÃ­ dá»¥: Ão thun Ä‘en - M"
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
                                    placeholder="VÃ­ dá»¥: ATDEN-M"
                                />

                                <span className="product-detail-field-help">
                                    SKU lÃ  mÃ£ Ä‘á»‹nh danh riÃªng cá»§a máº«u
                                    mÃ£.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-price">
                                    GiÃ¡ bÃ¡n
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
                                    placeholder="VÃ­ dá»¥: 299000"
                                />
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-compare-price">
                                    GiÃ¡ so sÃ¡nh
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
                                    placeholder="KhÃ´ng báº¯t buá»™c"
                                />

                                <span className="product-detail-field-help">
                                    Náº¿u nháº­p, giÃ¡ so sÃ¡nh pháº£i lá»›n hÆ¡n
                                    hoáº·c báº±ng giÃ¡ bÃ¡n.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="create-variant-status">
                                    Tráº¡ng thÃ¡i
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
                                        Äang hoáº¡t Ä‘á»™ng
                                    </option>

                                    <option value="INACTIVE">
                                        Ngá»«ng hoáº¡t Ä‘á»™ng
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Sáº£n pháº©m
                                </span>

                                <strong>{product.name}</strong>

                                <span>
                                    Máº«u mÃ£ sáº½ Ä‘Æ°á»£c táº¡o trá»±c tiáº¿p cho
                                    sáº£n pháº©m nÃ y.
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
                                Há»§y
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
                                    ? "Äang táº¡o..."
                                    : "Táº¡o máº«u mÃ£"}
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
                                    Chá»‰nh sá»­a máº«u mÃ£
                                </h2>

                                <p>
                                    Cáº­p nháº­t thÃ´ng tin cá»§a máº«u mÃ£ sáº£n
                                    pháº©m.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="product-detail-modal-close"
                                onClick={closeEditVariant}
                                disabled={updatingVariant}
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
                                    TÃªn máº«u mÃ£
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
                                    SKU lÃ  mÃ£ Ä‘á»‹nh danh riÃªng cá»§a máº«u
                                    mÃ£.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-price">
                                    GiÃ¡ bÃ¡n
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
                                    GiÃ¡ so sÃ¡nh
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
                                    Náº¿u nháº­p, giÃ¡ so sÃ¡nh pháº£i lá»›n hÆ¡n
                                    hoáº·c báº±ng giÃ¡ bÃ¡n.
                                </span>
                            </div>

                            <div className="product-detail-form-group">
                                <label htmlFor="edit-variant-status">
                                    Tráº¡ng thÃ¡i
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
                                        Äang hoáº¡t Ä‘á»™ng
                                    </option>

                                    <option value="INACTIVE">
                                        Ngá»«ng hoáº¡t Ä‘á»™ng
                                    </option>
                                </select>
                            </div>

                            <div className="product-detail-readonly-field">
                                <span className="product-detail-readonly-label">
                                    Sáº£n pháº©m
                                </span>

                                <strong>{product.name}</strong>

                                <span>
                                    Máº«u mÃ£ váº«n thuá»™c sáº£n pháº©m hiá»‡n táº¡i
                                    vÃ  khÃ´ng thá»ƒ chuyá»ƒn sang sáº£n pháº©m
                                    khÃ¡c.
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
                                Há»§y
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
                                    ? "Äang lÆ°u..."
                                    : "LÆ°u thay Ä‘á»•i"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default AdminProductDetailPage;
