
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken, getAuthRole } from "../../utils/auth";

import { getMemberProfile } from "../../services/api/auth.api";
import { getMemberCart } from "../../services/api/member-cart.api";
import StorefrontIcon from "./StorefrontIcon";
import {
  getCategories,
  type ProductCategory,
} from "../../services/api/category.api";

type CategoryMenuItem = {
  name: string;
  slugs: string[];
};

type CategoryMenuGroup = {
  title: string;
  slugs: string[];
  items: CategoryMenuItem[];
};

const categoryMenuGroups: CategoryMenuGroup[] = [
  {
    title: "ÁO NAM",
    slugs: ["ao", "ao-nam", "nhom-ao"],
    items: [
      { name: "Áo thun", slugs: ["ao-thun"] },
      { name: "Áo Polo", slugs: ["ao-polo"] },
      { name: "Áo sơ mi", slugs: ["ao-somi", "ao-so-mi"] },
      { name: "Áo khoác", slugs: ["ao-khoac"] },
      { name: "Áo nỉ và len", slugs: ["ao-ni", "ao-len"] },
      { name: "Hoodie", slugs: ["hoodies", "hoodie"] },
      {
        name: "Tank Top - Áo ba lỗ",
        slugs: ["tank-top-ao-ba-lo", "tank-top"],
      },
      { name: "Set đồ", slugs: ["set-quan-ao"] },
    ],
  },
  {
    title: "QUẦN NAM",
    slugs: ["quan", "quan-nam", "nhom-quan"],
    items: [
      { name: "Quần Jean", slugs: ["quan-jean", "jeans"] },
      { name: "Quần short", slugs: ["quan-short"] },
      {
        name: "Quần Kaki & Chino",
        slugs: ["quan-kaki", "quan-chino"],
      },
      {
        name: "Quần Jogger - Quần dài",
        slugs: ["jogger", "quan-jogger"],
      },
      { name: "Quần Tây", slugs: ["quan-tay"] },
      { name: "Quần Boxer", slugs: ["quan-boxer"] },
      { name: "Set đồ", slugs: ["set-quan-ao"] },
    ],
  },
  {
    title: "GIÀY & PHỤ KIỆN",
    slugs: ["phu-kien", "nhom-phu-kien"],
    items: [
      { name: "Giày & Dép", slugs: ["nhom-giay", "giay-dep"] },
      {
        name: "Balo, Túi & Ví",
        slugs: ["tui-vi-balo", "balo-tui-vi"],
      },
      { name: "Nón", slugs: ["non"] },
      { name: "Thắt lưng", slugs: ["that-lung"] },
      { name: "Vớ", slugs: ["vo"] },
      { name: "Mắt kính", slugs: ["mat-kinh"] },
    ],
  },
];

const comingSoonItems = ["DENIM", "OUTLET", "COLLECTION"];

export default function StorefrontHeader() {

  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const [memberName, setMemberName] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const result = await getCategories();

        if (isMounted) {
          setCategories(result);
        }
      } catch (error) {
        console.error("Không thể tải danh mục sản phẩm:", error);
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMemberState() {
      const accessToken = getAccessToken("MEMBER");
      const authRole = getAuthRole("MEMBER");

      if (!accessToken || authRole !== "MEMBER") {
        setMemberName("");
        setCartCount(0);
        return;
      }

      try {
        const profile = await getMemberProfile();

        const memberAccount = profile.accounts.find(
          (account) => account.platform === "MEMBER",
        );

        if (!memberAccount) {
          if (isMounted) {
            setMemberName("");
            setCartCount(0);
          }

          return;
        }

        const cart = await getMemberCart(memberAccount.id);

        if (isMounted) {
          setMemberName(profile.fullName);
          setCartCount(
            cart.items.reduce(
              (total, item) => total + item.quantity,
              0,
            ),
          );
        }
      } catch {
        if (isMounted) {
          setMemberName("");
          setCartCount(0);
        }
      }
    }

    function handleCartUpdated() {
      void loadMemberState();
    }

    void loadMemberState();

    window.addEventListener(
      "member-cart-updated",
      handleCartUpdated,
    );
    window.addEventListener("focus", handleCartUpdated);
    window.addEventListener("storage", handleCartUpdated);

    return () => {
      isMounted = false;

      window.removeEventListener(
        "member-cart-updated",
        handleCartUpdated,
      );
      window.removeEventListener("focus", handleCartUpdated);
      window.removeEventListener("storage", handleCartUpdated);
    };
  }, []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = searchValue.trim();

    if (!keyword) {
      return;
    }

    window.location.href = `/products?search=${encodeURIComponent(keyword)}`;
  }

  function handleCartClick() {
    closeMenus();

    const accessToken = getAccessToken("MEMBER");
    const authRole = getAuthRole("MEMBER");

    if (accessToken && authRole === "MEMBER") {
      navigate("/member/cart");
      return;
    }

    navigate("/login");
  }

  function closeMenus() {
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
  }

  function handleCategoryClick() {
    closeMenus();
  }

  function findCategory(slugs: string[]) {
    return categories.find((category) =>
      slugs.includes(category.slug.toLowerCase()),
    );
  }

  function renderCategoryItem(item: CategoryMenuItem) {
    const category = findCategory(item.slugs);

    if (!category) {
      return (
        <span
          key={item.name}
          className="home-mega-menu-subitem is-unavailable"
          title="Danh mục này chưa có trong cơ sở dữ liệu"
        >
          {item.name}
        </span>
      );
    }

    return (
      <Link
        key={category.id}
        to={`/products?category=${encodeURIComponent(category.slug)}`}
        className="home-mega-menu-subitem"
        onClick={handleCategoryClick}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div className="home-storefront-sticky">
      <div className="home-announcement">
        <p>PHONG CÁCH CỦA BẠN · CHẤT DENIM CỦA BẠN</p>
      </div>

      <header className="home-header">
        <div className="home-header-inner">
          <button
            type="button"
            className="home-icon-button home-mobile-menu-button"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setMobileMenuOpen((current) => !current);
              setMegaMenuOpen(false);
            }}
          >
            <StorefrontIcon
              name={mobileMenuOpen ? "close" : "menu"}
            />
          </button>

          <Link
            to="/"
            className="home-logo"
            aria-label="IconDenim - Trang chủ"
            onClick={closeMenus}
          >
            <span className="home-logo-name">ICONDENIM</span>
            <span className="home-logo-tagline">
              YOUR EVERYDAY STYLE
            </span>
          </Link>

          <nav
            className={`home-navigation ${mobileMenuOpen ? "is-open" : ""
              }`}
            aria-label="Điều hướng chính"
          >
            <div
              className={`home-mega-menu ${megaMenuOpen ? "is-open" : ""
                }`}
              onMouseEnter={() => setMegaMenuOpen(true)}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >

              <Link
                to="/products"
                className="home-navigation-link home-mega-menu-trigger"
                aria-expanded={megaMenuOpen}
                aria-haspopup="true"
                onClick={(event) => {
                  event.preventDefault();
                  setMegaMenuOpen((current) => !current);
                }}
              >
                SẢN PHẨM
                <span
                  className={`home-mega-menu-chevron ${megaMenuOpen ? "is-open" : ""
                    }`}
                  aria-hidden="true"
                />
              </Link>


              <div className="home-mega-menu-panel">
                <div className="home-mega-menu-content">
                  <section className="home-mega-menu-heading">
                    <span className="home-mega-menu-eyebrow">
                      KHÁM PHÁ ICONDENIM
                    </span>

                    <h2>Sản phẩm</h2>

                    <p>
                      Khám phá những lựa chọn phù hợp với phong cách
                      hằng ngày của bạn.
                    </p>

                    <Link
                      to="/products"
                      className="home-mega-menu-all-link"
                      onClick={handleCategoryClick}
                    >
                      Tất cả sản phẩm
                      <StorefrontIcon name="arrow" />
                    </Link>

                    <div className="home-mega-menu-quick-links">
                      <Link
                        to="/products"
                        onClick={handleCategoryClick}
                      >
                        Sản phẩm mới
                      </Link>

                      <Link
                        to="/products"
                        onClick={handleCategoryClick}
                      >
                        Bán chạy nhất
                      </Link>

                      <span className="home-coming-soon-item">
                        OUTLET
                        <span className="home-coming-soon-badge">
                          Coming soon
                        </span>
                      </span>
                    </div>
                  </section>

                  <div className="home-mega-menu-groups">
                    {categoryMenuGroups.map((group) => {
                      const parentCategory = findCategory(group.slugs);

                      return (
                        <section
                          key={group.title}
                          className="home-mega-menu-group"
                        >
                          {parentCategory ? (
                            <Link
                              to={`/products?category=${encodeURIComponent(parentCategory.slug)}`}
                              className="home-mega-menu-group-title"
                              onClick={handleCategoryClick}
                            >
                              {group.title}
                            </Link>
                          ) : (
                            <h3 className="home-mega-menu-group-title">
                              {group.title}
                            </h3>
                          )}

                          <div className="home-mega-menu-subitems">
                            {group.items.map(renderCategoryItem)}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/products"
              className="home-navigation-link"
              onClick={closeMenus}
            >
              HÀNG MỚI
            </Link>

            <Link
              to="/products"
              className="home-navigation-link"
              onClick={closeMenus}
            >
              HÀNG BÁN CHẠY
            </Link>


            {comingSoonItems.map((item) => (
              <Link
                key={item}
                to="/products"
                className="home-navigation-link home-coming-soon-item"
                title={`${item} sẽ được triển khai sau`}
                onClick={(event) => {
                  event.preventDefault();
                }}
              >
                {item}
                <span className="home-coming-soon-badge">
                  Coming soon
                </span>
              </Link>
            ))}

          </nav>

          <div className="home-header-actions">
            <button
              type="button"
              className={`home-icon-button home-search-button ${searchOpen ? "is-active" : ""
                }`}
              aria-label={
                searchOpen ? "Đóng tìm kiếm" : "Tìm kiếm sản phẩm"
              }
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((current) => !current)}
            >
              <StorefrontIcon
                name={searchOpen ? "close" : "search"}
              />
            </button>

            <Link
              to={memberName ? "/member" : "/login"}
              className={`home-icon-button home-account-button ${memberName ? "has-member-session" : ""
                }`}
              aria-label={
                memberName
                  ? `Tài khoản thành viên: ${memberName}`
                  : "Tài khoản"
              }
              onClick={closeMenus}
            >
              <StorefrontIcon name="user" />

              {memberName && (
                <span className="home-member-greeting">
                  Chào, {memberName}
                </span>
              )}
            </Link>

            <button
              type="button"
              className="home-icon-button home-bag-button"
              aria-label={
                cartCount > 0
                  ? `Giỏ hàng, ${cartCount} sản phẩm`
                  : "Giỏ hàng"
              }
              onClick={handleCartClick}
            >
              <StorefrontIcon name="bag" />

              {cartCount > 0 && (
                <span className="home-cart-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="home-search-panel">
            <form
              className="home-search-inner"
              onSubmit={handleSearchSubmit}
            >
              <StorefrontIcon name="search" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Bạn đang tìm sản phẩm nào?"
                aria-label="Tìm kiếm sản phẩm"
                autoFocus
              />

              <button type="submit" className="home-search-submit">
                TÌM KIẾM
              </button>
            </form>
          </div>
        )}
      </header>
    </div>
  );
}
