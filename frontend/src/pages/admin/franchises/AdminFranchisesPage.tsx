
import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";

import {
  getAdminFranchiseById,
  getAdminFranchiseNetwork,
  getAdminFranchises,
  lockAdminFranchise,
  unlockAdminFranchise,
  updateAdminFranchiseStatus,
  type AdminFranchise,
  type AdminFranchiseNetwork,
  type AdminFranchiseStatus,
} from "../../../services/api/admin-franchise.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminFranchisesPage.css";

type AccountStatusFilter =
  | "ALL"
  | AdminFranchise["status"];

type FranchiseStatusFilter =
  | "ALL"
  | NonNullable<
    AdminFranchise["franchiseProfile"]
  >["status"];

type FranchiseDetailTab = "NETWORK" | "ACCOUNT";

function getAccountStatusLabel(
  status: AdminFranchise["status"],
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

function getFranchiseStatusLabel(
  status: NonNullable<
    AdminFranchise["franchiseProfile"]
  >["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "SUSPENDED":
      return "Tạm ngưng";
    case "LOCKED":
      return "Đã khóa";
    case "TERMINATED":
      return "Đã chấm dứt";
    default:
      return status;
  }
}

function getAccountStatusBadgeClass(
  status: AdminFranchise["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "admin-badge-active";
    case "LOCKED":
      return "admin-badge-danger";
    case "INACTIVE":
      return "admin-badge-neutral";
    default:
      return "admin-badge-neutral";
  }
}

function getFranchiseStatusBadgeClass(
  status: NonNullable<
    AdminFranchise["franchiseProfile"]
  >["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "admin-badge-active";
    case "SUSPENDED":
      return "admin-badge-warning";
    case "LOCKED":
      return "admin-badge-danger";
    case "TERMINATED":
      return "admin-badge-neutral";
    default:
      return "admin-badge-neutral";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getDetailTabLabel(tab: FranchiseDetailTab) {
  return tab === "NETWORK" ? "Mạng lưới" : "Tài khoản";
}

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

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
      ...Array.from(
        { length: 5 },
        (_, index) => totalPages - 4 + index,
      ),
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    "ellipsis-end",
    totalPages,
  ];
}

function AdminFranchisesPage() {
  const [franchises, setFranchises] = useState<
    AdminFranchise[]
  >([]);

  const [network, setNetwork] =
    useState<AdminFranchiseNetwork | null>(
      null,
    );

  const [selectedFranchise, setSelectedFranchise] =
    useState<AdminFranchise | null>(null);

  const [detailTab, setDetailTab] =
    useState<FranchiseDetailTab>("NETWORK");

  const [search, setSearch] = useState("");

  const [accountStatusFilter, setAccountStatusFilter] =
    useState<AccountStatusFilter>("ALL");

  const [
    franchiseStatusFilter,
    setFranchiseStatusFilter,
  ] = useState<FranchiseStatusFilter>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loadingFranchises, setLoadingFranchises] =
    useState(false);

  const [loadingNetwork, setLoadingNetwork] =
    useState(false);

  const [loadingFranchiseId, setLoadingFranchiseId] =
    useState<string | null>(null);

  const [changingStatus, setChangingStatus] =
    useState(false);

  const [changingFranchiseStatus, setChangingFranchiseStatus] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    const token = getAccessToken("ADMIN");

    if (!token) {
      setError("Không tìm thấy phiên đăng nhập.");
      return;
    }

    setLoadingFranchises(true);
    setError("");
    setSuccess("");

    try {
      setFranchises(await getAdminFranchises(token));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách Franchise.",
      );
    } finally {
      setLoadingFranchises(false);
    }
  }

  async function handleSelectFranchise(id: string) {
    const token = getAccessToken("ADMIN");

    if (!token) {
      setError("Không tìm thấy phiên đăng nhập.");
      return;
    }

    setLoadingFranchiseId(id);
    setLoadingNetwork(true);
    setError("");
    setSuccess("");

    try {
      const [franchise, networkData] = await Promise.all([
        getAdminFranchiseById(token, id),
        getAdminFranchiseNetwork(token, id),
      ]);

      setSelectedFranchise(franchise);
      setNetwork(networkData);
      setDetailTab("NETWORK");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin Franchise.",
      );
    } finally {
      setLoadingFranchiseId(null);
      setLoadingNetwork(false);
    }
  }

  function handleCloseDetail() {
    if (changingStatus || changingFranchiseStatus) {
      return;
    }

    setSelectedFranchise(null);
    setNetwork(null);
    setDetailTab("NETWORK");
    setError("");
    setSuccess("");
  }

  async function handleToggleAccountLock() {
    if (!selectedFranchise) {
      return;
    }

    if (
      selectedFranchise.status !== "ACTIVE" &&
      selectedFranchise.status !== "LOCKED"
    ) {
      setError(
        "Tài khoản này không thể thực hiện khóa/mở khóa.",
      );
      return;
    }

    const token = getAccessToken("ADMIN");

    if (!token) {
      setError("Không tìm thấy phiên đăng nhập.");
      return;
    }

    setChangingStatus(true);
    setError("");
    setSuccess("");

    try {
      const updatedFranchise =
        selectedFranchise.status === "ACTIVE"
          ? await lockAdminFranchise(
            token,
            selectedFranchise.id,
          )
          : await unlockAdminFranchise(
            token,
            selectedFranchise.id,
          );

      setSelectedFranchise(updatedFranchise);

      setFranchises((current) =>
        current.map((franchise) =>
          franchise.id === updatedFranchise.id
            ? updatedFranchise
            : franchise,
        ),
      );

      setSuccess(
        updatedFranchise.status === "LOCKED"
          ? "Đã khóa tài khoản."
          : "Đã mở khóa tài khoản.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái tài khoản.",
      );
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleChangeFranchiseStatus(
    status: AdminFranchiseStatus,
  ) {
    if (!selectedFranchise?.franchiseProfile) {
      setError(
        "Franchise chưa có hồ sơ để thay đổi trạng thái.",
      );
      return;
    }

    if (changingStatus || changingFranchiseStatus) {
      return;
    }

    const currentStatus =
      selectedFranchise.franchiseProfile.status;

    const allowedTransitions: Record<
      NonNullable<AdminFranchise["franchiseProfile"]>["status"],
      AdminFranchiseStatus[]
    > = {
      ACTIVE: ["SUSPENDED", "LOCKED"],
      SUSPENDED: ["ACTIVE"],
      LOCKED: [],
      TERMINATED: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      setError(
        "Không thể chuyển Franchise sang trạng thái này.",
      );
      return;
    }

    const statusLabels: Record<AdminFranchiseStatus, string> = {
      ACTIVE: "Đang hoạt động",
      SUSPENDED: "Tạm ngưng",
      LOCKED: "Khóa vĩnh viễn",
    };

    const permanentWarning =
      status === "LOCKED"
        ? "\n\nLưu ý: Khóa Franchise là vĩnh viễn và không thể khôi phục."
        : "";

    const confirmed = window.confirm(
      `Bạn có chắc muốn chuyển trạng thái Franchise sang "${statusLabels[status]}"?${permanentWarning}`,
    );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken("ADMIN");

    if (!token) {
      setError("Không tìm thấy phiên đăng nhập.");
      return;
    }

    setChangingFranchiseStatus(true);
    setError("");
    setSuccess("");

    try {
      const updatedFranchise =
        await updateAdminFranchiseStatus(
          token,
          selectedFranchise.id,
          status,
        );

      setSelectedFranchise(updatedFranchise);

      setFranchises((current) =>
        current.map((franchise) =>
          franchise.id === updatedFranchise.id
            ? updatedFranchise
            : franchise,
        ),
      );

      setSuccess(
        `Đã cập nhật trạng thái Franchise: ${statusLabels[status]}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái Franchise.",
      );
    } finally {
      setChangingFranchiseStatus(false);
    }
  }

  const filteredFranchises = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return franchises.filter((franchise) => {
      const franchiseCode =
        franchise.franchiseProfile?.franchiseCode ?? "";

      const matchesSearch =
        normalizedSearch === "" ||
        franchise.person.fullName
          .toLowerCase()
          .includes(normalizedSearch) ||
        franchise.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        franchise.phone
          .toLowerCase()
          .includes(normalizedSearch) ||
        franchiseCode
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesAccountStatus =
        accountStatusFilter === "ALL" ||
        franchise.status === accountStatusFilter;

      const matchesFranchiseStatus =
        franchiseStatusFilter === "ALL" ||
        franchise.franchiseProfile?.status ===
        franchiseStatusFilter;

      return (
        matchesSearch &&
        matchesAccountStatus &&
        matchesFranchiseStatus
      );
    });
  }, [
    franchises,
    search,
    accountStatusFilter,
    franchiseStatusFilter,
  ]);

  const totalFilteredFranchises =
    filteredFranchises.length;

  const totalPages = Math.ceil(
    totalFilteredFranchises / pageSize,
  );

  const firstRecord =
    totalFilteredFranchises === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const lastRecord = Math.min(
    page * pageSize,
    totalFilteredFranchises,
  );

  const paginatedFranchises = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return filteredFranchises.slice(
      startIndex,
      startIndex + pageSize,
    );
  }, [filteredFranchises, page, pageSize]);

  const paginationItems = useMemo(
    () => getPaginationItems(page, totalPages),
    [page, totalPages],
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    accountStatusFilter,
    franchiseStatusFilter,
  ]);

  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPage(1);
    } else if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters =
    search.trim() !== "" ||
    accountStatusFilter !== "ALL" ||
    franchiseStatusFilter !== "ALL";

  function handleClearFilters() {
    setSearch("");
    setAccountStatusFilter("ALL");
    setFranchiseStatusFilter("ALL");
    setPage(1);
  }

  const networkChildren = useMemo(() => {
    const children = new Map<
      string,
      AdminFranchiseNetwork["nodes"]
    >();

    if (!network) {
      return children;
    }

    for (const node of network.nodes) {
      const current =
        children.get(node.parentAccountId) ?? [];

      current.push(node);

      children.set(node.parentAccountId, current);
    }

    return children;
  }, [network]);

  function renderNetworkNodes(
    parentAccountId: string,
    depth = 0,
  ): ReactElement[] {
    const children =
      networkChildren.get(parentAccountId) ?? [];

    return children.flatMap((node) => [
      <div
        key={node.id}
        className="admin-franchise-network-node"
        style={{
          marginLeft: `${depth * 24}px`,
        }}
      >
        <div className="admin-franchise-network-node-main">
          <div>
            <strong>{node.fullName}</strong>

            <div className="admin-franchise-network-node-meta">
              <span>
                {node.platform === "FRANCHISE"
                  ? "Franchise"
                  : "Member"}
              </span>

              <span>
                Level {node.level}
              </span>

              <span>
                ID: {node.id}
              </span>
            </div>
          </div>
        </div>
      </div>,

      ...renderNetworkNodes(
        node.id,
        depth + 1,
      ),
    ]);
  }

  function renderFranchiseList() {
    return (
      <section className="admin-franchise-section">
        <div className="admin-franchise-section-header">
          <div>
            <h2>Danh sách Franchise</h2>

            <p className="admin-muted">
              Chọn một Franchise để mở màn hình
              quản lý chi tiết.
            </p>
          </div>

          <div className="admin-muted">
            {filteredFranchises.length} /{" "}
            {franchises.length} Franchise
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-franchise-toolbar">
            <div className="admin-franchise-search">
              <input
                className="admin-input admin-search"
                type="search"
                placeholder="Tìm họ tên, email, SĐT hoặc mã Franchise..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                aria-label="Tìm kiếm Franchise"
              />
            </div>

            <div className="admin-franchise-filter">
              <select
                className="admin-select admin-filter"
                value={accountStatusFilter}
                onChange={(event) =>
                  setAccountStatusFilter(
                    event.target.value as AccountStatusFilter,
                  )
                }
                aria-label="Lọc theo trạng thái tài khoản"
              >
                <option value="ALL">
                  Account: Tất cả
                </option>

                <option value="ACTIVE">
                  Account: Đang hoạt động
                </option>

                <option value="LOCKED">
                  Account: Đã khóa
                </option>

                <option value="INACTIVE">
                  Account: Không hoạt động
                </option>
              </select>
            </div>

            <div className="admin-franchise-filter">
              <select
                className="admin-select admin-filter"
                value={franchiseStatusFilter}
                onChange={(event) =>
                  setFranchiseStatusFilter(
                    event.target.value as FranchiseStatusFilter,
                  )
                }
                aria-label="Lọc theo trạng thái Franchise"
              >
                <option value="ALL">
                  Franchise: Tất cả
                </option>

                <option value="ACTIVE">
                  Franchise: Đang hoạt động
                </option>

                <option value="SUSPENDED">
                  Franchise: Tạm ngưng
                </option>

                <option value="LOCKED">
                  Franchise: Đã khóa
                </option>

                <option value="TERMINATED">
                  Franchise: Đã chấm dứt
                </option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleClearFilters}
              >
                Xóa lọc
              </button>
            )}
          </div>

          {loadingFranchises ? (
            <div className="admin-loading">
              Đang tải danh sách Franchise...
            </div>
          ) : franchises.length === 0 ? (
            <div className="admin-empty">
              <strong>
                Chưa có Franchise
              </strong>

              <p>
                Hệ thống hiện chưa có tài khoản
                Franchise.
              </p>
            </div>
          ) : filteredFranchises.length === 0 ? (
            <div className="admin-franchise-empty-filter">
              <strong>
                Không tìm thấy Franchise phù hợp
              </strong>

              <p className="admin-muted">
                Thử thay đổi từ khóa hoặc bộ lọc.
              </p>

              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleClearFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table admin-franchise-list-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Franchise Code</th>
                    <th>Account Status</th>
                    <th>Franchise Status</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedFranchises.map(
                    (franchise) => (
                      <tr key={franchise.id}>
                        <td>
                          <span className="admin-table-id">
                            {franchise.id}
                          </span>
                        </td>

                        <td className="admin-table-primary">
                          {franchise.person.fullName}
                        </td>

                        <td>
                          {franchise.email}
                        </td>

                        <td>
                          {franchise.phone}
                        </td>

                        <td>
                          {franchise.franchiseProfile
                            ?.franchiseCode ?? "—"}
                        </td>

                        <td>
                          <span
                            className={`admin-badge ${getAccountStatusBadgeClass(
                              franchise.status,
                            )}`}
                          >
                            {getAccountStatusLabel(
                              franchise.status,
                            )}
                          </span>
                        </td>

                        <td>
                          {franchise.franchiseProfile ? (
                            <span
                              className={`admin-badge ${getFranchiseStatusBadgeClass(
                                franchise.franchiseProfile.status,
                              )}`}
                            >
                              {getFranchiseStatusLabel(
                                franchise.franchiseProfile.status,
                              )}
                            </span>
                          ) : (
                            <span className="admin-badge admin-badge-neutral">
                              Chưa có hồ sơ
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="admin-table-actions">
                            <button
                              type="button"
                              className="admin-button admin-button-secondary admin-button-small"
                              onClick={() =>
                                void handleSelectFranchise(
                                  franchise.id,
                                )
                              }
                              disabled={
                                loadingFranchiseId !== null &&
                                loadingFranchiseId !== franchise.id
                              }
                            >
                              {loadingFranchiseId === franchise.id
                                ? "Đang tải..."
                                : "Xem / Quản lý"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loadingFranchises &&
            totalFilteredFranchises > 0 && (
              <div className="admin-inventory-pagination">
                <div className="admin-inventory-pagination-info">
                  <span>
                    Hiển thị{" "}
                    <strong>
                      {firstRecord}–{lastRecord}
                    </strong>
                    {" / "}
                    <strong>
                      {totalFilteredFranchises.toLocaleString(
                        "vi-VN",
                      )}
                    </strong>
                    {" Franchise"}
                  </span>
                </div>

                <select
                  className="admin-select admin-inventory-page-size"
                  aria-label="Số Franchise mỗi trang"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>

                <div
                  className="admin-inventory-pagination-actions"
                  aria-label="Phân trang danh sách Franchise"
                >
                  <button
                    type="button"
                    className="admin-inventory-pagination-button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
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
                          className="admin-inventory-pagination-ellipsis"
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
                        className={`admin-inventory-pagination-button ${item === page
                            ? "admin-inventory-pagination-button-active"
                            : ""
                          }`}
                        onClick={() => setPage(item)}
                        aria-current={
                          item === page ? "page" : undefined
                        }
                        aria-label={`Trang ${item}`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="admin-inventory-pagination-button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    aria-label="Trang sau"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
        </div>
      </section>
    );
  }

  function renderNetworkTab() {
    if (!network) {
      return (
        <section className="admin-franchise-section">
          <div className="admin-card">
            {loadingNetwork ? (
              <div className="admin-loading">
                Đang tải mạng lưới...
              </div>
            ) : (
              <div className="admin-empty">
                Chưa có dữ liệu mạng lưới.
              </div>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="admin-franchise-section">
        <div className="admin-franchise-section-header">
          <div>
            <h3>Mạng lưới Franchise</h3>

            <p className="admin-muted">
              Tuyến trực tiếp và toàn bộ tuyến dưới
              của Franchise đang được chọn.
            </p>
          </div>
        </div>

        <div className="admin-card admin-franchise-network-card">
          {loadingNetwork ? (
            <div className="admin-loading">
              Đang tải mạng lưới...
            </div>
          ) : (
            <>
              <div className="admin-franchise-network-header">
                <div>
                  <h3>
                    {network.root.fullName}
                  </h3>

                  <p className="admin-muted">
                    {network.root.franchiseCode ?? "—"}
                  </p>
                </div>
              </div>

              <div className="admin-franchise-network-stats">
                <div>
                  <span>Direct Downline</span>

                  <strong>
                    {formatNumber(
                      network.stats.directDownline,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Other Downline</span>

                  <strong>
                    {formatNumber(
                      network.stats.otherDownline,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total Downline</span>

                  <strong>
                    {formatNumber(
                      network.stats.totalDownline,
                    )}
                  </strong>
                </div>
              </div>

              {network.nodes.length === 0 ? (
                <div className="admin-empty">
                  Franchise này chưa có tuyến dưới.
                </div>
              ) : (
                <div className="admin-franchise-network-tree">
                  {renderNetworkNodes(network.root.id)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  function renderAccountTab() {
    if (!selectedFranchise) {
      return null;
    }

    return (
      <section className="admin-franchise-section">
        <div className="admin-franchise-section-header">
          <div>
            <h3>Quản lý tài khoản</h3>

            <p className="admin-muted">
              Xem thông tin cá nhân và quản lý trạng thái
              tài khoản đăng nhập, trạng thái Franchise.
            </p>
          </div>
        </div>

        <div className="admin-franchise-account-layout">
          <section className="admin-card">
            <h3>Thông tin Franchise</h3>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Franchise Code
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.franchiseProfile
                    ?.franchiseCode ?? "—"}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Franchise Status
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.franchiseProfile ? (
                    <span
                      className={`admin-badge ${getFranchiseStatusBadgeClass(
                        selectedFranchise.franchiseProfile.status,
                      )}`}
                    >
                      {getFranchiseStatusLabel(
                        selectedFranchise.franchiseProfile.status,
                      )}
                    </span>
                  ) : (
                    "Chưa có hồ sơ"
                  )}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Ngày tham gia
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.franchiseProfile
                    ? formatDate(
                      selectedFranchise.franchiseProfile.joinedAt,
                    )
                    : "—"}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Person ID
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.personId}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Account Status
                </span>

                <strong className="admin-detail-item-value">
                  <span
                    className={`admin-badge ${getAccountStatusBadgeClass(
                      selectedFranchise.status,
                    )}`}
                  >
                    {getAccountStatusLabel(
                      selectedFranchise.status,
                    )}
                  </span>
                </strong>
              </div>
            </div>
          </section>

          <section className="admin-card franchise-personal-info-card">
            <h3>Thông tin cá nhân</h3>

            <div className="admin-detail-grid franchise-personal-info-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Họ và tên
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.person.fullName || "—"}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Email
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.email || "—"}
                </strong>
              </div>

              <div className="admin-detail-item">
                <span className="admin-detail-item-label">
                  Số điện thoại
                </span>

                <strong className="admin-detail-item-value">
                  {selectedFranchise.phone || "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <h3>Trạng thái Franchise</h3>

            <p className="admin-muted">
              Trạng thái này quyết định quyền hoạt động,
              ghi nhận giới thiệu và hoa hồng của hồ sơ
              Franchise. Trạng thái Franchise độc lập với
              trạng thái tài khoản đăng nhập bên dưới.
            </p>

            <div className="admin-franchise-account-status-panel">
              <div>
                <span>Franchise Status</span>

                <strong>
                  {selectedFranchise.franchiseProfile ? (
                    <span
                      className={`admin-badge ${getFranchiseStatusBadgeClass(
                        selectedFranchise.franchiseProfile.status,
                      )}`}
                    >
                      {getFranchiseStatusLabel(
                        selectedFranchise.franchiseProfile.status,
                      )}
                    </span>
                  ) : (
                    "Chưa có hồ sơ"
                  )}
                </strong>
              </div>

              {selectedFranchise.franchiseProfile?.status ===
                "ACTIVE" && (
                  <div className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={() =>
                        void handleChangeFranchiseStatus(
                          "SUSPENDED",
                        )
                      }
                      disabled={
                        changingStatus ||
                        changingFranchiseStatus
                      }
                    >
                      Tạm ngưng Franchise
                    </button>

                    <button
                      type="button"
                      className="admin-button admin-button-danger"
                      onClick={() =>
                        void handleChangeFranchiseStatus(
                          "LOCKED",
                        )
                      }
                      disabled={
                        changingStatus ||
                        changingFranchiseStatus
                      }
                    >
                      Khóa Franchise vĩnh viễn
                    </button>
                  </div>
                )}

              {selectedFranchise.franchiseProfile?.status ===
                "SUSPENDED" && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() =>
                      void handleChangeFranchiseStatus("ACTIVE")
                    }
                    disabled={
                      changingStatus ||
                      changingFranchiseStatus
                    }
                  >
                    Kích hoạt lại Franchise
                  </button>
                )}
            </div>

            {changingFranchiseStatus && (
              <p className="admin-muted">
                Đang cập nhật trạng thái Franchise...
              </p>
            )}

            {selectedFranchise.franchiseProfile?.status ===
              "LOCKED" && (
                <p className="admin-muted">
                  Franchise đã bị khóa vĩnh viễn và không
                  thể khôi phục.
                </p>
              )}

            {selectedFranchise.franchiseProfile?.status ===
              "TERMINATED" && (
                <p className="admin-muted">
                  Franchise đã chấm dứt và không thể kích
                  hoạt lại.
                </p>
              )}
          </section>

          <section className="admin-card">
            <h3>Trạng thái tài khoản</h3>

            <p className="admin-muted">
              Đây là trạng thái tài khoản đăng nhập,
              không phải trạng thái Franchise Profile.
            </p>

            <div className="admin-franchise-account-status-panel">
              <div>
                <span>Account Status</span>

                <strong>
                  <span
                    className={`admin-badge ${getAccountStatusBadgeClass(
                      selectedFranchise.status,
                    )}`}
                  >
                    {getAccountStatusLabel(
                      selectedFranchise.status,
                    )}
                  </span>
                </strong>
              </div>

              {(selectedFranchise.status === "ACTIVE" ||
                selectedFranchise.status === "LOCKED") && (
                  <button
                    type="button"
                    className={
                      selectedFranchise.status === "ACTIVE"
                        ? "admin-button admin-button-danger"
                        : "admin-button admin-button-secondary"
                    }
                    onClick={() =>
                      void handleToggleAccountLock()
                    }
                    disabled={
                      changingStatus ||
                      changingFranchiseStatus
                    }
                  >
                    {changingStatus
                      ? "Đang xử lý..."
                      : selectedFranchise.status === "ACTIVE"
                        ? "Khóa tài khoản"
                        : "Mở khóa tài khoản"}
                  </button>
                )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderSelectedDetail() {
    if (!selectedFranchise) {
      return null;
    }

    return (
      <div className="admin-franchise-detail-page">
        <div className="admin-franchise-detail-topbar">
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={handleCloseDetail}
            disabled={
              changingStatus ||
              changingFranchiseStatus
            }
          >
            ← Quay lại danh sách
          </button>

          <div className="admin-franchise-detail-topbar-title">
            <span className="admin-muted">
              Quản lý Franchise
            </span>

            <strong>
              {selectedFranchise.person.fullName}
            </strong>
          </div>
        </div>

        <div className="admin-franchise-detail-navigation">
          <div className="admin-franchise-detail-navigation-main">
            <div>
              <span className="admin-muted">
                Franchise Code
              </span>

              <strong>
                {selectedFranchise.franchiseProfile
                  ?.franchiseCode ?? "—"}
              </strong>
            </div>

            <div className="admin-franchise-status-group">
              <span
                className={`admin-badge ${getAccountStatusBadgeClass(
                  selectedFranchise.status,
                )}`}
              >
                Account:{" "}
                {getAccountStatusLabel(
                  selectedFranchise.status,
                )}
              </span>

              {selectedFranchise.franchiseProfile && (
                <span
                  className={`admin-badge ${getFranchiseStatusBadgeClass(
                    selectedFranchise.franchiseProfile.status,
                  )}`}
                >
                  Franchise:{" "}
                  {getFranchiseStatusLabel(
                    selectedFranchise.franchiseProfile.status,
                  )}
                </span>
              )}
            </div>
          </div>

          <nav
            className="admin-franchise-detail-tabs"
            aria-label="Các mục chi tiết Franchise"
          >
            {(
              ["NETWORK", "ACCOUNT"] as FranchiseDetailTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                className={
                  detailTab === tab
                    ? "admin-franchise-detail-tab admin-franchise-detail-tab-active"
                    : "admin-franchise-detail-tab"
                }
                onClick={() => setDetailTab(tab)}
              >
                {getDetailTabLabel(tab)}
              </button>
            ))}
          </nav>
        </div>

        {detailTab === "NETWORK" && renderNetworkTab()}
        {detailTab === "ACCOUNT" && renderAccountTab()}
      </div>
    );
  }

  return (
    <div className="admin-page admin-franchise-page">
      {!selectedFranchise ? (
        <>
          <div className="admin-page-header">
            <div>
              <h1>Quản lý Franchise</h1>

              <p>
                Quản lý danh sách, mạng lưới và trạng thái
                tài khoản Franchise.
              </p>
            </div>

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => void loadInitialData()}
              disabled={loadingFranchises}
            >
              Làm mới dữ liệu
            </button>
          </div>

          {error && (
            <div className="admin-alert admin-alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="admin-alert admin-alert-success">
              {success}
            </div>
          )}

          {renderFranchiseList()}
        </>
      ) : (
        <>
          <div className="admin-page-header">
            <div>
              <h1>Quản lý Franchise</h1>

              <p>
                Đang quản lý Franchise:{" "}
                <strong>
                  {selectedFranchise.person.fullName}
                </strong>
              </p>
            </div>

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => void loadInitialData()}
              disabled={
                loadingFranchises ||
                changingStatus ||
                changingFranchiseStatus
              }
            >
              Làm mới dữ liệu
            </button>
          </div>

          {error && (
            <div className="admin-alert admin-alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="admin-alert admin-alert-success">
              {success}
            </div>
          )}

          {renderSelectedDetail()}
        </>
      )}
    </div>
  );
}

export default AdminFranchisesPage;
