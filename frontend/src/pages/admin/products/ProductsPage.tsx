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
            : "Không thể tải dữ liệu sản phẩm.",
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
            <Link to="/">TRANG CHỦ</Link>
            <span>/</span>
            <span>SẢN PHẨM</span>
          </div>

          <p className="products-eyebrow">
            ICONDENIM / EVERYDAY COLLECTION
          </p>
          <h1>
            {selectedCategoryData
              ? selectedCategoryData.name.toLocaleUpperCase("vi")
              : saleOnly
                ? "SẢN PHẨM ƯU ĐÃI"
                : "KHÁM PHÁ SẢN PHẨM"}
          </h1>
          <p className="products-intro-description">
            Tìm kiếm những thiết kế phù hợp với phong cách
            và nhịp sống mỗi ngày của bạn.
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
                TẤT CẢ
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
                ƯU ĐÃI
              </button>
            </div>

            <label className="products-sort">
              <span>SẮP XẾP</span>
              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }

              >
                <option value="default">Mặc định</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
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

              placeholder="Tìm tên sản phẩm, màu sắc, mã sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <button type="submit">
              <StorefrontIcon name="search" />
              <span>TÌM KIẾM</span>
            </button>
          </form>
          <div className="products-result-heading">
            <p>
              {loading
                ? "ĐANG TẢI SẢN PHẨM..."
                : filteredProducts.length > 0
                  ? `HIỂN THỊ ${(page - 1) * PRODUCTS_PER_PAGE + 1}–${Math.min(
                    page * PRODUCTS_PER_PAGE,
                    filteredProducts.length,
                  )} / ${filteredProducts.length} SẢN PHẨM`
                  : "0 SẢN PHẨM"}
            </p>
            {(selectedCategory || saleOnly || searchKeyword) && (
              <button
                type="button"
                className="products-clear-filters"
                onClick={clearFilters}
              >
                XÓA BỘ LỌC
              </button>
            )}
          </div>

          {hasUnrecognizedCategory && (
            <p className="products-notice">
              Danh mục này chưa có trong dữ liệu hiện tại.
              Vui lòng chọn Áo, Quần hoặc Tất cả.
            </p>
          )}
          {loading && (
            <div className="products-state">
              <div className="products-loading-spinner" />
              <p>Đang tải bộ sưu tập...</p>
            </div>

          )}
          {!loading && error && (
            <div className="products-state products-state-error">
              <h2>KHÔNG THỂ TẢI SẢN PHẨM</h2>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                THỬ LẠI
              </button>
            </div>

          )}
          {!loading && !error && filteredProducts.length === 0 && (
            <div className="products-state">
              <h2>CHƯA TÌM THẤY SẢN PHẨM</h2>
              <p>
                Hãy thử từ khóa khác hoặc thay đổi bộ lọc.
              </p>
              <button
                type="button"
                onClick={clearFilters}
              >
                XEM TẤT CẢ SẢN PHẨM
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
                            KHÁM PHÁ
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
                                Liên hệ
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
                  aria-label="Phân trang sản phẩm"
                >
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                    aria-label="Trang trước"
                  >
                    ←
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
                    aria-label="Trang tiếp theo"
                  >
                    →
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

