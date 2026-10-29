import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getAdminMemberById,
  getAdminMemberReferralTree,
  getAdminMembers,
  lockAdminMember,
  unlockAdminMember,
  type AdminMember,
  type AdminMemberReferralTree,
  type MemberStatus,
} from "../../../services/api/admin-member.api";

import {
  getAdminOrders,
  type AdminOrderListItem,
  type OrderStatus,
  type PaymentStatus,
} from "../../../services/api/admin-order.api";

import {
  getAdminWalletTransactions,
  type AdminWalletTransaction,
} from "../../../services/api/admin-wallet.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminMembersPage.css";

type MemberStatusFilter =
  | "ALL"
  | MemberStatus;

type PaginationItem =
  | number
  | "ellipsis-start"
  | "ellipsis-end";

function getMemberStatusLabel(
  status: MemberStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";

    case "LOCKED":
      return "Đã khóa";

    case "INACTIVE":
      return "Không hoạt động";

    default:
      return status;
  }
}

function getMemberStatusClass(
  status: MemberStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "is-active";

    case "LOCKED":
      return "is-locked";

    case "INACTIVE":
      return "is-inactive";

    default:
      return "";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  );
}

function formatCurrency(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${amount.toLocaleString("vi-VN")} ₫`;
}

function getOrderStatusLabel(
  status: OrderStatus,
) {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";

    case "CONFIRMED":
      return "Đã xác nhận";

    case "PROCESSING":
      return "Đang xử lý";

    case "SHIPPING":
      return "Đang giao";

    case "DELIVERED":
      return "Đã giao";

    case "CANCELLED":
      return "Đã hủy";

    case "RETURNED":
      return "Đã trả hàng";

    default:
      return status;
  }
}

function getPaymentStatusLabel(
  status: PaymentStatus,
) {
  switch (status) {
    case "UNPAID":
      return "Chưa thanh toán";

    case "PENDING":
      return "Đang chờ";

    case "PAID":
      return "Đã thanh toán";

    case "FAILED":
      return "Thất bại";

    case "REFUNDED":
      return "Đã hoàn tiền";

    default:
      return status;
  }
}

function getWalletTransactionTypeLabel(
  type: AdminWalletTransaction["type"],
) {
  switch (type) {
    case "COMMISSION":
      return "Hoa hồng";

    case "TOP_UP":
      return "Nạp tiền";

    case "REFUND":
      return "Hoàn tiền";

    case "ORDER_PAYMENT":
      return "Thanh toán đơn hàng";

    case "WITHDRAWAL":
      return "Rút tiền";

    default:
      return type;
  }
}

function getReferrerCode(
  member: AdminMember,
) {
  const source =
    member.referralReceived?.sourceAccount;

  if (!source) {
    return null;
  }

  if (
    member.referralReceived?.sourceType ===
    "MEMBER"
  ) {
    return (
      source.memberProfile?.referralCode ??
      null
    );
  }

  if (
    member.referralReceived?.sourceType ===
    "FRANCHISE"
  ) {
    return (
      source.franchiseProfile
        ?.franchiseCode ?? null
    );
  }

  return null;
}

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-end",
      totalPages,
    ];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

export default function AdminMembersPage() {
  const [members, setMembers] =
    useState<AdminMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<MemberStatusFilter>("ALL");

  const [pageSize, setPageSize] =
    useState(10);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedMemberId, setSelectedMemberId] =
    useState<string | null>(null);

  const [selectedMember, setSelectedMember] =
    useState<AdminMember | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [referralTree, setReferralTree] =
    useState<AdminMemberReferralTree | null>(
      null,
    );

  const [referralTreeLoading, setReferralTreeLoading] =
    useState(false);

  const [referralTreeError, setReferralTreeError] =
    useState<string | null>(null);

  const [recentOrders, setRecentOrders] =
    useState<AdminOrderListItem[]>([]);

  const [recentOrdersLoading, setRecentOrdersLoading] =
    useState(false);

  const [recentOrdersError, setRecentOrdersError] =
    useState<string | null>(null);

  const [recentWalletTransactions, setRecentWalletTransactions] =
    useState<AdminWalletTransaction[]>([]);

  const [recentWalletTransactionsLoading, setRecentWalletTransactionsLoading] =
    useState(false);

  const [recentWalletTransactionsError, setRecentWalletTransactionsError] =
    useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const detailRequestId = useRef(0);

  // =====================================================
  // Load Members
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      const accessToken = getAccessToken("ADMIN");

      if (
        typeof accessToken !== "string" ||
        accessToken.length === 0
      ) {
        if (!cancelled) {
          setError(
            "Không tìm thấy phiên đăng nhập.",
          );
          setLoading(false);
        }

        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }

        const data =
          await getAdminMembers(accessToken);

        if (cancelled) {
          return;
        }

        setMembers(data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách Member.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // Open Member Detail
  // =====================================================

  async function openMember(id: string) {
    const accessToken = getAccessToken("ADMIN");

    if (
      typeof accessToken !== "string" ||
      accessToken.length === 0
    ) {
      setError(
        "Không tìm thấy phiên đăng nhập.",
      );
      return;
    }

    // Xác định rõ kiểu string sau khi kiểm tra token.
    const validAccessToken: string = accessToken;

    const requestId = ++detailRequestId.current;

    setSelectedMemberId(id);
    setSelectedMember(null);
    setReferralTree(null);
    setReferralTreeError(null);
    setDetailLoading(true);
    setReferralTreeLoading(true);
    setRecentOrders([]);
    setRecentOrdersLoading(true);
    setRecentOrdersError(null);
    setRecentWalletTransactions([]);
    setRecentWalletTransactionsLoading(true);
    setRecentWalletTransactionsError(null);
    setError(null);

    // -----------------------------------------------------
    // Load Referral Tree
    // -----------------------------------------------------

    async function loadReferralTree() {
      try {
        const tree =
          await getAdminMemberReferralTree(
            validAccessToken,
            id,
          );

        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        setReferralTree(tree);
      } catch (err) {
        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        setReferralTreeError(
          err instanceof Error
            ? err.message
            : "Không thể tải cây giới thiệu.",
        );
      } finally {
        if (
          requestId === detailRequestId.current
        ) {
          setReferralTreeLoading(false);
        }
      }
    }

    void loadReferralTree();

    // -----------------------------------------------------
    // Load Recent Orders
    // -----------------------------------------------------

    async function loadRecentOrders() {
      try {
        const orders = await getAdminOrders(
          validAccessToken,
        );

        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        const memberOrders = orders
          .filter(
            (order) =>
              order.accountId === id &&
              order.account.platform === "MEMBER",
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);

        setRecentOrders(memberOrders);
      } catch (err) {
        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        setRecentOrdersError(
          err instanceof Error
            ? err.message
            : "Không thể tải đơn hàng gần đây.",
        );
      } finally {
        if (
          requestId === detailRequestId.current
        ) {
          setRecentOrdersLoading(false);
        }
      }
    }

    void loadRecentOrders();

    // -----------------------------------------------------
    // Load Recent Wallet Transactions
    // -----------------------------------------------------

    async function loadRecentWalletTransactions() {
      try {
        const transactions =
          await getAdminWalletTransactions(
            validAccessToken,
            id,
          );

        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        const latestTransactions = [...transactions]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);

        setRecentWalletTransactions(
          latestTransactions,
        );
      } catch (err) {
        if (
          requestId !== detailRequestId.current
        ) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Không thể tải giao dịch ví.";

        // Member chưa có ví không làm hỏng chi tiết Member.
        if (message !== "WALLET_NOT_FOUND") {
          setRecentWalletTransactionsError(
            message,
          );
        }
      } finally {
        if (
          requestId === detailRequestId.current
        ) {
          setRecentWalletTransactionsLoading(false);
        }
      }
    }

    void loadRecentWalletTransactions();

    // -----------------------------------------------------
    // Load Member Detail
    // -----------------------------------------------------

    try {
      const member =
        await getAdminMemberById(
          validAccessToken,
          id,
        );

      if (
        requestId !== detailRequestId.current
      ) {
        return;
      }

      setSelectedMember(member);
    } catch (err) {
      if (
        requestId !== detailRequestId.current
      ) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin Member.",
      );

      setSelectedMemberId(null);
      setSelectedMember(null);
      setReferralTree(null);
      setReferralTreeError(null);
      setReferralTreeLoading(false);
      setRecentOrders([]);
      setRecentOrdersError(null);
      setRecentOrdersLoading(false);
      setRecentWalletTransactions([]);
      setRecentWalletTransactionsError(null);
      setRecentWalletTransactionsLoading(false);
    } finally {
      if (
        requestId === detailRequestId.current
      ) {
        setDetailLoading(false);
      }
    }
  }

  // =====================================================
  // Close Drawer
  // =====================================================

  function closeDrawer() {
    if (actionLoading) {
      return;
    }

    // Vô hiệu hóa những yêu cầu chi tiết còn đang chạy.
    detailRequestId.current += 1;

    setSelectedMemberId(null);
    setSelectedMember(null);
    setReferralTree(null);
    setReferralTreeError(null);
    setReferralTreeLoading(false);
    setRecentOrders([]);
    setRecentOrdersError(null);
    setRecentOrdersLoading(false);
    setRecentWalletTransactions([]);
    setRecentWalletTransactionsError(null);
    setRecentWalletTransactionsLoading(false);
    setDetailLoading(false);
  }

  // =====================================================
  // Filter Members
  // =====================================================

  const filteredMembers = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !keyword ||
        member.person.fullName
          .toLowerCase()
          .includes(keyword) ||
        (member.email ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (member.phone ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (
          member.memberProfile
            ?.referralCode ?? ""
        )
          .toLowerCase()
          .includes(keyword) ||
        (
          getReferrerCode(member) ?? ""
        )
          .toLowerCase()
          .includes(keyword) ||
        member.id.includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        member.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    members,
    search,
    statusFilter,
  ]);

  // =====================================================
  // Pagination
  // =====================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredMembers.length / pageSize,
    ),
  );

  const firstRecord =
    filteredMembers.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const lastRecord = Math.min(
    currentPage * pageSize,
    filteredMembers.length,
  );

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const pageMembers = useMemo(() => {
    const startIndex =
      (currentPage - 1) * pageSize;

    return filteredMembers.slice(
      startIndex,
      startIndex + pageSize,
    );
  }, [
    filteredMembers,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    setCurrentPage((current) =>
      Math.min(
        current,
        Math.max(
          1,
          Math.ceil(
            filteredMembers.length / pageSize,
          ),
        ),
      ),
    );
  }, [
    filteredMembers.length,
    pageSize,
  ]);

  // =====================================================
  // Statistics
  // =====================================================

  const stats = useMemo(() => {
    let active = 0;
    let locked = 0;
    let inactive = 0;

    for (const member of members) {
      if (member.status === "ACTIVE") {
        active += 1;
      }

      if (member.status === "LOCKED") {
        locked += 1;
      }

      if (member.status === "INACTIVE") {
        inactive += 1;
      }
    }

    return {
      total: members.length,
      active,
      locked,
      inactive,
    };
  }, [members]);

  // =====================================================
  // Lock / Unlock Member
  // =====================================================

  async function handleMemberLockUnlock(
    member: AdminMember,
  ) {
    if (
      actionLoading ||
      member.status === "INACTIVE"
    ) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (
      typeof accessToken !== "string" ||
      accessToken.length === 0
    ) {
      setError(
        "Không tìm thấy phiên đăng nhập.",
      );
      return;
    }

    // Token đã được kiểm tra là string trước khi gọi API.
    const validAccessToken: string = accessToken;

    try {
      setActionLoading(true);
      setError(null);

      const updated =
        member.status === "ACTIVE"
          ? await lockAdminMember(
            validAccessToken,
            member.id,
          )
          : await unlockAdminMember(
            validAccessToken,
            member.id,
          );

      setMembers((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      setSelectedMember((current) =>
        current?.id === updated.id
          ? updated
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái Member.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =====================================================
  // Clear Filters
  // =====================================================

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  }

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL";

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="admin-page admin-members-page">
      <div className="admin-page-header">
        <div>
          <h1>Quản lý thành viên MEMBER</h1>

          <p>
            Theo dõi tài khoản Member và quản lý
            trạng thái hoạt động.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {/* =================================================
        Statistics
      ================================================= */}

      <div className="admin-members-stats">
        <div className="admin-members-stat-card">
          <span className="admin-members-stat-label">
            Tổng Member
          </span>

          <strong>{stats.total}</strong>
        </div>

        <div className="admin-members-stat-card is-active">
          <span className="admin-members-stat-label">
            Đang hoạt động
          </span>

          <strong>{stats.active}</strong>
        </div>

        <div className="admin-members-stat-card is-locked">
          <span className="admin-members-stat-label">
            Đã khóa
          </span>

          <strong>{stats.locked}</strong>
        </div>

        <div className="admin-members-stat-card is-inactive">
          <span className="admin-members-stat-label">
            Không hoạt động
          </span>

          <strong>{stats.inactive}</strong>
        </div>
      </div>

      {/* =================================================
        Toolbar
      ================================================= */}

      <section className="admin-card admin-members-toolbar">
        <div className="admin-members-search">
          <span>⌕</span>

          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, email, SĐT, mã giới thiệu..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as MemberStatusFilter,
            );
            setCurrentPage(1);
          }}
          className="admin-members-status-filter"
        >
          <option value="ALL">
            Tất cả trạng thái
          </option>

          <option value="ACTIVE">
            Đang hoạt động
          </option>

          <option value="LOCKED">
            Đã khóa
          </option>

          <option value="INACTIVE">
            Không hoạt động
          </option>
        </select>

        {hasFilters && (
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={clearFilters}
          >
            Xóa bộ lọc
          </button>
        )}
      </section>

      {/* =================================================
        Member Table
      ================================================= */}

      <section className="admin-card admin-members-table-card">
        <div className="admin-card-header">
          <div>
            <h2>Danh sách Member</h2>

            <p>
              {filteredMembers.length} Member phù hợp
              với bộ lọc
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-members-empty">
            Đang tải danh sách Member...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="admin-members-empty">
            Không tìm thấy Member phù hợp.
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table admin-members-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {pageMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="admin-members-person-cell">
                          <strong>
                            {member.person.fullName}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span className="admin-members-table-email">
                          {member.email || "Chưa có email"}
                        </span>
                      </td>

                      <td>
                        <span className="admin-members-table-phone">
                          {member.phone || "Chưa có số điện thoại"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-members-row-actions">
                          <button
                            type="button"
                            className={`admin-button ${member.status === "ACTIVE"
                                ? "admin-button-secondary"
                                : "admin-button-primary"
                              }`}
                            onClick={() =>
                              void handleMemberLockUnlock(
                                member,
                              )
                            }
                            disabled={
                              actionLoading ||
                              member.status === "INACTIVE"
                            }
                          >
                            {member.status === "ACTIVE"
                              ? "Khóa"
                              : member.status === "LOCKED"
                                ? "Mở khóa"
                                : "Không khả dụng"}
                          </button>

                          <button
                            type="button"
                            className="admin-button admin-button-secondary admin-members-detail-button"
                            onClick={() =>
                              void openMember(member.id)
                            }
                          >
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
              Pagination
            ================================================= */}

            <div className="admin-pagination admin-members-pagination">
              {/* Thông tin bản ghi và số dòng mỗi trang */}
              <div className="admin-members-pagination-info products-pagination-info">
                <span>
                  Hiển thị{" "}
                  <strong>
                    {firstRecord}–{lastRecord}
                  </strong>
                  {" / "}
                  <strong>
                    {filteredMembers.length.toLocaleString("vi-VN")}
                  </strong>
                  {" thành viên"}
                </span>

                <select
                  className="products-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Số thành viên mỗi trang"
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>

              {/* Các nút chuyển trang */}
              {totalPages > 1 && (
                <div
                  className="products-pagination"
                  aria-label="Phân trang danh sách thành viên"
                >
                  <button
                    type="button"
                    className="products-pagination-button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((current) => current - 1)
                    }
                    aria-label="Trang trước"
                  >
                    ‹
                  </button>

                  {paginationItems.map((item, index) => {
                    if (
                      item === "ellipsis-start" ||
                      item === "ellipsis-end"
                    ) {
                      return (
                        <span
                          key={`${item}-${index}`}
                          className="products-pagination-ellipsis"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      );
                    }

                    return (
                      <button
                        key={item}
                        type="button"
                        className={`products-pagination-button ${item === currentPage
                            ? "products-pagination-button-active"
                            : ""
                          }`}
                        onClick={() => setCurrentPage(item)}
                        aria-current={
                          item === currentPage ? "page" : undefined
                        }
                        aria-label={`Trang ${item}`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="products-pagination-button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((current) => current + 1)
                    }
                    aria-label="Trang sau"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* =================================================
        Member Detail Drawer
      ================================================= */}

      {selectedMemberId && (
        <div
          className="admin-drawer-backdrop"
          onMouseDown={closeDrawer}
        >
          <aside
            className="admin-drawer admin-member-drawer"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="admin-drawer-header">
              <div>
                <span className="admin-drawer-eyebrow">
                  MEMBER ACCOUNT
                </span>

                <h2>
                  {selectedMember
                    ? selectedMember.person.fullName
                    : "Chi tiết Member"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-drawer-close"
                onClick={closeDrawer}
                disabled={actionLoading}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {detailLoading || !selectedMember ? (
              <div className="admin-drawer-body">
                <div className="admin-members-detail-loading">
                  Đang tải thông tin...
                </div>
              </div>
            ) : (
              <>
                <div className="admin-drawer-body">
                  {/* =================================================
                    Member Overview
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-overview">
                      <div className="admin-member-overview-identity">
                        <div className="admin-member-avatar">
                          {selectedMember.person.fullName
                            .trim()
                            .charAt(0)
                            .toUpperCase() || "M"}
                        </div>

                        <div className="admin-member-overview-main">
                          <span className="admin-member-overview-label">
                            MEMBER ID #{selectedMember.id}
                          </span>

                          <strong>
                            {selectedMember.person.fullName}
                          </strong>

                          <span className="admin-member-overview-code">
                            Mã giới thiệu:{" "}
                            {selectedMember.memberProfile
                              ?.referralCode ?? "—"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`admin-status-badge ${getMemberStatusClass(
                          selectedMember.status,
                        )}`}
                      >
                        {getMemberStatusLabel(
                          selectedMember.status,
                        )}
                      </span>
                    </div>

                    <div className="admin-member-contact-summary">
                      <div>
                        <span>Email</span>

                        <strong>
                          {selectedMember.email || "Chưa có email"}
                        </strong>
                      </div>

                      <div>
                        <span>Số điện thoại</span>

                        <strong>
                          {selectedMember.phone || "Chưa có số điện thoại"}
                        </strong>
                      </div>
                    </div>

                    <div className="admin-member-tree-stats">
                      <div className="admin-member-tree-stat">
                        <span>Cấp dưới trực tiếp</span>

                        <strong>
                          {referralTreeLoading
                            ? "—"
                            : referralTree?.directCount ?? "—"}
                        </strong>

                        <small>
                          Member được giới thiệu trực tiếp
                        </small>
                      </div>

                      <div className="admin-member-tree-stat is-total">
                        <span>Tổng hậu duệ</span>

                        <strong>
                          {referralTreeLoading
                            ? "—"
                            : referralTree?.totalDescendantCount ?? "—"}
                        </strong>

                        <small>
                          Bao gồm cấp trực tiếp và gián tiếp
                        </small>
                      </div>
                    </div>

                    {referralTreeError && (
                      <div className="admin-member-tree-error">
                        Không thể tải thống kê cây giới thiệu.
                        {" "}
                        {referralTreeError}
                      </div>
                    )}
                  </section>

                  {/* =================================================
                    Direct Referral Tree
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-detail-heading">
                      <h3>Cây giới thiệu</h3>

                      <span>
                        Hiển thị cấp dưới trực tiếp
                      </span>
                    </div>

                    <div className="admin-member-tree-root">
                      <div className="admin-member-tree-root-marker">
                        M
                      </div>

                      <div className="admin-member-tree-root-info">
                        <strong>
                          {selectedMember.person.fullName}
                        </strong>

                        <span>
                          Thành viên gốc · #{selectedMember.id}
                        </span>
                      </div>

                      <span className="admin-member-tree-root-badge">
                        Đang xem
                      </span>
                    </div>

                    <div className="admin-member-tree-children">
                      {referralTreeLoading ? (
                        <div className="admin-member-tree-state">
                          Đang tải danh sách cấp dưới...
                        </div>
                      ) : referralTreeError ? (
                        <div className="admin-member-tree-state is-error">
                          Chưa thể hiển thị cây giới thiệu.
                          Vui lòng thử mở lại chi tiết Member.
                        </div>
                      ) : referralTree?.directMembers.length ? (
                        <>
                          <div className="admin-member-tree-list-heading">
                            <span>Member trực tiếp</span>

                            <strong>
                              {referralTree.directCount}
                            </strong>
                          </div>

                          {referralTree.directMembers.map(
                            (child) => (
                              <div
                                className="admin-member-tree-member"
                                key={child.id}
                              >
                                <div className="admin-member-tree-connector" />

                                <div className="admin-member-tree-member-card">
                                  <div className="admin-member-tree-member-avatar">
                                    {child.fullName
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase() || "M"}
                                  </div>

                                  <div className="admin-member-tree-member-info">
                                    <strong>
                                      {child.fullName}
                                    </strong>

                                    <span>
                                      #{child.id}
                                      {" · "}
                                      {child.referralCode ?? "Chưa có mã"}
                                    </span>

                                    <small>
                                      {child.email || "Chưa có email"}
                                    </small>

                                    <small>
                                      Ngày ghi nhận:{" "}
                                      {formatDate(child.referredAt)}
                                    </small>
                                  </div>

                                  <span
                                    className={`admin-status-badge ${getMemberStatusClass(
                                      child.status,
                                    )}`}
                                  >
                                    {getMemberStatusLabel(
                                      child.status,
                                    )}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}

                          <div className="admin-member-tree-note">
                            Danh sách này chỉ hiển thị cấp trực tiếp.
                            Các cấp sâu hơn được tính trong tổng hậu duệ.
                          </div>
                        </>
                      ) : (
                        <div className="admin-member-tree-empty">
                          <strong>
                            Chưa có Member cấp dưới trực tiếp
                          </strong>

                          <span>
                            Danh sách sẽ xuất hiện khi Member này
                            giới thiệu thành viên khác.
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =================================================
                    Referrer Information
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-detail-heading">
                      <h3>Người giới thiệu</h3>

                      <span>Quan hệ trực tiếp</span>
                    </div>

                    {selectedMember.referralReceived
                      ?.sourceAccount ? (
                      <div className="admin-member-referral-card">
                        <div className="admin-member-referral-main">
                          <div>
                            <span>Người giới thiệu</span>

                            <strong>
                              {
                                selectedMember
                                  .referralReceived
                                  .sourceAccount
                                  .person.fullName
                              }
                            </strong>
                          </div>

                          <span className="admin-member-referral-platform">
                            {selectedMember.referralReceived.sourceType ===
                              "FRANCHISE"
                              ? "FRANCHISE"
                              : "MEMBER"}
                          </span>
                        </div>

                        <div className="admin-member-referral-grid">
                          <div>
                            <span>Account ID</span>

                            <strong>
                              #
                              {
                                selectedMember
                                  .referralReceived
                                  .sourceAccount.id
                              }
                            </strong>
                          </div>

                          <div>
                            <span>Mã giới thiệu</span>

                            <strong>
                              {getReferrerCode(
                                selectedMember,
                              ) ?? "—"}
                            </strong>
                          </div>

                          <div>
                            <span>Email</span>

                            <strong>
                              {selectedMember
                                .referralReceived
                                .sourceAccount.email ?? "—"}
                            </strong>
                          </div>

                          <div>
                            <span>Số điện thoại</span>

                            <strong>
                              {selectedMember
                                .referralReceived
                                .sourceAccount.phone ?? "—"}
                            </strong>
                          </div>

                          <div>
                            <span>Trạng thái</span>

                            <strong>
                              {getMemberStatusLabel(
                                selectedMember
                                  .referralReceived
                                  .sourceAccount.status,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Ngày ghi nhận</span>

                            <strong>
                              {formatDate(
                                selectedMember
                                  .referralReceived
                                  .createdAt,
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-member-no-referral">
                        <strong>
                          Không có người giới thiệu
                        </strong>

                        <span>
                          Tài khoản này không có quan hệ giới thiệu
                          trực tiếp được ghi nhận.
                        </span>
                      </div>
                    )}
                  </section>

                  {/* =================================================
                    Recent Orders
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-detail-heading">
                      <h3>Đơn hàng gần đây</h3>

                      <span>Tối đa 5 đơn hàng mới nhất</span>
                    </div>

                    {recentOrdersLoading ? (
                      <div className="admin-member-activity-state">
                        Đang tải đơn hàng gần đây...
                      </div>
                    ) : recentOrdersError ? (
                      <div className="admin-member-tree-error">
                        Không thể tải đơn hàng gần đây.
                        {" "}
                        {recentOrdersError}
                      </div>
                    ) : recentOrders.length === 0 ? (
                      <div className="admin-member-activity-empty">
                        <strong>Chưa có đơn hàng</strong>

                        <span>
                          Các đơn hàng của Member sẽ hiển thị tại đây.
                        </span>
                      </div>
                    ) : (
                      <div className="admin-member-activity-list">
                        {recentOrders.map((order) => (
                          <div
                            className="admin-member-order-card"
                            key={order.id}
                          >
                            <div className="admin-member-activity-top">
                              <strong>{order.orderNumber}</strong>

                              <strong>
                                {formatCurrency(order.totalAmount)}
                              </strong>
                            </div>

                            <div className="admin-member-activity-meta">
                              <span>
                                Ngày tạo: {formatDate(order.createdAt)}
                              </span>

                              <span>
                                Trạng thái: {getOrderStatusLabel(order.status)}
                              </span>
                            </div>

                            <div className="admin-member-order-payment">
                              Thanh toán: {getPaymentStatusLabel(order.paymentStatus)}
                              {" · "}
                              {order.paymentMethod === "COD"
                                ? "COD"
                                : order.paymentMethod === "BANK_TRANSFER"
                                  ? "Chuyển khoản ngân hàng"
                                  : order.paymentMethod === "WALLET"
                                    ? "Ví"
                                    : order.paymentMethod}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* =================================================
                    Recent Wallet Transactions
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-detail-heading">
                      <h3>Giao dịch ví gần đây</h3>

                      <span>Chỉ xem · Tối đa 5 giao dịch</span>
                    </div>

                    {recentWalletTransactionsLoading ? (
                      <div className="admin-member-activity-state">
                        Đang tải giao dịch ví...
                      </div>
                    ) : recentWalletTransactionsError ? (
                      <div className="admin-member-tree-error">
                        Không thể tải giao dịch ví.
                        {" "}
                        {recentWalletTransactionsError}
                      </div>
                    ) : recentWalletTransactions.length === 0 ? (
                      <div className="admin-member-activity-empty">
                        <strong>Chưa có giao dịch ví</strong>

                        <span>
                          Ví chưa có giao dịch hoặc chưa được tạo cho tài khoản này.
                        </span>
                      </div>
                    ) : (
                      <div className="admin-member-activity-list">
                        {recentWalletTransactions.map((transaction) => (
                          <div
                            className="admin-member-transaction-card"
                            key={transaction.id}
                          >
                            <div className="admin-member-activity-top">
                              <strong>
                                {getWalletTransactionTypeLabel(transaction.type)}
                              </strong>

                              <strong>
                                {formatCurrency(transaction.amount)}
                              </strong>
                            </div>

                            <div className="admin-member-activity-meta">
                              <span>
                                Ngày giao dịch: {formatDate(transaction.createdAt)}
                              </span>

                              <span>
                                Số dư sau giao dịch: {formatCurrency(transaction.balanceAfter)}
                              </span>
                            </div>

                            {transaction.description && (
                              <p className="admin-member-transaction-description">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* =================================================
                    System Information
                  ================================================= */}

                  <section className="admin-member-detail-section">
                    <div className="admin-member-detail-heading">
                      <h3>Thông tin hệ thống</h3>
                    </div>

                    <div className="admin-member-system-grid">
                      <div>
                        <span>Ngày tạo</span>

                        <strong>
                          {formatDate(
                            selectedMember.createdAt,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Cập nhật lần cuối</span>

                        <strong>
                          {formatDate(
                            selectedMember.updatedAt,
                          )}
                        </strong>
                      </div>
                    </div>
                  </section>
                </div>

                {/* =================================================
                  Drawer Footer
                ================================================= */}

                <div className="admin-drawer-footer">
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    onClick={() =>
                      void handleMemberLockUnlock(
                        selectedMember,
                      )
                    }
                    disabled={
                      actionLoading ||
                      selectedMember.status === "INACTIVE"
                    }
                  >
                    {actionLoading
                      ? "Đang xử lý..."
                      : selectedMember.status === "ACTIVE"
                        ? "Khóa Member"
                        : selectedMember.status === "LOCKED"
                          ? "Mở khóa Member"
                          : "Không khả dụng"}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
