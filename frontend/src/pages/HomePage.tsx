
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
      "Nhá»¯ng thiáº¿t káº¿ denim dá»… phá»‘i Ä‘á»“, Ä‘á»“ng hÃ nh cÃ¹ng phong cÃ¡ch riÃªng cá»§a báº¡n.",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Bá»™ sÆ°u táº­p quáº§n denim xanh",
    label: "EVERYDAY DENIM",
    cta: "KHÃM PHÃ Sáº¢N PHáº¨M",
  },
  {
    eyebrow: "FIND YOUR OWN STYLE",
    title: "YOUR STYLE.",
    highlight: "YOUR RULES.",
    description:
      "Tá»± tin lá»±a chá»n. Thoáº£i mÃ¡i thá»ƒ hiá»‡n. Táº¡o nÃªn phong cÃ¡ch cá»§a riÃªng mÃ¬nh.",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Chiáº¿n dá»‹ch thá»i trang phong cÃ¡ch hiá»‡n Ä‘áº¡i",
    label: "OWN YOUR STYLE",
    cta: "TÃŒM PHONG CÃCH Cá»¦A Báº N",
  },
  {
    eyebrow: "TIMELESS DENIM ESSENTIALS",
    title: "MADE FOR",
    highlight: "YOUR LIFE.",
    description:
      "Tá»« nhá»¯ng ngÃ y báº­n rá»™n Ä‘áº¿n nhá»¯ng cuá»™c háº¹n ngáº«u há»©ng, denim luÃ´n lÃ  lá»±a chá»n dá»… dÃ ng.",
    image:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=2000&q=90",
    imageAlt: "Phong cÃ¡ch trang phá»¥c denim thÆ°á»ng ngÃ y",
    label: "THE DENIM EDIT",
    cta: "XEM Bá»˜ SÆ¯U Táº¬P",
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
        aria-label={`Sáº£n pháº©m ${product.name} chÆ°a cÃ³ hÃ¬nh áº£nh`}
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
          setCategoriesError("KhÃ´ng thá»ƒ táº£i danh má»¥c sáº£n pháº©m.");
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
          setProductsError("KhÃ´ng thá»ƒ táº£i sáº£n pháº©m.");
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
          aria-label="Chiáº¿n dá»‹ch thá»i trang IconDenim"
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
              <span>ICONDENIM â€” EVERYDAY STYLE</span>
            </div>
          </div>

          <div className="home-hero-controls">
            <button
              type="button"
              className="home-hero-arrow home-hero-previous"
              onClick={showPreviousSlide}
              aria-label="Chiáº¿n dá»‹ch trÆ°á»›c"
            >
              <StorefrontIcon name="arrow" />
            </button>

            <div
              className="home-hero-dots"
              aria-label="Chá»n chiáº¿n dá»‹ch"
            >
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  className={`home-hero-dot ${index === activeSlide ? "is-active" : ""
                    }`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Xem chiáº¿n dá»‹ch ${index + 1}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              className="home-hero-arrow home-hero-next"
              onClick={showNextSlide}
              aria-label="Chiáº¿n dá»‹ch tiáº¿p theo"
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
          aria-label="Äiá»ƒm ná»•i báº­t cá»§a IconDenim"
        >
          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="arrow" />
            </span>
            <div>
              <h2>Dá»„ DÃ€NG Lá»°A CHá»ŒN</h2>
              <p>KhÃ¡m phÃ¡ sáº£n pháº©m theo phong cÃ¡ch</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="bag" />
            </span>
            <div>
              <h2>THÃ”NG TIN RÃ• RÃ€NG</h2>
              <p>GiÃ¡ vÃ  tÃ¬nh tráº¡ng hÃ ng theo dá»¯ liá»‡u hiá»‡n cÃ³</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon" aria-hidden="true">
              <StorefrontIcon name="arrow" />
            </span>
            <div>
              <h2>KHÃM PHÃ NHANH</h2>
              <p>Äi tháº³ng Ä‘áº¿n sáº£n pháº©m báº¡n quan tÃ¢m</p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="home-section home-categories">
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">SHOP BY CATEGORY</p>
              <h2>KHÃM PHÃ DANH Má»¤C</h2>
              <p className="home-section-description">
                TÃ¬m lá»±a chá»n phÃ¹ há»£p vá»›i phong cÃ¡ch háº±ng ngÃ y cá»§a báº¡n.
              </p>
            </div>

            <Link to="/products" className="home-text-link">
              Táº¤T Cáº¢ Sáº¢N PHáº¨M
              <StorefrontIcon name="arrow" />
            </Link>
          </div>


          <div className="home-category-carousel">
            <button
              type="button"
              className="home-category-nav home-category-nav-prev"
              aria-label="Danh má»¥c trÆ°á»›c"
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
                    Äang táº£i danh má»¥c...
                  </p>
                ) : categoriesError ? (
                  <p className="home-state-message" role="alert">
                    {categoriesError}
                  </p>
                ) : categories.length === 0 ? (
                  <p className="home-state-message">
                    ChÆ°a cÃ³ danh má»¥c sáº£n pháº©m.
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
                              "KhÃ¡m phÃ¡ cÃ¡c sáº£n pháº©m trong danh má»¥c."}
                          </p>

                          <span className="home-category-cta">
                            XEM DANH Má»¤C
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
              aria-label="Danh má»¥c tiáº¿p theo"
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
                <h2>ÄÆ¯á»¢C CHá»ŒN CHO Báº N</h2>
                <p className="home-section-description">
                  KhÃ¡m phÃ¡ cÃ¡c sáº£n pháº©m Ä‘ang cÃ³ trong cá»­a hÃ ng.
                </p>
              </div>

              <Link to="/products" className="home-text-link">
                XEM Táº¤T Cáº¢
                <StorefrontIcon name="arrow" />
              </Link>
            </div>

            <div className="home-product-grid">
              {productsLoading ? (
                <p className="home-state-message">
                  Äang táº£i sáº£n pháº©m...
                </p>
              ) : productsError ? (
                <p className="home-state-message" role="alert">
                  {productsError}
                </p>
              ) : products.length === 0 ? (
                <p className="home-state-message">
                  Hiá»‡n chÆ°a cÃ³ sáº£n pháº©m Ä‘á»ƒ hiá»ƒn thá»‹.
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
                            XEM CHI TIáº¾T
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
                              ? "Táº¡m háº¿t hÃ ng"
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
                KHÃM PHÃ Táº¤T Cáº¢ Sáº¢N PHáº¨M
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
              alt="Phong cÃ¡ch thá»i trang thÆ°á»ng ngÃ y"
              loading="lazy"
            />
          </div>

          <div className="home-brand-content">
            <p className="home-eyebrow">MORE THAN DENIM</p>

            <h2>
              Máº¶C CHáº¤T RIÃŠNG.
              <br />
              Sá»NG CHáº¤T MÃŒNH.
            </h2>

            <p>
              IconDenim dÃ nh cho nhá»¯ng ngÆ°á»i tá»± tin vá»›i lá»±a chá»n cá»§a mÃ¬nh.
              KhÃ¡m phÃ¡ nhá»¯ng thiáº¿t káº¿ phÃ¹ há»£p vá»›i nhá»‹p sá»‘ng vÃ  phong cÃ¡ch
              riÃªng cá»§a báº¡n.
            </p>

            <Link
              to="/products"
              className="home-button home-button-light"
            >
              TÃŒM Sáº¢N PHáº¨M Cá»¦A Báº N
              <StorefrontIcon name="arrow" />
            </Link>

            <span className="home-brand-signature">
              ICONDENIM â€” YOUR EVERYDAY STYLE
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
                alt="Äá»‘i tÃ¡c báº¯t tay há»£p tÃ¡c kinh doanh"
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
                CÃ™NG NHAU
                <br />
                <span>Má»ž Rá»˜NG</span>
                <br />
                HÃ€NH TRÃŒNH.
              </h2>

              <p className="home-franchise-description">
                Má»™t thÆ°Æ¡ng hiá»‡u phÃ¡t triá»ƒn máº¡nh máº½ hÆ¡n khi cÃ³ nhá»¯ng
                Ä‘á»‘i tÃ¡c cÃ¹ng chung táº§m nhÃ¬n. KhÃ¡m phÃ¡ cÆ¡ há»™i Ä‘á»“ng hÃ nh
                cÃ¹ng IconDenim vÃ  phÃ¡t triá»ƒn máº¡ng lÆ°á»›i kinh doanh cá»§a báº¡n.
              </p>

              <div className="home-franchise-divider" />

              <div className="home-franchise-benefits">
                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">01</span>
                  <div>
                    <h3>THEO DÃ•I HIá»†U QUáº¢</h3>
                    <p>
                      Theo dÃµi hoáº¡t Ä‘á»™ng vÃ  káº¿t quáº£ kinh doanh trÃªn há»‡ thá»‘ng.
                    </p>
                  </div>
                </div>

                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">02</span>
                  <div>
                    <h3>PHÃT TRIá»‚N Máº NG LÆ¯á»šI</h3>
                    <p>
                      Quáº£n lÃ½ máº¡ng lÆ°á»›i giá»›i thiá»‡u vÃ  theo dÃµi hoa há»“ng.
                    </p>
                  </div>
                </div>

                <div className="home-franchise-benefit">
                  <span className="home-franchise-number">03</span>
                  <div>
                    <h3>Äá»’NG HÃ€NH CÃ™NG THÆ¯Æ NG HIá»†U</h3>
                    <p>
                      CÃ¹ng IconDenim má»Ÿ rá»™ng káº¿t ná»‘i vÃ  cÆ¡ há»™i phÃ¡t triá»ƒn.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/franchise/login"
                className="home-button home-button-dark home-franchise-cta"
              >
                DÃ€NH CHO Äá»I TÃC
                <StorefrontIcon name="arrow" />
              </Link>

              <p className="home-franchise-note">
                ICONDENIM â€” BUILD YOUR NEXT CHAPTER
              </p>
            </div>
          </div>
        </section>


        {/* Final Shopping CTA */}
        <section className="home-newsletter">
          <p className="home-eyebrow">YOUR STYLE STARTS HERE</p>
          <h2>Sáº´N SÃ€NG KHÃM PHÃ?</h2>
          <p>
            TÃ¬m kiáº¿m sáº£n pháº©m yÃªu thÃ­ch vÃ  chá»n phong cÃ¡ch dÃ nh cho báº¡n.
          </p>

          <Link
            to="/products"
            className="home-button home-button-dark"
          >
            MUA Sáº®M NGAY
            <StorefrontIcon name="arrow" />
          </Link>
        </section>
      </main>

    </div>
  );
}

export default HomePage;

