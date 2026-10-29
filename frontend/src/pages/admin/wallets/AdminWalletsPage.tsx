import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getAdminWalletByAccountId,
  getAdminWalletTransactions,
  getAdminWallets,
  type AdminWallet,
  type AdminWalletDetail,
  type AdminWalletTransaction,
  type AdminWalletPagination,
  type WalletPlatform,
  type WalletAccountStatus,
  type WalletSortBy,
  type WalletSortOrder,
} from "../../../services/api/admin-wallet.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminWalletsPage.css";

type WalletSort =
  | "newest"
  | "oldest"
  | "balance-desc"
  | "balance-asc";

const DEFAULT_PAGE_SIZE = 20;

function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN");
}

function getPlatformLabel(
  platform: AdminWallet["account"]["platform"],
) {
  return platform === "MEMBER"
    ? "Member"
    : "Franchise";
}

function getAccountStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Hoạt động",
    INACTIVE: "Không hoạt động",
    LOCKED: "Đã khóa",
  };

  return labels[status] ?? status;
}

function getAccountStatusClass(status: string) {
  const classes: Record<string, string> = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    LOCKED: "locked",
  };

  return classes[status] ?? "default";
}

function getTransactionTypeLabel(
  type: AdminWalletTransaction["type"],
) {
  const labels: Record<
    AdminWalletTransaction["type"],
    string
  > = {
    COMMISSION: "Hoa hồng",
    TOP_UP: "Nạp tiền",
    REFUND: "Hoàn tiền",
    ORDER_PAYMENT: "Thanh toán đơn hàng",
    WITHDRAWAL: "Rút tiền",
  };

  return labels[type];
}

function getWalletSortParams(
  sort: WalletSort,
): {
  sortBy: WalletSortBy;
  sortOrder: WalletSortOrder;
} {
  switch (sort) {
    case "oldest":
      return {
        sortBy: "createdAt",
        sortOrder: "asc",
      };

    case "balance-desc":
      return {
        sortBy: "balance",
        sortOrder: "desc",
      };

    case "balance-asc":
      return {
        sortBy: "balance",
        sortOrder: "asc",
      };

    default:
      return {
        sortBy: "createdAt",
        sortOrder: "desc",
      };
  }
}

function AdminWalletsPage() {
  const [wallets, setWallets] = useState<AdminWallet[]>(
    [],
  );

  const [pagination, setPagination] =
    useState<AdminWalletPagination>({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<10 | 20 | 50>(DEFAULT_PAGE_SIZE);

  const [selectedWallet, setSelectedWallet] =
    useState<AdminWalletDetail | null>(null);

  const [transactions, setTransactions] = useState<
    AdminWalletTransaction[]
  >([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [platformFilter, setPlatformFilter] =
    useState<"ALL" | WalletPlatform>("ALL");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | WalletAccountStatus>("ALL");

  const [sortBy, setSortBy] =
    useState<WalletSort>("newest");

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] =
    useState(false);
  const [error, setError] = useState("");

  const detailRequestId = useRef(0);

  const isDrawerOpen = Boolean(
    selectedWallet || loadingDetail,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        detailRequestId.current += 1;
        setSelectedWallet(null);
        setTransactions([]);
        setLoadingDetail(false);
        setError("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isDrawerOpen]);

  const loadWallets = useCallback(async () => {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const sortParams = getWalletSortParams(sortBy);

      const result = await getAdminWallets(
        accessToken,
        {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
          platform:
            platformFilter === "ALL"
              ? undefined
              : platformFilter,
          status:
            statusFilter === "ALL"
              ? undefined
              : statusFilter,
          ...sortParams,
        },
      );

      setWallets(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách ví.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    platformFilter,
    statusFilter,
    sortBy,
  ]);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  async function handleSelectWallet(
    accountId: string,
  ) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    const requestId = ++detailRequestId.current;

    try {
      setLoadingDetail(true);
      setSelectedWallet(null);
      setTransactions([]);
      setError("");

      const [wallet, walletTransactions] =
        await Promise.all([
          getAdminWalletByAccountId(
            accessToken,
            accountId,
          ),
          getAdminWalletTransactions(
            accessToken,
            accountId,
          ),
        ]);

      if (requestId !== detailRequestId.current) {
        return;
      }

      setSelectedWallet(wallet);
      setTransactions(walletTransactions);
    } catch (err) {
      if (requestId !== detailRequestId.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin ví.",
      );
    } finally {
      if (requestId === detailRequestId.current) {
        setLoadingDetail(false);
      }
    }
  }

  function handleCloseDetail() {
    detailRequestId.current += 1;
    setSelectedWallet(null);
    setTransactions([]);
    setLoadingDetail(false);
    setError("");
  }

  function handleResetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setPlatformFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("newest");
    setPage(1);
  }

  function handlePlatformChange(
    value: "ALL" | WalletPlatform,
  ) {
    setPlatformFilter(value);
    setPage(1);
  }

  function handleStatusChange(
    value: "ALL" | WalletAccountStatus,
  ) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSortChange(value: WalletSort) {
    setSortBy(value);
    setPage(1);
  }

  function handlePageSizeChange(value: number) {
    if (value !== 10 && value !== 20 && value !== 50) {
      return;
    }

    setPageSize(value);
    setPage(1);
  }

  const statistics = useMemo(() => {
    return {
      totalWallets: pagination.total,
      currentPageBalance: wallets.reduce(
        (total, wallet) =>
          total + Number(wallet.balance || 0),
        0,
      ),
      currentPageMemberWallets: wallets.filter(
        (wallet) =>
          wallet.account.platform === "MEMBER",
      ).length,
      currentPageFranchiseWallets: wallets.filter(
        (wallet) =>
          wallet.account.platform === "FRANCHISE",
      ).length,
    };
  }, [wallets, pagination.total]);

  const pageStart =
    pagination.total === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const pageEnd = Math.min(
    page * pageSize,
    pagination.total,
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    platformFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    sortBy !== "newest";

  return (
    <section className="admin-wallets-page">
      <div className="admin-page-header admin-wallets-header">
        <div>
          <h1>Ví tài khoản</h1>

          <p>
            Theo dõi số dư và thông tin ví của Member và
            Franchise.
          </p>
        </div>

        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={() => void loadWallets()}
          disabled={loading}
        >
          <span
            className={
              loading ? "admin-wallet-spin" : ""
            }
          >
            ↻
          </span>
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {error && !isDrawerOpen && (
        <div className="admin-wallet-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadWallets()}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="admin-wallet-stats">
        <div className="admin-wallet-stat-card">
          <div className="admin-wallet-stat-heading">
            <span>Tổng số ví</span>
            <span className="admin-wallet-stat-icon blue">
              W
            </span>
          </div>

          <strong>
            {statistics.totalWallets.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-wallet-stat-caption">
            Tổng số ví theo điều kiện lọc
          </span>
        </div>

        <div className="admin-wallet-stat-card">
          <div className="admin-wallet-stat-heading">
            <span>Tổng số dư trang hiện tại</span>
            <span className="admin-wallet-stat-icon green">
              ₫
            </span>
          </div>

          <strong>
            {formatMoney(statistics.currentPageBalance)}
          </strong>

          <span className="admin-wallet-stat-caption">
            Chỉ tính các ví đang hiển thị
          </span>
        </div>

        <div className="admin-wallet-stat-card">
          <div className="admin-wallet-stat-heading">
            <span>Ví Member trang hiện tại</span>
            <span className="admin-wallet-stat-icon purple">
              M
            </span>
          </div>

          <strong>
            {statistics.currentPageMemberWallets.toLocaleString(
              "vi-VN",
            )}
          </strong>

          <span className="admin-wallet-stat-caption">
            Số ví Member trên trang này
          </span>
        </div>

        <div className="admin-wallet-stat-card">
          <div className="admin-wallet-stat-heading">
            <span>Ví Franchise trang hiện tại</span>
            <span className="admin-wallet-stat-icon orange">
              F
            </span>
          </div>

          <strong>
            {statistics.currentPageFranchiseWallets.toLocaleString(
              "vi-VN",
            )}
          </strong>

          <span className="admin-wallet-stat-caption">
            Số ví Franchise trên trang này
          </span>
        </div>
      </div>

      <section className="admin-wallet-list-section">
        <div className="admin-wallet-section-heading">
          <div>
            <h2>Danh sách ví</h2>

            <p>
              Tìm kiếm, lọc và sắp xếp thông tin ví tài khoản.
            </p>
          </div>

          <span className="admin-wallet-result-count">
            {loading
              ? "Đang tải..."
              : `${pageStart.toLocaleString("vi-VN")}–${pageEnd.toLocaleString("vi-VN")} / ${pagination.total.toLocaleString("vi-VN")} ví`}
          </span>
        </div>

        <div className="admin-wallet-toolbar">
          <div className="admin-wallet-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm Wallet ID, Account ID, tên, email, SĐT..."
              aria-label="Tìm kiếm ví"
            />
          </div>

          <select
            value={platformFilter}
            onChange={(event) =>
              handlePlatformChange(
                event.target.value as
                | "ALL"
                | WalletPlatform,
              )
            }
            aria-label="Lọc theo nền tảng"
          >
            <option value="ALL">Tất cả nền tảng</option>
            <option value="MEMBER">Member</option>
            <option value="FRANCHISE">Franchise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              handleStatusChange(
                event.target.value as
                | "ALL"
                | WalletAccountStatus,
              )
            }
            aria-label="Lọc theo trạng thái tài khoản"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              handleSortChange(
                event.target.value as WalletSort,
              )
            }
            aria-label="Sắp xếp danh sách ví"
          >
            <option value="newest">Mới tạo gần đây</option>
            <option value="oldest">Tạo từ lâu nhất</option>
            <option value="balance-desc">
              Số dư cao nhất
            </option>
            <option value="balance-asc">
              Số dư thấp nhất
            </option>
          </select>

          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            Đặt lại
          </button>
        </div>

        {loading ? (
          <div className="admin-wallet-empty">
            Đang tải danh sách ví...
          </div>
        ) : wallets.length === 0 ? (
          <div className="admin-wallet-empty">
            {error
              ? "Không thể tải dữ liệu ví. Vui lòng thử lại."
              : "Không tìm thấy ví phù hợp."}
          </div>
        ) : (
          <>
            <div className="admin-wallet-table-wrapper">
              <table className="admin-wallet-table">
                <thead>
                  <tr>
                    <th>Wallet ID</th>
                    <th>Account ID</th>
                    <th>Người dùng</th>
                    <th>Nền tảng</th>
                    <th>Trạng thái tài khoản</th>
                    <th>Số dư</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {wallets.map((wallet) => (
                    <tr key={wallet.id}>
                      <td>
                        <strong>{wallet.id}</strong>
                      </td>

                      <td>{wallet.accountId}</td>

                      <td>
                        <div>
                          <strong>
                            {wallet.account.person.fullName}
                          </strong>
                        </div>

                        {wallet.account.person.email && (
                          <div className="admin-wallet-secondary">
                            {wallet.account.person.email}
                          </div>
                        )}

                        {wallet.account.person.phone && (
                          <div className="admin-wallet-secondary">
                            {wallet.account.person.phone}
                          </div>
                        )}
                      </td>

                      <td>
                        <span
                          className={`admin-wallet-platform ${wallet.account.platform.toLowerCase()}`}
                        >
                          {getPlatformLabel(
                            wallet.account.platform,
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-wallet-status ${getAccountStatusClass(
                            wallet.account.status,
                          )}`}
                        >
                          {getAccountStatusLabel(
                            wallet.account.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <strong className="admin-wallet-balance">
                          {formatMoney(wallet.balance)}
                        </strong>
                      </td>

                      <td>{formatDate(wallet.createdAt)}</td>

                      <td>
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() =>
                            void handleSelectWallet(
                              wallet.accountId,
                            )
                          }
                          disabled={loadingDetail}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-wallet-pagination">
              <div className="admin-wallet-pagination-info">
                Hiển thị {pageStart.toLocaleString("vi-VN")}–
                {pageEnd.toLocaleString("vi-VN")} trong{" "}
                {pagination.total.toLocaleString("vi-VN")} ví
              </div>

              <div className="admin-wallet-pagination-controls">
                <label>
                  <span>Số dòng:</span>

                  <select
                    value={pageSize}
                    onChange={(event) =>
                      handlePageSizeChange(
                        Number(event.target.value),
                      )
                    }
                    aria-label="Số ví mỗi trang"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  disabled={loading || page <= 1}
                >
                  Trước
                </button>

                <span className="admin-wallet-page-number">
                  Trang {page.toLocaleString("vi-VN")} /{" "}
                  {pagination.totalPages.toLocaleString("vi-VN")}
                </span>

                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        pagination.totalPages,
                        current + 1,
                      ),
                    )
                  }
                  disabled={
                    loading ||
                    page >= pagination.totalPages ||
                    pagination.totalPages === 0
                  }
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {isDrawerOpen && (
        <div className="admin-wallet-drawer-layer">
          <button
            type="button"
            className="admin-wallet-drawer-backdrop"
            onClick={handleCloseDetail}
            aria-label="Đóng chi tiết ví"
          />

          <aside
            className="admin-wallet-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-wallet-drawer-title"
          >
            <div className="admin-wallet-drawer-header">
              <div>
                <span className="admin-wallet-drawer-eyebrow">
                  QUẢN LÝ TÀI CHÍNH
                </span>

                <h2 id="admin-wallet-drawer-title">
                  Chi tiết ví
                </h2>

                <p>
                  {selectedWallet
                    ? `Account ID: ${selectedWallet.accountId}`
                    : "Đang tải thông tin tài khoản..."}
                </p>
              </div>

              <button
                type="button"
                className="admin-wallet-drawer-close"
                onClick={handleCloseDetail}
                aria-label="Đóng drawer"
              >
                ×
              </button>
            </div>

            {loadingDetail ? (
              <div className="admin-wallet-drawer-loading">
                <span className="admin-wallet-drawer-spinner" />

                <strong>Đang tải thông tin ví</strong>

                <p>
                  Đang lấy thông tin tài khoản và lịch sử giao dịch.
                </p>
              </div>
            ) : selectedWallet ? (
              <div className="admin-wallet-drawer-body">
                <section className="admin-wallet-drawer-balance">
                  <span>Số dư ví hiện tại</span>

                  <strong>
                    {formatMoney(selectedWallet.balance)}
                  </strong>

                  <div className="admin-wallet-drawer-balance-meta">
                    <span
                      className={`admin-wallet-platform ${selectedWallet.account.platform.toLowerCase()}`}
                    >
                      {getPlatformLabel(
                        selectedWallet.account.platform,
                      )}
                    </span>

                    <span
                      className={`admin-wallet-status ${getAccountStatusClass(
                        selectedWallet.account.status,
                      )}`}
                    >
                      {getAccountStatusLabel(
                        selectedWallet.account.status,
                      )}
                    </span>
                  </div>
                </section>

                <section className="admin-wallet-drawer-section">
                  <div className="admin-wallet-drawer-section-heading">
                    <h3>Thông tin ví</h3>
                  </div>

                  <div className="admin-wallet-drawer-info-grid">
                    <div className="admin-wallet-drawer-info-item">
                      <span>Wallet ID</span>
                      <strong>{selectedWallet.id}</strong>
                    </div>

                    <div className="admin-wallet-drawer-info-item">
                      <span>Account ID</span>
                      <strong>{selectedWallet.accountId}</strong>
                    </div>

                    <div className="admin-wallet-drawer-info-item">
                      <span>Ngày tạo</span>
                      <strong>
                        {formatDate(selectedWallet.createdAt)}
                      </strong>
                    </div>

                    <div className="admin-wallet-drawer-info-item">
                      <span>Referral Code</span>
                      <strong>
                        {selectedWallet.account.memberProfile
                          ?.referralCode ?? "—"}
                      </strong>
                    </div>

                    <div className="admin-wallet-drawer-info-item">
                      <span>Franchise Code</span>
                      <strong>
                        {selectedWallet.account.franchiseProfile
                          ?.franchiseCode ?? "—"}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="admin-wallet-drawer-section">
                  <div className="admin-wallet-drawer-section-heading">
                    <h3>Thông tin chủ ví</h3>
                  </div>

                  <div className="admin-wallet-drawer-owner">
                    <div className="admin-wallet-drawer-avatar">
                      {(
                        selectedWallet.account.person.fullName ||
                        "?"
                      )
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="admin-wallet-drawer-owner-content">
                      <strong>
                        {selectedWallet.account.person.fullName}
                      </strong>

                      <span>
                        {selectedWallet.account.person.email ??
                          "Chưa cập nhật email"}
                      </span>

                      <span>
                        {selectedWallet.account.person.phone ??
                          "Chưa cập nhật số điện thoại"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="admin-wallet-drawer-section admin-wallet-drawer-transactions">
                  <div className="admin-wallet-drawer-section-heading">
                    <div>
                      <h3>Lịch sử giao dịch</h3>

                      <p>
                        Các biến động số dư của ví.
                      </p>
                    </div>

                    <span className="admin-wallet-result-count">
                      {transactions.length} giao dịch
                    </span>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="admin-wallet-drawer-no-transactions">
                      <span aria-hidden="true">↔</span>

                      <strong>Chưa có giao dịch</strong>

                      <p>
                        Lịch sử giao dịch của ví sẽ hiển thị tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="admin-wallet-drawer-transaction-list">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="admin-wallet-drawer-transaction"
                        >
                          <div className="admin-wallet-drawer-transaction-main">
                            <strong>
                              {getTransactionTypeLabel(
                                transaction.type,
                              )}
                            </strong>

                            <span>
                              {transaction.description ??
                                transaction.id}
                            </span>

                            <time>
                              {formatDate(transaction.createdAt)}
                            </time>
                          </div>

                          <div className="admin-wallet-drawer-transaction-amount">
                            <strong>
                              {formatMoney(transaction.amount)}
                            </strong>

                            <span>
                              Sau giao dịch: {" "}
                              {formatMoney(
                                transaction.balanceAfter,
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="admin-wallet-drawer-loading">
                <strong>Chưa thể tải thông tin ví</strong>

                <p>
                  {error || "Vui lòng đóng cửa sổ và thử lại."}
                </p>

                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={handleCloseDetail}
                >
                  Đóng
                </button>
              </div>
            )}

            <div className="admin-wallet-drawer-footer">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleCloseDetail}
              >
                Đóng chi tiết
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default AdminWalletsPage;
