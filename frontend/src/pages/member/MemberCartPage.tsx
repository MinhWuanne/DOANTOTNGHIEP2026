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
            "PhiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.",
        MEMBER_ACCOUNT_REQUIRED:
            "Chá»‰ tÃ i khoáº£n thÃ nh viÃªn má»›i cÃ³ thá»ƒ sá»­ dá»¥ng giá» hÃ ng.",
        ACCOUNT_NOT_ACTIVE:
            "TÃ i khoáº£n hiá»‡n khÃ´ng thá»ƒ thá»±c hiá»‡n thao tÃ¡c nÃ y.",
        INVALID_CART_ITEM_QUANTITY:
            "Sá»‘ lÆ°á»£ng sáº£n pháº©m khÃ´ng há»£p lá»‡.",
        PRODUCT_VARIANT_NOT_ACTIVE:
            "PhÃ¢n loáº¡i sáº£n pháº©m hiá»‡n khÃ´ng cÃ²n Ä‘Æ°á»£c kinh doanh.",
        PRODUCT_NOT_ACTIVE:
            "Sáº£n pháº©m hiá»‡n khÃ´ng cÃ²n Ä‘Æ°á»£c kinh doanh.",
        CART_ITEM_NOT_FOUND:
            "Sáº£n pháº©m khÃ´ng cÃ²n trong giá» hÃ ng. Vui lÃ²ng táº£i láº¡i trang.",
    };

    return (
        messages[code] ||
        code ||
        "ÄÃ£ xáº£y ra lá»—i. Vui lÃ²ng thá»­ láº¡i."
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
            setPageError("Sá»‘ lÆ°á»£ng yÃªu cáº§u vÆ°á»£t quÃ¡ sá»‘ lÆ°á»£ng hÃ ng cÃ³ thá»ƒ bÃ¡n.");
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

            setPageMessage("ÄÃ£ xÃ³a sáº£n pháº©m khá»i giá» hÃ ng.");
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
            "Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a toÃ n bá»™ sáº£n pháº©m trong giá» hÃ ng?",
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

            setPageMessage("ÄÃ£ xÃ³a toÃ n bá»™ giá» hÃ ng.");
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
                    <Link to="/">Trang chá»§</Link>
                    <span aria-hidden="true">/</span>
                    <span>Giá» hÃ ng</span>
                </nav>

                <div className="member-cart-heading">
                    <div>
                        <p className="member-cart-eyebrow">
                            ICON DENIM / YOUR SELECTION
                        </p>
                        <h1>Giá» hÃ ng cá»§a báº¡n</h1>
                        <p>
                            Kiá»ƒm tra sáº£n pháº©m vÃ  sá»‘ lÆ°á»£ng trÆ°á»›c khi tiáº¿p tá»¥c mua sáº¯m.
                        </p>
                    </div>

                    {!isLoading && items.length > 0 && (
                        <span className="member-cart-item-count">
                            {totalQuantity} sáº£n pháº©m
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
                            Táº£i láº¡i trang
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
                        <p>Äang táº£i giá» hÃ ng...</p>
                    </div>
                ) : pageError && !cart ? (
                    <div className="member-cart-state">
                        <div className="member-cart-empty-icon" aria-hidden="true">
                            !
                        </div>
                        <h2>ChÆ°a thá»ƒ táº£i giá» hÃ ng</h2>
                        <p>Vui lÃ²ng kiá»ƒm tra phiÃªn Ä‘Äƒng nháº­p rá»“i thá»­ láº¡i.</p>
                        <Link className="member-cart-primary-button" to="/login">
                            ÄÄƒng nháº­p
                        </Link>
                    </div>
                ) : items.length === 0 ? (
                    <div className="member-cart-state">
                        <div className="member-cart-empty-icon" aria-hidden="true">
                            â™§
                        </div>
                        <h2>Giá» hÃ ng Ä‘ang trá»‘ng</h2>
                        <p>
                            HÃ£y khÃ¡m phÃ¡ bá»™ sÆ°u táº­p IconDenim vÃ  chá»n sáº£n pháº©m báº¡n yÃªu
                            thÃ­ch.
                        </p>
                        <Link
                            className="member-cart-primary-button"
                            to="/products"
                        >
                            Tiáº¿p tá»¥c mua sáº¯m
                        </Link>
                    </div>
                ) : (
                    <div className="member-cart-layout">
                        <section className="member-cart-list" aria-label="Sáº£n pháº©m trong giá» hÃ ng">
                            <div className="member-cart-list-heading">
                                <h2>Sáº£n pháº©m Ä‘Ã£ chá»n</h2>

                                <button
                                    type="button"
                                    className="member-cart-text-button member-cart-remove-all"
                                    onClick={() => void handleClearCart()}
                                    disabled={isClearing || busyItemId !== null}
                                >
                                    {isClearing ? "Äang xÃ³a..." : "XÃ³a táº¥t cáº£"}
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
                                                PhÃ¢n loáº¡i: {variant.name || variant.sku}
                                            </p>

                                            <p className="member-cart-sku">
                                                SKU: {variant.sku}
                                            </p>

                                            <p className="member-cart-unit-price">
                                                {formatCurrency(unitPrice)}
                                            </p>

                                            {availableQuantity === 0 && (
                                                <p className="member-cart-stock-warning">
                                                    Hiá»‡n khÃ´ng cÃ²n hÃ ng kháº£ dá»¥ng.
                                                </p>
                                            )}

                                            {availableQuantity > 0 &&
                                                item.quantity > availableQuantity && (
                                                    <p className="member-cart-stock-warning">
                                                        Sá»‘ lÆ°á»£ng trong giá» vÆ°á»£t quÃ¡ lÆ°á»£ng hÃ ng hiá»‡n cÃ³.
                                                        Vui lÃ²ng Ä‘iá»u chá»‰nh trÆ°á»›c khi Ä‘áº·t hÃ ng.
                                                    </p>
                                                )}

                                            <div className="member-cart-item-actions">
                                                <div
                                                    className="member-cart-quantity"
                                                    aria-label={`Sá»‘ lÆ°á»£ng ${product.name}`}
                                                >
                                                    <button
                                                        type="button"
                                                        aria-label="Giáº£m sá»‘ lÆ°á»£ng"
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
                                                        aria-label="TÄƒng sá»‘ lÆ°á»£ng"
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
                                                    {isBusy ? "Äang xá»­ lÃ½..." : "XÃ³a"}
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
                                <Link to="/products">â† Tiáº¿p tá»¥c mua sáº¯m</Link>
                            </div>
                        </section>

                        <aside className="member-cart-summary">
                            <h2>TÃ³m táº¯t Ä‘Æ¡n hÃ ng</h2>

                            <div className="member-cart-summary-row">
                                <span>Sá»‘ lÆ°á»£ng sáº£n pháº©m</span>
                                <span>{totalQuantity}</span>
                            </div>

                            <div className="member-cart-summary-row">
                                <span>Táº¡m tÃ­nh</span>
                                <strong>{formatCurrency(subtotal)}</strong>
                            </div>

                            <div className="member-cart-summary-row member-cart-shipping-row">
                                <span>PhÃ­ váº­n chuyá»ƒn</span>
                                <span>TÃ­nh khi thanh toÃ¡n</span>
                            </div>

                            <div className="member-cart-summary-total">
                                <span>Tá»•ng táº¡m tÃ­nh</span>
                                <strong>{formatCurrency(subtotal)}</strong>
                            </div>

                            <p className="member-cart-summary-note">
                                PhÃ­ váº­n chuyá»ƒn vÃ  cÃ¡c khoáº£n giáº£m giÃ¡ sáº½ Ä‘Æ°á»£c xÃ¡c Ä‘á»‹nh á»Ÿ
                                bÆ°á»›c thanh toÃ¡n.
                            </p>

                            <button
                                type="button"
                                className="member-cart-checkout-button"
                                disabled={isLoading || items.length === 0 || !accountId}
                                onClick={() => navigate("/member/checkout")}
                            >
                                TIáº¾P Tá»¤C THANH TOÃN
                            </button>

                            <p className="member-cart-checkout-note">
                                Kiá»ƒm tra Ä‘á»‹a chá»‰ nháº­n hÃ ng vÃ  phÆ°Æ¡ng thá»©c thanh toÃ¡n á»Ÿ bÆ°á»›c tiáº¿p theo.
                            </p>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}

