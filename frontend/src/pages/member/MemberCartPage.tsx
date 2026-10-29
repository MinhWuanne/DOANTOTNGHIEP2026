import { getApiAssetUrl } from "../../services/api/api-config";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMemberProfile } from "../../services/api/auth.api";
import {
    clearMemberCart,
    getMemberCart,
    removeMemberCartItem,
    updateMemberCartItem,
    type MemberCart,
    type MemberCartItem,
} from "../../services/api/member-cart.api";

import "./MemberCartPage.css";

const MAX_CART_QUANTITY = 99;

function formatCurrency(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function getItemPrice(item: MemberCartItem) {
    const price = Number(item.variant.price);
    return Number.isFinite(price) ? price : 0;
}

function getAvailableQuantity(item: MemberCartItem) {
    if (!item.variant.inventory) {
        return MAX_CART_QUANTITY;
    }

    return Math.max(
        0,
        Math.min(
            MAX_CART_QUANTITY,
            item.variant.inventory.quantity -
            item.variant.inventory.reservedQty,
        ),
    );
}

function getCartErrorMessage(error: unknown) {
    const code =
        error instanceof Error ? error.message : "";

    const messages: Record<string, string> = {
        AUTHORIZATION_REQUIRED:
            "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
        MEMBER_ACCOUNT_REQUIRED:
            "Chỉ tài khoản thành viên mới có thể sử dụng giỏ hàng.",
        ACCOUNT_NOT_ACTIVE:
            "Tài khoản hiện không thể thực hiện thao tác này.",
        INVALID_CART_ITEM_QUANTITY:
            "Số lượng sản phẩm không hợp lệ.",
        PRODUCT_VARIANT_NOT_ACTIVE:
            "Phân loại sản phẩm hiện không còn được kinh doanh.",
        PRODUCT_NOT_ACTIVE:
            "Sản phẩm hiện không còn được kinh doanh.",
        CART_ITEM_NOT_FOUND:
            "Sản phẩm không còn trong giỏ hàng. Vui lòng tải lại trang.",
    };

    return (
        messages[code] ||
        code ||
        "Đã xảy ra lỗi. Vui lòng thử lại."
    );
}

export default function MemberCartPage() {
    const navigate = useNavigate();

    const [cart, setCart] = useState<MemberCart | null>(null);
    const [accountId, setAccountId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState("");
    const [pageMessage, setPageMessage] = useState("");
    const [busyItemId, setBusyItemId] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadCart() {
            setIsLoading(true);
            setPageError("");
            setPageMessage("");

            try {
                const profile = await getMemberProfile();

                if (!isMounted) {
                    return;
                }

                const memberAccount = profile.accounts.find(
                    (account) => account.platform === "MEMBER",
                );

                if (!memberAccount) {
                    throw new Error("MEMBER_ACCOUNT_REQUIRED");
                }

                const memberCart = await getMemberCart(memberAccount.id);

                if (!isMounted) {
                    return;
                }

                setAccountId(memberAccount.id);
                setCart(memberCart);
            } catch (error) {
                if (isMounted) {
                    setPageError(getCartErrorMessage(error));
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadCart();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleUpdateQuantity(
        item: MemberCartItem,
        nextQuantity: number,
    ) {
        if (!accountId || busyItemId || isClearing) {
            return;
        }

        if (nextQuantity < 1 || nextQuantity > MAX_CART_QUANTITY) {
            return;
        }


        if (
            nextQuantity > item.quantity &&
            nextQuantity > getAvailableQuantity(item)
        ) {
            setPageError("Số lượng yêu cầu vượt quá số lượng hàng có thể bán.");
            return;
        }


        setBusyItemId(item.id);
        setPageError("");
        setPageMessage("");

        try {
            const updatedItem = await updateMemberCartItem(
                accountId,
                item.variantId,
                nextQuantity,
            );


            setCart((currentCart) => {
                if (!currentCart) {
                    return currentCart;
                }

                return {
                    ...currentCart,
                    items: currentCart.items.map((cartItem) => {
                        if (cartItem.variantId !== updatedItem.variantId) {
                            return cartItem;
                        }

                        return {
                            ...cartItem,
                            ...updatedItem,
                            variant: {
                                ...cartItem.variant,
                                ...updatedItem.variant,
                                product: {
                                    ...cartItem.variant.product,
                                    ...updatedItem.variant.product,
                                    images:
                                        updatedItem.variant.product.images ??
                                        cartItem.variant.product.images,
                                },
                            },
                        };
                    }),
                };
            });

        } catch (error) {
            setPageError(getCartErrorMessage(error));
        } finally {
            setBusyItemId(null);
        }
    }

    async function handleRemoveItem(item: MemberCartItem) {
        if (!accountId || busyItemId || isClearing) {
            return;
        }

        setBusyItemId(item.id);
        setPageError("");
        setPageMessage("");

        try {
            await removeMemberCartItem(accountId, item.variantId);

            setCart((currentCart) => {
                if (!currentCart) {
                    return currentCart;
                }

                return {
                    ...currentCart,
                    items: currentCart.items.filter(
                        (cartItem) =>
                            cartItem.variantId !== item.variantId,
                    ),
                };
            });

            setPageMessage("Đã xóa sản phẩm khỏi giỏ hàng.");
        } catch (error) {
            setPageError(getCartErrorMessage(error));
        } finally {
            setBusyItemId(null);
        }
    }

    async function handleClearCart() {
        if (
            !accountId ||
            !cart?.items.length ||
            busyItemId ||
            isClearing
        ) {
            return;
        }

        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?",
        );

        if (!confirmed) {
            return;
        }

        setIsClearing(true);
        setPageError("");
        setPageMessage("");

        try {
            await clearMemberCart(accountId);

            setCart((currentCart) =>
                currentCart
                    ? { ...currentCart, items: [] }
                    : currentCart,
            );

            setPageMessage("Đã xóa toàn bộ giỏ hàng.");
        } catch (error) {
            setPageError(getCartErrorMessage(error));
        } finally {
            setIsClearing(false);
        }
    }

    const items = cart?.items ?? [];

    const subtotal = items.reduce(
        (total, item) =>
            total + getItemPrice(item) * item.quantity,
        0,
    );

    const totalQuantity = items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

    return (
        <main className="member-cart-page">
            <div className="member-cart-main">
                <nav className="member-cart-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <span aria-hidden="true">/</span>
                    <span>Giỏ hàng</span>
                </nav>

                <div className="member-cart-heading">
                    <div>
                        <p className="member-cart-eyebrow">
                            ICON DENIM / YOUR SELECTION
                        </p>
                        <h1>Giỏ hàng của bạn</h1>
                        <p>
                            Kiểm tra sản phẩm và số lượng trước khi tiếp tục mua sắm.
                        </p>
                    </div>

                    {!isLoading && items.length > 0 && (
                        <span className="member-cart-item-count">
                            {totalQuantity} sản phẩm
                        </span>
                    )}
                </div>

                {pageError && (
                    <div className="member-cart-alert member-cart-alert-error" role="alert">
                        <p>{pageError}</p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                        >
                            Tải lại trang
                        </button>
                    </div>
                )}

                {pageMessage && (
                    <p
                        className="member-cart-alert member-cart-alert-success"
                        role="status"
                        aria-live="polite"
                    >
                        {pageMessage}
                    </p>
                )}

                {isLoading ? (
                    <div className="member-cart-state" role="status">
                        <span className="member-cart-spinner" aria-hidden="true" />
                        <p>Đang tải giỏ hàng...</p>
                    </div>
                ) : pageError && !cart ? (
                    <div className="member-cart-state">
                        <div className="member-cart-empty-icon" aria-hidden="true">
                            !
                        </div>
                        <h2>Chưa thể tải giỏ hàng</h2>
                        <p>Vui lòng kiểm tra phiên đăng nhập rồi thử lại.</p>
                        <Link className="member-cart-primary-button" to="/login">
                            Đăng nhập
                        </Link>
                    </div>
                ) : items.length === 0 ? (
                    <div className="member-cart-state">
                        <div className="member-cart-empty-icon" aria-hidden="true">
                            â™§
                        </div>
                        <h2>Giỏ hàng đang trống</h2>
                        <p>
                            Hãy khám phá bộ sưu tập IconDenim và chọn sản phẩm bạn yêu
                            thích.
                        </p>
                        <Link
                            className="member-cart-primary-button"
                            to="/products"
                        >
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                ) : (
                    <div className="member-cart-layout">
                        <section className="member-cart-list" aria-label="Sản phẩm trong giỏ hàng">
                            <div className="member-cart-list-heading">
                                <h2>Sản phẩm đã chọn</h2>

                                <button
                                    type="button"
                                    className="member-cart-text-button member-cart-remove-all"
                                    onClick={() => void handleClearCart()}
                                    disabled={isClearing || busyItemId !== null}
                                >
                                    {isClearing ? "Đang xóa..." : "Xóa tất cả"}
                                </button>
                            </div>

                            {items.map((item) => {
                                const variant = item.variant;
                                const product = variant.product;
                                const primaryImage =
                                    product.images?.find((image) => image.isPrimary) ??
                                    product.images?.slice().sort(
                                        (a, b) => a.sortOrder - b.sortOrder,
                                    )[0];

                                const availableQuantity = getAvailableQuantity(item);
                                const isBusy =
                                    busyItemId === item.id || isClearing;
                                const unitPrice = getItemPrice(item);

                                return (
                                    <article
                                        className="member-cart-item"
                                        key={item.id}
                                    >
                                        <Link
                                            className="member-cart-item-image"
                                            to={`/products/${product.slug}`}
                                            aria-label={`Xem ${product.name}`}
                                        >
                                            {primaryImage?.url ? (
                                                <img
                                                    src={
                                                        primaryImage.url.startsWith("http")
                                                            ? primaryImage.url
                                                            : getApiAssetUrl(primaryImage.url)
                                                    }
                                                    alt={product.name}
                                                />
                                            ) : (
                                                <span>ICON DENIM</span>
                                            )}
                                        </Link>

                                        <div className="member-cart-item-info">
                                            <Link
                                                className="member-cart-product-name"
                                                to={`/products/${product.slug}`}
                                            >
                                                {product.name}
                                            </Link>

                                            <p className="member-cart-variant">
                                                Phân loại: {variant.name || variant.sku}
                                            </p>

                                            <p className="member-cart-sku">
                                                SKU: {variant.sku}
                                            </p>

                                            <p className="member-cart-unit-price">
                                                {formatCurrency(unitPrice)}
                                            </p>

                                            {availableQuantity === 0 && (
                                                <p className="member-cart-stock-warning">
                                                    Hiện không còn hàng khả dụng.
                                                </p>
                                            )}

                                            {availableQuantity > 0 &&
                                                item.quantity > availableQuantity && (
                                                    <p className="member-cart-stock-warning">
                                                        Số lượng trong giỏ vượt quá lượng hàng hiện có.
                                                        Vui lòng điều chỉnh trước khi đặt hàng.
                                                    </p>
                                                )}

                                            <div className="member-cart-item-actions">
                                                <div
                                                    className="member-cart-quantity"
                                                    aria-label={`Số lượng ${product.name}`}
                                                >
                                                    <button
                                                        type="button"
                                                        aria-label="Giảm số lượng"
                                                        onClick={() =>
                                                            void handleUpdateQuantity(
                                                                item,
                                                                item.quantity - 1,
                                                            )
                                                        }
                                                        disabled={isBusy || item.quantity <= 1}
                                                    >
                                                        âˆ’
                                                    </button>

                                                    <span aria-live="polite">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        aria-label="Tăng số lượng"
                                                        onClick={() =>
                                                            void handleUpdateQuantity(
                                                                item,
                                                                item.quantity + 1,
                                                            )
                                                        }
                                                        disabled={
                                                            isBusy ||
                                                            item.quantity >= MAX_CART_QUANTITY ||
                                                            item.quantity >= availableQuantity
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="member-cart-text-button"
                                                    onClick={() => void handleRemoveItem(item)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? "Đang xử lý..." : "Xóa"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="member-cart-item-total">
                                            {formatCurrency(unitPrice * item.quantity)}
                                        </div>
                                    </article>
                                );
                            })}

                            <div className="member-cart-continue">
                                <Link to="/products">← Tiếp tục mua sắm</Link>
                            </div>
                        </section>

                        <aside className="member-cart-summary">
                            <h2>Tóm tắt đơn hàng</h2>

                            <div className="member-cart-summary-row">
                                <span>Số lượng sản phẩm</span>
                                <span>{totalQuantity}</span>
                            </div>

                            <div className="member-cart-summary-row">
                                <span>Tạm tính</span>
                                <strong>{formatCurrency(subtotal)}</strong>
                            </div>

                            <div className="member-cart-summary-row member-cart-shipping-row">
                                <span>Phí vận chuyển</span>
                                <span>Tính khi thanh toán</span>
                            </div>

                            <div className="member-cart-summary-total">
                                <span>Tổng tạm tính</span>
                                <strong>{formatCurrency(subtotal)}</strong>
                            </div>

                            <p className="member-cart-summary-note">
                                Phí vận chuyển và các khoản giảm giá sẽ được xác định ở
                                bước thanh toán.
                            </p>

                            <button
                                type="button"
                                className="member-cart-checkout-button"
                                disabled={isLoading || items.length === 0 || !accountId}
                                onClick={() => navigate("/member/checkout")}
                            >
                                TIẾP TỤC THANH TOÁN
                            </button>

                            <p className="member-cart-checkout-note">
                                Kiểm tra địa chỉ nhận hàng và phương thức thanh toán ở bước tiếp theo.
                            </p>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}

