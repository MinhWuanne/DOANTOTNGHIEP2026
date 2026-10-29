
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getProductBySlug,
  type StorefrontProduct,
  type ProductVariant,
} from "../../services/api/product.api";
import { getAccessToken, getAuthRole } from "../../utils/auth";
import { getMemberProfile } from "../../services/api/auth.api";
import { addMemberCartItem } from "../../services/api/member-cart.api";

import "./ProductDetailPage.css";

import { API_BASE_URL } from "../../services/api/api-config";

function formatPrice(price: string | number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(price));
}

function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getAvailableQuantity(
  variant: ProductVariant,
): number {
  if (!variant.inventory) {
    return 0;
  }

  return Math.max(
    0,
    variant.inventory.quantity -
    variant.inventory.reservedQty,
  );
}

function getVariantLabel(
  variant: ProductVariant,
): string {
  return variant.name?.trim() || variant.sku;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] =
    useState<StorefrontProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] =
    useState("");
  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartMessageType, setCartMessageType] =
    useState<"success" | "error">("success");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!slug) {
        setProduct(null);
        setError("KhÃ´ng tÃ¬m tháº¥y Ä‘Æ°á»ng dáº«n sáº£n pháº©m.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setProduct(null);
      setSelectedVariantId("");
      setSelectedImageIndex(0);
      setCartMessage("");

      try {
        const result = await getProductBySlug(slug);

        if (cancelled) {
          return;
        }

        setProduct(result);

        const firstAvailableVariant =
          result.variants.find(
            (variant) => getAvailableQuantity(variant) > 0,
          );

        setSelectedVariantId(
          (firstAvailableVariant ?? result.variants[0])?.id ?? "",
        );
      } catch {
        if (!cancelled) {
          setError(
            "KhÃ´ng thá»ƒ táº£i thÃ´ng tin sáº£n pháº©m. Vui lÃ²ng thá»­ láº¡i.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find(
        (variant) => variant.id === selectedVariantId,
      ) ?? null,
    [product, selectedVariantId],
  );

  const images = useMemo(() => {
    if (!product) {
      return [];
    }

    return [...product.images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.sortOrder - b.sortOrder;
    });
  }, [product]);

  const availableQuantity = selectedVariant
    ? getAvailableQuantity(selectedVariant)
    : 0;

  const price = selectedVariant
    ? Number(selectedVariant.price)
    : null;

  const compareAtPrice = selectedVariant?.compareAtPrice
    ? Number(selectedVariant.compareAtPrice)
    : null;

  const hasDiscount =
    price !== null &&
    compareAtPrice !== null &&
    compareAtPrice > price;

  const discountPercent = hasDiscount
    ? Math.round(
      ((compareAtPrice! - price!) / compareAtPrice!) * 100,
    )
    : 0;

  async function handleAddToCart() {
    if (isAddingToCart) {
      return;
    }

    if (!selectedVariant || availableQuantity <= 0) {
      return;
    }

    const role = (["MEMBER", "FRANCHISE", "ADMIN", "SUPER_ADMIN"] as const)
      .find((candidate) => getAccessToken(candidate) && getAuthRole(candidate) === candidate);

    if (!role) {
      navigate("/login", {
        state: { from: window.location.pathname },
      });
      return;
    }

    if (role !== "MEMBER") {
      setCartMessageType("error");
      setCartMessage(
        "Chá»‰ tÃ i khoáº£n thÃ nh viÃªn má»›i cÃ³ thá»ƒ mua hÃ ng.",
      );
      return;
    }

    setIsAddingToCart(true);
    setCartMessage("");

    try {
      const profile = await getMemberProfile();

      const memberAccount = profile.accounts.find(
        (account) => account.platform === "MEMBER",
      );

      if (!memberAccount) {
        throw new Error(
          "KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n thÃ nh viÃªn.",
        );
      }

      await addMemberCartItem(memberAccount.id, {
        variantId: selectedVariant.id,
        quantity: 1,
      });

      setCartMessageType("success");
      setCartMessage("ÄÃ£ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "";

      if (message === "AUTHORIZATION_REQUIRED") {
        navigate("/login", {
          state: { from: window.location.pathname },
        });
        return;
      }

      setCartMessageType("error");

      if (message === "INVALID_CART_ITEM_QUANTITY") {
        setCartMessage(
          "Sá»‘ lÆ°á»£ng sáº£n pháº©m khÃ´ng há»£p lá»‡. Vui lÃ²ng thá»­ láº¡i.",
        );
      } else if (message === "PRODUCT_VARIANT_NOT_ACTIVE") {
        setCartMessage(
          "PhiÃªn báº£n sáº£n pháº©m hiá»‡n khÃ´ng cÃ²n kháº£ dá»¥ng.",
        );
      } else if (message === "PRODUCT_NOT_ACTIVE") {
        setCartMessage(
          "Sáº£n pháº©m hiá»‡n khÃ´ng cÃ²n Ä‘Æ°á»£c kinh doanh.",
        );
      } else if (message === "ACCOUNT_NOT_ACTIVE") {
        setCartMessage(
          "TÃ i khoáº£n thÃ nh viÃªn hiá»‡n khÃ´ng hoáº¡t Ä‘á»™ng.",
        );
      } else if (message === "MEMBER_ACCOUNT_REQUIRED") {
        setCartMessage(
          "TÃ i khoáº£n hiá»‡n táº¡i khÃ´ng thá»ƒ sá»­ dá»¥ng giá» hÃ ng thÃ nh viÃªn.",
        );
      } else {
        setCartMessage(
          message ||
          "KhÃ´ng thá»ƒ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng. Vui lÃ²ng thá»­ láº¡i.",
        );
      }
    } finally {
      setIsAddingToCart(false);
    }
  }

  return (
    <div className="product-detail-page">


      <main className="product-detail-main">
        <div className="product-detail-breadcrumb">
          <Link to="/">Trang chá»§</Link>
          <span>/</span>
          <Link to="/products">Sáº£n pháº©m</Link>

          {product && (
            <>
              <span>/</span>
              <span className="product-detail-breadcrumb-current">
                {product.name}
              </span>
            </>
          )}
        </div>

        {loading && (
          <div
            className="product-detail-state"
            role="status"
          >
            <span className="product-detail-spinner" />
            <p>Äang táº£i thÃ´ng tin sáº£n pháº©m...</p>
          </div>
        )}

        {!loading && error && (
          <div className="product-detail-state">
            <h2>KhÃ´ng thá»ƒ hiá»ƒn thá»‹ sáº£n pháº©m</h2>
            <p>{error}</p>

            <Link
              className="product-detail-back-button"
              to="/products"
            >
              Quay láº¡i danh sÃ¡ch sáº£n pháº©m
            </Link>
          </div>
        )}

        {!loading && !error && product && (
          <div className="product-detail-layout">
            <section
              className="product-detail-gallery"
              aria-label="HÃ¬nh áº£nh sáº£n pháº©m"
            >
              <div className="product-detail-main-image">
                {images.length > 0 ? (
                  <img
                    src={getImageUrl(
                      images[
                        Math.min(
                          selectedImageIndex,
                          images.length - 1,
                        )
                      ].url,
                    )}
                    alt={product.name}
                  />
                ) : (
                  <div className="product-detail-image-placeholder">
                    <span>ICON DENIM</span>
                    <p>HÃ¬nh áº£nh sáº£n pháº©m Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t</p>
                  </div>
                )}

                {hasDiscount && (
                  <span className="product-detail-discount-badge">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="product-detail-thumbnails">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`product-detail-thumbnail ${selectedImageIndex === index
                        ? "is-active"
                        : ""
                        }`}
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`Xem áº£nh ${index + 1}`}
                      aria-pressed={selectedImageIndex === index}
                    >
                      <img
                        src={getImageUrl(image.url)}
                        alt={`${product.name} - áº£nh ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="product-detail-info">
              <p className="product-detail-category">
                {product.category.name}
              </p>

              <h1 className="product-detail-name">
                {product.name}
              </h1>

              <p className="product-detail-sku">
                MÃ£ sáº£n pháº©m:{" "}
                {selectedVariant?.sku ?? "Äang cáº­p nháº­t"}
              </p>

              <div className="product-detail-price">
                {price !== null ? (
                  <>
                    <strong>{formatPrice(price)}</strong>

                    {hasDiscount && (
                      <>
                        <del>{formatPrice(compareAtPrice!)}</del>
                        <span className="product-detail-saving">
                          Tiáº¿t kiá»‡m{" "}
                          {formatPrice(compareAtPrice! - price)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <strong>LiÃªn há»‡</strong>
                )}
              </div>

              <div className="product-detail-divider" />

              <div className="product-detail-variant-section">
                <div className="product-detail-section-heading">
                  <h2>PhiÃªn báº£n sáº£n pháº©m</h2>

                  {selectedVariant && (
                    <span>{getVariantLabel(selectedVariant)}</span>
                  )}
                </div>

                {product.variants.length > 0 ? (
                  <div className="product-detail-variants">
                    {product.variants.map((variant) => {
                      const quantity =
                        getAvailableQuantity(variant);
                      const isSelected =
                        variant.id === selectedVariantId;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          className={`product-detail-variant ${isSelected ? "is-selected" : ""
                            } ${quantity === 0
                              ? "is-out-of-stock"
                              : ""
                            }`}
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setCartMessage("");
                          }}
                          aria-pressed={isSelected}
                          title={
                            quantity === 0
                              ? `${getVariantLabel(variant)} - Háº¿t hÃ ng`
                              : getVariantLabel(variant)
                          }
                        >
                          <span>{getVariantLabel(variant)}</span>
                          {quantity === 0 && (
                            <small>Háº¿t hÃ ng</small>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="product-detail-no-variants">
                    Sáº£n pháº©m hiá»‡n chÆ°a cÃ³ phiÃªn báº£n kháº£ dá»¥ng.
                  </p>
                )}
              </div>

              <div className="product-detail-stock">
                <span
                  className={
                    availableQuantity > 0
                      ? "product-detail-stock-available"
                      : "product-detail-stock-unavailable"
                  }
                >
                  {availableQuantity > 0
                    ? "CÃ²n hÃ ng"
                    : "Háº¿t hÃ ng"}
                </span>

                {availableQuantity > 0 && (
                  <span>
                    {availableQuantity} sáº£n pháº©m cÃ³ thá»ƒ bÃ¡n
                  </span>
                )}
              </div>

              <button
                type="button"
                className="product-detail-buy-button"
                disabled={
                  !selectedVariant ||
                  availableQuantity <= 0 ||
                  isAddingToCart
                }
                onClick={() => {
                  void handleAddToCart();
                }}
              >
                {!selectedVariant
                  ? "ChÆ°a cÃ³ phiÃªn báº£n"
                  : availableQuantity <= 0
                    ? "Táº¡m háº¿t hÃ ng"
                    : isAddingToCart
                      ? "Äang thÃªm..."
                      : "ThÃªm vÃ o giá» hÃ ng"}
              </button>

              {cartMessage && (
                <p
                  className={
                    cartMessageType === "success"
                      ? "product-detail-cart-message product-detail-cart-message-success"
                      : "product-detail-cart-message product-detail-cart-message-error"
                  }
                  role="status"
                  aria-live="polite"
                >
                  {cartMessage}
                </p>
              )}

              <div className="product-detail-benefits">
                <div>
                  <span className="product-detail-benefit-icon">
                    âœ“
                  </span>
                  <div>
                    <strong>Sáº£n pháº©m chÃ­nh hÃ£ng IconDenim</strong>
                    <p>
                      ThÃ´ng tin sáº£n pháº©m Ä‘Æ°á»£c láº¥y trá»±c tiáº¿p tá»« há»‡ thá»‘ng.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="product-detail-benefit-icon">
                    â†»
                  </span>
                  <div>
                    <strong>Há»— trá»£ Ä‘á»•i tráº£</strong>
                    <p>
                      Ãp dá»¥ng theo chÃ­nh sÃ¡ch Ä‘á»•i tráº£ cá»§a cá»­a hÃ ng.
                    </p>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="product-detail-description">
                  <h2>MÃ´ táº£ sáº£n pháº©m</h2>
                  <p>{product.description}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>


    </div>
  );
}

