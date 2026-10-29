import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link, useSearchParams } from "react-router-dom";

import StorefrontIcon from "../../../components/storefront/StorefrontIcon";

import {
  getCategories,

  type ProductCategory,
} from "../../../services/api/category.api";

import {
  getProducts,

  type StorefrontProduct,
} from "../../../services/api/product.api";

import "./ProductsPage.css";

import { API_BASE_URL } from "../../../services/api/api-config";

type SortOption = "default" | "price-asc" | "price-desc";

const PRODUCTS_PER_PAGE = 6;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä‘/g, "d")
    .replace(/Ä/g, "D")
    .toLocaleLowerCase("vi")
    .trim();
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getProductPrice(product: StorefrontProduct) {

  const variants = product.variants.filter(
    (variant) => Number.isFinite(Number(variant.price)),
  );

  if (variants.length === 0) {
    return null;
  }

  return Math.min(
    ...variants.map((variant) => Number(variant.price)),
  );

}

function getCompareAtPrice(
  product: StorefrontProduct,
  price: number | null,
) {
  if (price === null) {
    return null;
  }

  const prices = product.variants
    .map((variant) => Number(variant.compareAtPrice))
    .filter(
      (value) =>
        Number.isFinite(value) && value > price,
    );

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function getProductImage(product: StorefrontProduct) {

  const primaryImage = product.images.find(
    (image) => image.isPrimary,
  );

  const image = primaryImage ?? product.images[0];
  if (!image?.url) {
    return null;
  }

  if (/^https?:\/\//i.test(image.url)) {
    return image.url;
  }

  return `${API_BASE_URL}${image.url.startsWith("/") ? "" : "/"
    }${image.url}`;
}

function ProductsPage() {

  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const [products, setProducts] = useState<StorefrontProduct[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? "",
  );

  const [page, setPage] = useState(1);

  const [sortOption, setSortOption] =
    useState<SortOption>("default");

  const selectedCategory = searchParams.get("category") ?? "";

  const saleOnly = searchParams.get("sale") === "true";

  const searchKeyword = (searchParams.get("search") ?? "")
    .trim()
    .toLocaleLowerCase("vi");

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {

        const [categoryData, productData] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);

        if (cancelled) {
          return;
        }

        setCategories(categoryData);
        setProducts(productData);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u sáº£n pháº©m.",
        );

      } finally {
        if (!cancelled) {
          setLoading(false);
        }

      }

    }

    void loadData();
    return () => {
      cancelled = true;
    };

  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    selectedCategory,
    saleOnly,
    searchKeyword,
    sortOption,
  ]);

  const filteredProducts = useMemo(() => {

    const result = products.filter((product) => {
      if (
        selectedCategory &&
        product.category.slug !== selectedCategory
      ) {
        return false;
      }

      const price = getProductPrice(product);

      const compareAtPrice = getCompareAtPrice(product, price);
      if (saleOnly && compareAtPrice === null) {
        return false;
      }

      if (searchKeyword) {
        const searchTerms = normalizeSearchText(searchKeyword)
          .split(/\s+/)
          .filter(Boolean);

        const productText = normalizeSearchText(
          [
            product.name,
            product.slug,
            product.description ?? "",
            product.category.name,
          ].join(" "),
        );

        const matchesProduct = searchTerms.every(
          (term) => productText.includes(term),
        );

        const matchesVariant = product.variants.some(
          (variant) => {
            const variantText = normalizeSearchText(
              [
                variant.name ?? "",
                variant.sku,
              ].join(" "),
            );

            return searchTerms.every(
              (term) =>
                productText.includes(term) ||
                variantText.includes(term),
            );
          },
        );

        if (!matchesProduct && !matchesVariant) {
          return false;
        }
      }

      return true;
    });
    if (sortOption === "price-asc") {
      result.sort((a, b) => {
        return (
          (getProductPrice(a) ?? Infinity) -
          (getProductPrice(b) ?? Infinity)
        );

      });
    }

    if (sortOption === "price-desc") {
      result.sort((a, b) => {
        return (
          (getProductPrice(b) ?? -Infinity) -
          (getProductPrice(a) ?? -Infinity)
        );

      });
    }

    return result;
  }, [
    products,
    selectedCategory,
    saleOnly,
    searchKeyword,
    sortOption,
  ]);

  const totalPages = Math.ceil(
    filteredProducts.length / PRODUCTS_PER_PAGE,
  );

  const paginatedProducts = useMemo(() => {

    const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(
      startIndex,
      startIndex + PRODUCTS_PER_PAGE,
    );

  }, [filteredProducts, page]);

  const selectedCategoryData = categories.find(
    (category) => category.slug === selectedCategory,
  );

  const hasUnrecognizedCategory =
    Boolean(selectedCategory) && !selectedCategoryData;

  function updateFilter(
    key: "category" | "sale",
    value: string,
  ) {

    const nextParams = new URLSearchParams(searchParams);
    if (!value) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    setSearchParams(nextParams);
  }

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextParams = new URLSearchParams(searchParams);

    const keyword = searchValue.trim();
    if (keyword) {
      nextParams.set("search", keyword);
    } else {
      nextParams.delete("search");
    }

    setSearchParams(nextParams);
  }

  function clearFilters() {
    setSearchValue("");
    setSortOption("default");
    setSearchParams({});
  }

  return (
    <div className="products-page">
      <main>
        <section className="products-intro">
          <div className="products-breadcrumb">
            <Link to="/">TRANG CHá»¦</Link>
            <span>/</span>
            <span>Sáº¢N PHáº¨M</span>
          </div>

          <p className="products-eyebrow">
            ICONDENIM / EVERYDAY COLLECTION
          </p>
          <h1>
            {selectedCategoryData
              ? selectedCategoryData.name.toLocaleUpperCase("vi")
              : saleOnly
                ? "Sáº¢N PHáº¨M Æ¯U ÄÃƒI"
                : "KHÃM PHÃ Sáº¢N PHáº¨M"}
          </h1>
          <p className="products-intro-description">
            TÃ¬m kiáº¿m nhá»¯ng thiáº¿t káº¿ phÃ¹ há»£p vá»›i phong cÃ¡ch
            vÃ  nhá»‹p sá»‘ng má»—i ngÃ y cá»§a báº¡n.
          </p>
        </section>

        <section className="products-content">
          <div className="products-toolbar">
            <div className="products-category-filters">
              <button
                type="button"
                className={`products-filter-chip ${!selectedCategory ? "is-active" : ""
                  }`}
                onClick={() => updateFilter("category", "")}
              >
                Táº¤T Cáº¢
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`products-filter-chip ${selectedCategory === category.slug
                    ? "is-active"
                    : ""
                    }`}
                  onClick={() =>
                    updateFilter("category", category.slug)
                  }

                >
                  {category.name.toLocaleUpperCase("vi")}
                </button>
              ))}
              <button
                type="button"
                className={`products-filter-chip ${saleOnly ? "is-active" : ""
                  }`}
                onClick={() =>
                  updateFilter("sale", saleOnly ? "" : "true")
                }

              >
                Æ¯U ÄÃƒI
              </button>
            </div>

            <label className="products-sort">
              <span>Sáº®P Xáº¾P</span>
              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }

              >
                <option value="default">Máº·c Ä‘á»‹nh</option>
                <option value="price-asc">GiÃ¡ tÄƒng dáº§n</option>
                <option value="price-desc">GiÃ¡ giáº£m dáº§n</option>
              </select>
            </label>
          </div>

          <form
            className="products-search-form"
            onSubmit={handleSearchSubmit}
          >
            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(event.target.value)
              }

              placeholder="TÃ¬m tÃªn sáº£n pháº©m, mÃ u sáº¯c, mÃ£ sáº£n pháº©m..."
              aria-label="TÃ¬m kiáº¿m sáº£n pháº©m"
            />
            <button type="submit">
              <StorefrontIcon name="search" />
              <span>TÃŒM KIáº¾M</span>
            </button>
          </form>
          <div className="products-result-heading">
            <p>
              {loading
                ? "ÄANG Táº¢I Sáº¢N PHáº¨M..."
                : filteredProducts.length > 0
                  ? `HIá»‚N THá»Š ${(page - 1) * PRODUCTS_PER_PAGE + 1}â€“${Math.min(
                    page * PRODUCTS_PER_PAGE,
                    filteredProducts.length,
                  )} / ${filteredProducts.length} Sáº¢N PHáº¨M`
                  : "0 Sáº¢N PHáº¨M"}
            </p>
            {(selectedCategory || saleOnly || searchKeyword) && (
              <button
                type="button"
                className="products-clear-filters"
                onClick={clearFilters}
              >
                XÃ“A Bá»˜ Lá»ŒC
              </button>
            )}
          </div>

          {hasUnrecognizedCategory && (
            <p className="products-notice">
              Danh má»¥c nÃ y chÆ°a cÃ³ trong dá»¯ liá»‡u hiá»‡n táº¡i.
              Vui lÃ²ng chá»n Ão, Quáº§n hoáº·c Táº¥t cáº£.
            </p>
          )}
          {loading && (
            <div className="products-state">
              <div className="products-loading-spinner" />
              <p>Äang táº£i bá»™ sÆ°u táº­p...</p>
            </div>

          )}
          {!loading && error && (
            <div className="products-state products-state-error">
              <h2>KHÃ”NG THá»‚ Táº¢I Sáº¢N PHáº¨M</h2>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                THá»¬ Láº I
              </button>
            </div>

          )}
          {!loading && !error && filteredProducts.length === 0 && (
            <div className="products-state">
              <h2>CHÆ¯A TÃŒM THáº¤Y Sáº¢N PHáº¨M</h2>
              <p>
                HÃ£y thá»­ tá»« khÃ³a khÃ¡c hoáº·c thay Ä‘á»•i bá»™ lá»c.
              </p>
              <button
                type="button"
                onClick={clearFilters}
              >
                XEM Táº¤T Cáº¢ Sáº¢N PHáº¨M
              </button>
            </div>

          )}
          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div className="products-grid">
                {paginatedProducts.map((product) => {

                  const price = getProductPrice(product);

                  const compareAtPrice = getCompareAtPrice(
                    product,
                    price,
                  );

                  const imageUrl = getProductImage(product);
                  return (
                    <article
                      key={product.id}
                      className="products-card"
                    >
                      <Link
                        to={`/products/${product.slug}`}
                        className="products-card-link"
                      >
                        <div className="products-card-image">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="products-image-placeholder">
                              <span>ICON</span>
                              <strong>DENIM</strong>
                              <small>YOUR EVERYDAY STYLE</small>
                            </div>

                          )}
                          {compareAtPrice !== null && price !== null && (
                            <span className="products-sale-badge">
                              -{Math.round(
                                ((compareAtPrice - price) /
                                  compareAtPrice) *
                                100,
                              )}%
                            </span>
                          )}
                          <span className="products-card-view">
                            KHÃM PHÃ
                            <StorefrontIcon name="arrow" />
                          </span>
                        </div>

                        <div className="products-card-info">
                          <p className="products-card-category">
                            {product.category.name.toLocaleUpperCase("vi")}
                          </p>
                          <h2>{product.name}</h2>
                          <div className="products-card-prices">
                            {price !== null ? (
                              <span className="products-card-price">
                                {formatPrice(price)}
                              </span>
                            ) : (
                              <span className="products-card-price">
                                LiÃªn há»‡
                              </span>
                            )}
                            {compareAtPrice !== null && (
                              <span className="products-card-compare-price">
                                {formatPrice(compareAtPrice)}
                              </span>
                            )}
                          </div>

                        </div>

                      </Link>
                    </article>
                  );

                })}
              </div>

              {totalPages > 1 && (
                <nav
                  className="products-pagination"
                  aria-label="PhÃ¢n trang sáº£n pháº©m"
                >
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                    aria-label="Trang trÆ°á»›c"
                  >
                    â†
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((pageNumber) => (

                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        pageNumber === page ? "is-active" : ""
                      }

                      aria-current={
                        pageNumber === page ? "page" : undefined
                      }

                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="Trang tiáº¿p theo"
                  >
                    â†’
                  </button>
                </nav>
              )}
            </>

          )}
        </section>

      </main>

    </div>

  );

}

export default ProductsPage;

