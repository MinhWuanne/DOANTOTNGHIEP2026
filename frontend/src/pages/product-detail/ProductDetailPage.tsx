
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
        setError("Không tìm thấy đường dẫn sản phẩm.");
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
            "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
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
        "Chỉ tài khoản thành viên mới có thể mua hàng.",
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
          "Không tìm thấy tài khoản thành viên.",
        );
      }

      await addMemberCartItem(memberAccount.id, {
        variantId: selectedVariant.id,
        quantity: 1,
      });

      setCartMessageType("success");
      setCartMessage("Đã thêm sản phẩm vào giỏ hàng.");
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
          "Số lượng sản phẩm không hợp lệ. Vui lòng thử lại.",
        );
      } else if (message === "PRODUCT_VARIANT_NOT_ACTIVE") {
        setCartMessage(
          "Phiên bản sản phẩm hiện không còn khả dụng.",
        );
      } else if (message === "PRODUCT_NOT_ACTIVE") {
        setCartMessage(
          "Sản phẩm hiện không còn được kinh doanh.",
        );
      } else if (message === "ACCOUNT_NOT_ACTIVE") {
        setCartMessage(
          "Tài khoản thành viên hiện không hoạt động.",
        );
      } else if (message === "MEMBER_ACCOUNT_REQUIRED") {
        setCartMessage(
          "Tài khoản hiện tại không thể sử dụng giỏ hàng thành viên.",
        );
      } else {
        setCartMessage(
          message ||
          "Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.",
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
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/products">Sản phẩm</Link>

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
            <p>Đang tải thông tin sản phẩm...</p>
          </div>
        )}

        {!loading && error && (
          <div className="product-detail-state">
            <h2>Không thể hiển thị sản phẩm</h2>
            <p>{error}</p>

            <Link
              className="product-detail-back-button"
              to="/products"
            >
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        )}

        {!loading && !error && product && (
          <div className="product-detail-layout">
            <section
              className="product-detail-gallery"
              aria-label="Hình ảnh sản phẩm"
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
                    <p>Hình ảnh sản phẩm đang được cập nhật</p>
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
                      aria-label={`Xem ảnh ${index + 1}`}
                      aria-pressed={selectedImageIndex === index}
                    >
                      <img
                        src={getImageUrl(image.url)}
                        alt={`${product.name} - ảnh ${index + 1}`}
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
                Mã sản phẩm:{" "}
                {selectedVariant?.sku ?? "Đang cập nhật"}
              </p>

              <div className="product-detail-price">
                {price !== null ? (
                  <>
                    <strong>{formatPrice(price)}</strong>

                    {hasDiscount && (
                      <>
                        <del>{formatPrice(compareAtPrice!)}</del>
                        <span className="product-detail-saving">
                          Tiết kiệm{" "}
                          {formatPrice(compareAtPrice! - price)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <strong>Liên hệ</strong>
                )}
              </div>

              <div className="product-detail-divider" />

              <div className="product-detail-variant-section">
                <div className="product-detail-section-heading">
                  <h2>Phiên bản sản phẩm</h2>

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
                              ? `${getVariantLabel(variant)} - Hết hàng`
                              : getVariantLabel(variant)
                          }
                        >
                          <span>{getVariantLabel(variant)}</span>
                          {quantity === 0 && (
                            <small>Hết hàng</small>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="product-detail-no-variants">
                    Sản phẩm hiện chưa có phiên bản khả dụng.
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
                    ? "Còn hàng"
                    : "Hết hàng"}
                </span>

                {availableQuantity > 0 && (
                  <span>
                    {availableQuantity} sản phẩm có thể bán
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
                  ? "Chưa có phiên bản"
                  : availableQuantity <= 0
                    ? "Tạm hết hàng"
                    : isAddingToCart
                      ? "Đang thêm..."
                      : "Thêm vào giỏ hàng"}
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
                    <strong>Sản phẩm chính hãng IconDenim</strong>
                    <p>
                      Thông tin sản phẩm được lấy trực tiếp từ hệ thống.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="product-detail-benefit-icon">
                    ↻
                  </span>
                  <div>
                    <strong>Hỗ trợ đổi trả</strong>
                    <p>
                      Áp dụng theo chính sách đổi trả của cửa hàng.
                    </p>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="product-detail-description">
                  <h2>Mô tả sản phẩm</h2>
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

