
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StorefrontIcon from "../components/storefront/StorefrontIcon";

import {
  getProducts,
  type StorefrontProduct,
} from "../services/api/product.api";

import {
  getCategories,
  type ProductCategory,
} from "../services/api/category.api";

import "./HomePage.css";

import { API_BASE_URL } from "../services/api/api-config";
const HERO_INTERVAL = 6000;

const heroSlides = [
  {
    eyebrow: "ICONDENIM / NEW COLLECTION",
    title: "DENIM FOR",
    highlight: "EVERY DAY.",
    description:
      "Những thiết kế denim dễ phối đồ, đồng hành cùng phong cách riêng của bạn.",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Bộ sưu tập quần denim xanh",
    label: "EVERYDAY DENIM",
    cta: "KHÁM PHÁ SẢN PHẨM",
  },
  {
    eyebrow: "FIND YOUR OWN STYLE",
    title: "YOUR STYLE.",
    highlight: "YOUR RULES.",
    description:
      "Tự tin lựa chọn. Thoải mái thể hiện. Tạo nên phong cách của riêng mình.",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Chiến dịch thời trang phong cách hiện đại",
    label: "OWN YOUR STYLE",
    cta: "TÌM PHONG CÁCH CỦA BẠN",
  },
  {
    eyebrow: "TIMELESS DENIM ESSENTIALS",
    title: "MADE FOR",
    highlight: "YOUR LIFE.",
    description:
      "Từ những ngày bận rộn đến những cuộc hẹn ngẫu hứng, denim luôn là lựa chọn dễ dàng.",
    image:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Phong cách trang phục denim thường ngày",
    label: "THE DENIM EDIT",
    cta: "XEM BỘ SƯU TẬP",
  },
];

const categoryImageMap: Record<string, string> = {
  "ao-thun": "/images/categories/ao_thun_1.webp",
  "ao-polo": "/images/categories/ao_polo_2.webp",
  "ao-somi": "/images/categories/ao_somi_3.webp",
  "ao-khoac": "/images/categories/ao_khoac_4.webp",
  "ao-ni": "/images/categories/ao_nivalen_5.webp",
  hoodies: "/images/categories/ao_hoodie_6.webp",
  "tank-top-ao-ba-lo": "/images/categories/ao_balo_7.webp",
  "set-quan-ao": "/images/categories/set_quanao_8.webp",
};

const hiddenCategorySlugs = new Set([
  "ao",
  "quan",
  "phu-kien",
]);

// Product Image
function getProductImage(product: StorefrontProduct): string | null {
  const images = [...product.images].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );

  const image =
    images.find((item) => item.isPrimary) ?? images[0];

  if (!image?.url) {
    return null;
  }

  if (
    image.url.startsWith("http://") ||
    image.url.startsWith("https://")
  ) {
    return image.url;
  }

  return `${API_BASE_URL}${image.url.startsWith("/") ? "" : "/"}${image.url}`;
}

// Product Price
function getProductPrice(product: StorefrontProduct): number | null {
  const prices = product.variants
    .filter((variant) => {
      if (!variant.inventory) {
        return false;
      }

      const availableQuantity =
        variant.inventory.quantity - variant.inventory.reservedQty;

      const price = Number(variant.price);

      return (
        availableQuantity > 0 &&
        Number.isFinite(price) &&
        price > 0
      );
    })
    .map((variant) => Number(variant.price));

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

// Format Price
function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

// Product Image
function ProductImage({
  product,
}: {
  product: StorefrontProduct;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getProductImage(product);

  if (!image || imageFailed) {
    return (
      <div
        className="home-product-image-placeholder"
        role="img"
        aria-label={`Sản phẩm ${product.name} chưa có hình ảnh`}
      >
        <span className="home-placeholder-brand">ICON</span>
        <span className="home-placeholder-name">DENIM</span>
        <span className="home-placeholder-caption">
          YOUR EVERYDAY STYLE
        </span>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={product.name}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

function HomePage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const [categoriesError, setCategoriesError] = useState("");
  const [productsError, setProductsError] = useState("");

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const result = await getCategories();

        if (!cancelled) {
          setCategories(result);
          setCategoriesError("");
        }
      } catch (error) {
        console.error("Load categories failed:", error);

        if (!cancelled) {
          setCategoriesError("Không thể tải danh mục sản phẩm.");
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    async function loadProducts() {
      try {
        const result = await getProducts();

        if (!cancelled) {
          setProducts(result);
          setProductsError("");
        }
      } catch (error) {
        console.error("Load products failed:", error);

        if (!cancelled) {
          setProductsError("Không thể tải sản phẩm.");
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    }

    void loadCategories();
    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function showPreviousSlide() {
    setActiveSlide(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length,
    );
  }

  function showNextSlide() {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  }

  const currentSlide = heroSlides[activeSlide];

  return (
    <div className="home-page">

      <main>
        {/* Campaign Hero Carousel */}
        <section
          className="home-hero"
          aria-label="Chiến dịch thời trang IconDenim"
        >
          <div className="home-hero-media">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.label}
                className={`home-hero-image ${index === activeSlide ? "is-active" : ""
                  }`}
                src={slide.image}
                alt={slide.imageAlt}
                fetchPriority={index === 0 ? "high" : "auto"}
                loading={index === 0 ? "eager" : "lazy"}
                aria-hidden={index !== activeSlide}
              />
            ))}
            <div className="home-hero-shade" />
          </div>

          <div className="home-hero-content">
            <p className="home-eyebrow">
              {currentSlide.eyebrow}
            </p>

            <h1 key={currentSlide.label} className="home-hero-title">
              {currentSlide.title}
              <br />
              <span>{currentSlide.highlight}</span>
            </h1>

            <p className="home-hero-description">
              {currentSlide.description}
            </p>

            <Link
              to="/products"
              className="home-button home-button-light"
            >
              {currentSlide.cta}
              <StorefrontIcon name="arrow" />
            </Link>

            <div className="home-hero-caption">
              <span>
                {String(activeSlide + 1).padStart(2, "0")} /{" "}
                {currentSlide.label}
              </span>
              <span>ICONDENIM — EVERYDAY STYLE</span>
            </div>
          </div>

          <div className="home-hero-controls">
            <button
              type="button"
              className="home-hero-arrow home-hero-previous"
              onClick={showPreviousSlide}
              aria-label="Chiến dịch trước"
            >
              <StorefrontIcon name="arrow" />
            </button>

            <div
              className="home-hero-dots"
              aria-label="Chọn chiến dịch"
            >
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  className={`home-hero-dot ${index === activeSlide ? "is-active" : ""
                    }`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Xem chiến dịch ${index + 1}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              className="home-hero-arrow home-hero-next"
              onClick={showNextSlide}
              aria-label="Chiến dịch tiếp theo"
            >
              <StorefrontIcon name="arrow" />
            </button>
          </div>

          <span className="home-hero-index" aria-hidden="true">
            I / D
          </span>
        </section>

        {/* Shopping Benefits */}
        <section
          className="home-benefits"
          aria-label="Điểm nổi bật của IconDenim"
        >
          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="arrow" />
            </span>
            <div>
              <h2>DỄ DÀNG LỰA CHỌN</h2>
              <p>Khám phá sản phẩm theo phong cách</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="bag" />
            </span>
            <div>
              <h2>THÔNG TIN RÕ RÀNG</h2>
              <p>Giá và tình trạng hàng theo dữ liệu hiện có</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="arrow" />
            </span>
            <div>
              <h2>KHÁM PHÁ NHANH</h2>
              <p>Đi thẳng đến sản phẩm bạn quan tâm</p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="home-section home-categories">
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">SHOP BY CATEGORY</p>
              <h2>KHÁM PHÁ DANH MỤC</h2>
              <p className="home-section-description">
                Tìm lựa chọn phù hợp với phong cách hằng ngày của bạn.
              </p>
            </div>

            <Link to="/products" className="home-text-link">
              TẤT CẢ SẢN PHẨM
              <StorefrontIcon name="arrow" />
            </Link>
          </div>


          <div className="home-category-carousel">
            <button
              type="button"
              className="home-category-nav home-category-nav-prev"
              aria-label="Danh mục trước"
              onClick={() => {
                const track = document.querySelector(
                  ".home-category-track",
                );

                if (track) {
                  track.scrollBy({
                    left: -track.clientWidth,
                    behavior: "smooth",
                  });
                }
              }}
            >
              <StorefrontIcon name="arrow" />
            </button>

            <div className="home-category-viewport">
              <div className="home-category-track">
                {categoriesLoading ? (
                  <p className="home-state-message">
                    Đang tải danh mục...
                  </p>
                ) : categoriesError ? (
                  <p className="home-state-message" role="alert">
                    {categoriesError}
                  </p>
                ) : categories.length === 0 ? (
                  <p className="home-state-message">
                    Chưa có danh mục sản phẩm.
                  </p>
                ) : (
                  categories
                    .filter((category) => !hiddenCategorySlugs.has(category.slug))
                    .map((category, index) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${encodeURIComponent(category.slug)}`}
                        className="home-category-card"
                      >
                        {categoryImageMap[category.slug] ? (
                          <img
                            src={categoryImageMap[category.slug]}
                            alt={category.name}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="home-category-image-placeholder"
                            role="img"
                            aria-label={category.name}
                          >
                            <span>{category.name}</span>
                          </div>
                        )}

                        <div className="home-category-overlay" />

                        <div className="home-category-content">
                          <span className="home-category-index">
                            CATEGORY / {String(index + 1).padStart(2, "0")}
                          </span>

                          <h3>{category.name}</h3>

                          <p>
                            {category.description ||
                              "Khám phá các sản phẩm trong danh mục."}
                          </p>

                          <span className="home-category-cta">
                            XEM DANH MỤC
                            <StorefrontIcon name="arrow" />
                          </span>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </div>

            <button
              type="button"
              className="home-category-nav home-category-nav-next"
              aria-label="Danh mục tiếp theo"
              onClick={() => {
                const track = document.querySelector(
                  ".home-category-track",
                );

                if (track) {
                  track.scrollBy({
                    left: track.clientWidth,
                    behavior: "smooth",
                  });
                }
              }}
            >
              <StorefrontIcon name="arrow" />
            </button>
          </div>

        </section>

        {/* Featured Products */}
        <section className="home-featured-section">
          <div className="home-section home-featured">
            <div className="home-section-heading">
              <div>
                <p className="home-eyebrow">THE PRODUCT EDIT</p>
                <h2>ĐƯỢC CHỌN CHO BẠN</h2>
                <p className="home-section-description">
                  Khám phá các sản phẩm đang có trong cửa hàng.
                </p>
              </div>

              <Link to="/products" className="home-text-link">
                XEM TẤT CẢ
                <StorefrontIcon name="arrow" />
              </Link>
            </div>

            <div className="home-product-grid">
              {productsLoading ? (
                <p className="home-state-message">
                  Đang tải sản phẩm...
                </p>
              ) : productsError ? (
                <p className="home-state-message" role="alert">
                  {productsError}
                </p>
              ) : products.length === 0 ? (
                <p className="home-state-message">
                  Hiện chưa có sản phẩm để hiển thị.
                </p>
              ) : (
                products.slice(0, 4).map((product) => {
                  const price = getProductPrice(product);

                  return (
                    <article
                      key={product.id}
                      className="home-product-card"
                    >
                      <Link
                        to={`/products/${product.slug}`}
                        className="home-product-link"
                      >
                        <div className="home-product-image">
                          <ProductImage product={product} />

                          <span className="home-product-view">
                            XEM CHI TIẾT
                            <StorefrontIcon name="arrow" />
                          </span>
                        </div>

                        <div className="home-product-info">
                          <p className="home-product-category">
                            {product.category.name}
                          </p>

                          <h3>{product.name}</h3>

                          <p className="home-product-price">
                            {price === null
                              ? "Tạm hết hàng"
                              : formatPrice(price)}
                          </p>
                        </div>
                      </Link>
                    </article>
                  );
                })
              )}
            </div>

            <div className="home-featured-footer">
              <p>YOUR NEXT EVERYDAY FAVORITE.</p>

              <Link
                to="/products"
                className="home-button home-button-outline"
              >
                KHÁM PHÁ TẤT CẢ SẢN PHẨM
                <StorefrontIcon name="arrow" />
              </Link>
            </div>
          </div>
        </section>

        {/* Brand Campaign */}
        <section className="home-brand-section">
          <div className="home-brand-image">
            <img
              src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=90"
              alt="Phong cách thời trang thường ngày"
              loading="lazy"
            />
          </div>

          <div className="home-brand-content">
            <p className="home-eyebrow">MORE THAN DENIM</p>

            <h2>
              MẶC CHẤT RIÊNG.
              <br />
              SỐNG CHẤT MÌNH.
            </h2>

            <p>
              IconDenim dành cho những người tự tin với lựa chọn của mình.
              Khám phá những thiết kế phù hợp với nhịp sống và phong cách
              riêng của bạn.
            </p>

            <Link
              to="/products"
              className="home-button home-button-light"
            >
              TÌM SẢN PHẨM CỦA BẠN
              <StorefrontIcon name="arrow" />
            </Link>

            <span className="home-brand-signature">
              ICONDENIM — YOUR EVERYDAY STYLE
            </span>
          </div>
        </section>


        {/* Franchise Partnership */}
        <section
          className="home-franchise-section"
          aria-labelledby="home-franchise-title"
        >
          <div className="home-franchise-inner">
            <div className="home-franchise-media">
              <img
                src="https://images.unsplash.com/photo-1758599543157-bc1a94fec33c?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                alt="Đối tác bắt tay hợp tác kinh doanh"
                loading="lazy"
              />

              <div className="home-franchise-image-overlay" />

              <div className="home-franchise-image-caption">
                <span>ICONDENIM</span>
                <span>GROW TOGETHER / 01</span>
              </div>

              <div className="home-franchise-image-mark" aria-hidden="true">
                ID.
              </div>
            </div>

            <div className="home-franchise-content">
              <p className="home-eyebrow">
                ICONDENIM / PARTNERSHIP
              </p>

              <h2 id="home-franchise-title">
                CÙNG NHAU
                <br />
                <span>MỞ RỘNG</span>
                <br />
                HÀNH TRÌNH.
              </h2>

              <p className="home-franchise-description">
                Một thương hiệu phát triển mạnh mẽ hơn khi có những
                đối tác cùng chung tầm nhìn. Khám phá cơ hội đồng hành
                cùng IconDenim và phát triển mạng lưới kinh doanh của bạn.
              </p>

              <div className="home-franchise-divider" />

              <div className="home-franchise-benefits">
                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">01</span>
                  <div>
                    <h3>THEO DÕI HIỆU QUẢ</h3>
                    <p>
                      Theo dõi hoạt động và kết quả kinh doanh trên hệ thống.
                    </p>
                  </div>
                </div>

                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">02</span>
                  <div>
                    <h3>PHÁT TRIỂN MẠNG LƯỚI</h3>
                    <p>
                      Quản lý mạng lưới giới thiệu và theo dõi hoa hồng.
                    </p>
                  </div>
                </div>

                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">03</span>
                  <div>
                    <h3>ĐỒNG HÀNH CÙNG THƯƠNG HIỆU</h3>
                    <p>
                      Cùng IconDenim mở rộng kết nối và cơ hội phát triển.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/franchise/login"
                className="home-button home-button-dark home-franchise-cta"
              >
                DÀNH CHO ĐỐI TÁC
                <StorefrontIcon name="arrow" />
              </Link>

              <p className="home-franchise-note">
                ICONDENIM — BUILD YOUR NEXT CHAPTER
              </p>
            </div>
          </div>
        </section>


        {/* Final Shopping CTA */}
        <section className="home-newsletter">
          <p className="home-eyebrow">YOUR STYLE STARTS HERE</p>
          <h2>SẴN SÀNG KHÁM PHÁ?</h2>
          <p>
            Tìm kiếm sản phẩm yêu thích và chọn phong cách dành cho bạn.
          </p>

          <Link
            to="/products"
            className="home-button home-button-dark"
          >
            MUA SẮM NGAY
            <StorefrontIcon name="arrow" />
          </Link>
        </section>
      </main>

    </div>
  );
}

export default HomePage;

