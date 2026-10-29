
import { useEffect, useMemo, useState } from "react";

import {
  approveAdminWithdrawal,
  completeAdminWithdrawal,
  getAdminWithdrawalById,
  getAdminWithdrawals,
  rejectAdminWithdrawal,
  type AdminWithdrawal,
  type AdminWithdrawalDetail,
} from "../../../services/api/admin-withdrawal.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminWithdrawalsPage.css";

type WithdrawalStatusFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

type WithdrawalPlatformFilter =
  | "ALL"
  | "MEMBER"
  | "FRANCHISE";

type WithdrawalSortOption =
  | "NEWEST"
  | "OLDEST"
  | "AMOUNT_DESC"
  | "AMOUNT_ASC";

function formatMoney(value: string | number) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function getPlatformLabel(
  platform: AdminWithdrawal["wallet"]["account"]["platform"],
) {
  return platform === "MEMBER" ? "Member" : "Franchise";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    COMPLETED: "Đã hoàn tất",
  };

  return labels[status] ?? status;
}

function getBankStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Hoạt động",
  };

  return labels[status] ?? status;
}

function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<
    AdminWithdrawal[]
  >([]);

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<AdminWithdrawalDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] =
    useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<WithdrawalStatusFilter>("ALL");
  const [platformFilter, setPlatformFilter] =
    useState<WithdrawalPlatformFilter>("ALL");
  const [sortOption, setSortOption] =
    useState<WithdrawalSortOption>("NEWEST");

  const statistics = useMemo(() => {
    return {
      total: withdrawals.length,
      pending: withdrawals.filter(
        (item) => item.status === "PENDING",
      ).length,
      approved: withdrawals.filter(
        (item) => item.status === "APPROVED",
      ).length,
      completed: withdrawals.filter(
        (item) => item.status === "COMPLETED",
      ).length,
    };
  }, [withdrawals]);

  const filteredWithdrawals = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase("vi");

    const result = withdrawals.filter((withdrawal) => {
      const fullName =
        withdrawal.wallet.account.person.fullName ?? "";

      const accountNumber =
        withdrawal.bankAccount?.accountNumber ?? "";

      const matchesSearch =
        !normalizedSearch ||
        withdrawal.id.toLocaleLowerCase("vi").includes(
          normalizedSearch,
        ) ||
        fullName.toLocaleLowerCase("vi").includes(
          normalizedSearch,
        ) ||
        accountNumber.toLocaleLowerCase("vi").includes(
          normalizedSearch,
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        withdrawal.status === statusFilter;

      const matchesPlatform =
        platformFilter === "ALL" ||
        withdrawal.wallet.account.platform ===
        platformFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlatform
      );
    });

    result.sort((a, b) => {
      switch (sortOption) {
        case "OLDEST":
          return (
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
          );

        case "AMOUNT_DESC":
          return Number(b.amount) - Number(a.amount);

        case "AMOUNT_ASC":
          return Number(a.amount) - Number(b.amount);

        case "NEWEST":
        default:
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
  }, [
    withdrawals,
    searchTerm,
    statusFilter,
    platformFilter,
    sortOption,
  ]);

  async function loadWithdrawals() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminWithdrawals(accessToken);

      setWithdrawals(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách yêu cầu rút tiền.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectWithdrawal(
    withdrawalId: string,
  ) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setLoadingDetail(true);
      setError("");
      setSelectedWithdrawal(null);
      setShowRejectForm(false);
      setRejectNote("");

      const data =
        await getAdminWithdrawalById(
          accessToken,
          withdrawalId,
        );

      setSelectedWithdrawal(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin yêu cầu rút tiền.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleCloseDetail() {
    setSelectedWithdrawal(null);
    setShowRejectForm(false);
    setRejectNote("");
    setError("");
  }

  async function reloadSelectedWithdrawal() {
    if (!selectedWithdrawal) return;

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    const data = await getAdminWithdrawalById(
      accessToken,
      selectedWithdrawal.id,
    );

    setSelectedWithdrawal(data);
  }

  async function handleApprove() {
    if (!selectedWithdrawal) return;

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      await approveAdminWithdrawal(
        accessToken,
        selectedWithdrawal.id,
      );

      await reloadSelectedWithdrawal();
      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể duyệt yêu cầu rút tiền.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedWithdrawal) return;

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      await rejectAdminWithdrawal(
        accessToken,
        selectedWithdrawal.id,
        rejectNote.trim() || undefined,
      );

      setShowRejectForm(false);
      setRejectNote("");

      await reloadSelectedWithdrawal();
      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể từ chối yêu cầu rút tiền.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleComplete() {
    if (!selectedWithdrawal) return;

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      await completeAdminWithdrawal(
        accessToken,
        selectedWithdrawal.id,
      );

      await reloadSelectedWithdrawal();
      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể hoàn tất yêu cầu rút tiền.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleResetFilters() {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPlatformFilter("ALL");
    setSortOption("NEWEST");
  }

  useEffect(() => {
    void loadWithdrawals();
  }, []);

  return (
    <section className="admin-withdrawals-page">
      <div className="admin-page-header">
        <div>
          <h1>Yêu cầu rút tiền</h1>

          <p>
            Theo dõi và xử lý các yêu cầu rút tiền của
            Member và Franchise.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-withdrawal-error">
          {error}
        </div>
      )}

      <div className="admin-withdrawal-statistics">
        <div className="admin-withdrawal-stat-card">
          <span className="admin-withdrawal-stat-label">
            Tổng yêu cầu
          </span>

          <strong className="admin-withdrawal-stat-value">
            {statistics.total.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-withdrawal-stat-description">
            Tất cả yêu cầu rút tiền
          </span>
        </div>

        <div className="admin-withdrawal-stat-card">
          <span className="admin-withdrawal-stat-label">
            Chờ duyệt
          </span>

          <strong className="admin-withdrawal-stat-value">
            {statistics.pending.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-withdrawal-stat-description">
            Cần Admin xử lý
          </span>
        </div>

        <div className="admin-withdrawal-stat-card">
          <span className="admin-withdrawal-stat-label">
            Đã duyệt
          </span>

          <strong className="admin-withdrawal-stat-value">
            {statistics.approved.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-withdrawal-stat-description">
            Chờ hoàn tất chuyển tiền
          </span>
        </div>

        <div className="admin-withdrawal-stat-card">
          <span className="admin-withdrawal-stat-label">
            Đã hoàn tất
          </span>

          <strong className="admin-withdrawal-stat-value">
            {statistics.completed.toLocaleString("vi-VN")}
          </strong>

          <span className="admin-withdrawal-stat-description">
            Đã xử lý thành công
          </span>
        </div>
      </div>

      <section className="admin-withdrawal-toolbar admin-card">
        <div className="admin-withdrawal-toolbar-header">
          <div>
            <h2>Danh sách yêu cầu</h2>

            <p>
              Tìm kiếm, lọc và sắp xếp các yêu cầu rút tiền.
            </p>
          </div>

          <span className="admin-withdrawal-result-count">
            {filteredWithdrawals.length.toLocaleString("vi-VN")}{" "}
            / {withdrawals.length.toLocaleString("vi-VN")} yêu cầu
          </span>
        </div>

        <div className="admin-withdrawal-filters">
          <div className="admin-withdrawal-search">
            <label htmlFor="withdrawal-search">
              Tìm kiếm
            </label>

            <input
              id="withdrawal-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Mã yêu cầu, tên người dùng, số tài khoản..."
            />
          </div>

          <div className="admin-withdrawal-filter">
            <label htmlFor="withdrawal-status-filter">
              Trạng thái
            </label>

            <select
              id="withdrawal-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as WithdrawalStatusFilter,
                )
              }
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="COMPLETED">Đã hoàn tất</option>
            </select>
          </div>

          <div className="admin-withdrawal-filter">
            <label htmlFor="withdrawal-platform-filter">
              Nền tảng
            </label>

            <select
              id="withdrawal-platform-filter"
              value={platformFilter}
              onChange={(event) =>
                setPlatformFilter(
                  event.target.value as WithdrawalPlatformFilter,
                )
              }
            >
              <option value="ALL">Tất cả nền tảng</option>
              <option value="MEMBER">Member</option>
              <option value="FRANCHISE">Franchise</option>
            </select>
          </div>

          <div className="admin-withdrawal-filter">
            <label htmlFor="withdrawal-sort">
              Sắp xếp
            </label>

            <select
              id="withdrawal-sort"
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value as WithdrawalSortOption,
                )
              }
            >
              <option value="NEWEST">Mới nhất trước</option>
              <option value="OLDEST">Cũ nhất trước</option>
              <option value="AMOUNT_DESC">
                Số tiền: cao đến thấp
              </option>
              <option value="AMOUNT_ASC">
                Số tiền: thấp đến cao
              </option>
            </select>
          </div>

          <button
            type="button"
            className="admin-button admin-button-secondary admin-withdrawal-reset-button"
            onClick={handleResetFilters}
          >
            Xóa bộ lọc
          </button>
        </div>
      </section>

      {loading ? (
        <div className="admin-withdrawal-empty">
          Đang tải danh sách yêu cầu rút tiền...
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="admin-withdrawal-empty">
          Chưa có yêu cầu rút tiền.
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="admin-withdrawal-empty">
          Không tìm thấy yêu cầu phù hợp với điều kiện lọc.
          <div>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={handleResetFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-withdrawal-table-wrapper">
          <table className="admin-withdrawal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Nền tảng</th>
                <th>Số tiền</th>
                <th>Ngân hàng nhận</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredWithdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>
                    <strong>{withdrawal.id}</strong>
                  </td>

                  <td>
                    <strong>
                      {
                        withdrawal.wallet.account.person
                          .fullName
                      }
                    </strong>
                  </td>

                  <td>
                    {getPlatformLabel(
                      withdrawal.wallet.account.platform,
                    )}
                  </td>

                  <td>
                    <strong>
                      {formatMoney(withdrawal.amount)}
                    </strong>
                  </td>

                  <td>
                    {withdrawal.bankAccount ? (
                      <>
                        <div>
                          {
                            withdrawal.bankAccount
                              .accountNumber
                          }
                        </div>

                        <div className="admin-withdrawal-secondary">
                          {getBankStatusLabel(
                            withdrawal.bankAccount.status,
                          )}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span
                      className={`admin-withdrawal-status admin-withdrawal-status-${withdrawal.status.toLowerCase()}`}
                    >
                      {getStatusLabel(withdrawal.status)}
                    </span>
                  </td>

                  <td>{formatDate(withdrawal.createdAt)}</td>

                  <td>
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={() =>
                        void handleSelectWithdrawal(
                          withdrawal.id,
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
      )}


      {loadingDetail && (
        <div
          className="admin-drawer-backdrop"
          onClick={handleCloseDetail}
        >
          <aside
            className="admin-drawer admin-withdrawal-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Đang tải chi tiết yêu cầu rút tiền"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer-header">
              <div>
                <h2>Chi tiết yêu cầu rút tiền</h2>
                <p>Đang tải thông tin yêu cầu...</p>
              </div>

              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleCloseDetail}
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            <div className="admin-withdrawal-drawer-body">
              <p className="admin-muted">
                Đang tải thông tin yêu cầu rút tiền...
              </p>
            </div>
          </aside>
        </div>
      )}

      {selectedWithdrawal && !loadingDetail && (
        <div
          className="admin-drawer-backdrop"
          onClick={handleCloseDetail}
        >
          <aside
            className="admin-drawer admin-withdrawal-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết yêu cầu rút tiền"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer-header">
              <div>
                <h2>Chi tiết yêu cầu rút tiền</h2>

                <p>
                  Withdrawal ID: {selectedWithdrawal.id}
                </p>
              </div>

              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleCloseDetail}
                disabled={processing}
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            <div className="admin-withdrawal-drawer-body">
              <div className="admin-withdrawal-detail-grid">
                <div>
                  <span className="admin-withdrawal-label">
                    Withdrawal ID
                  </span>

                  <strong>{selectedWithdrawal.id}</strong>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Wallet ID
                  </span>

                  <span>{selectedWithdrawal.walletId}</span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Người dùng
                  </span>

                  <strong>
                    {
                      selectedWithdrawal.wallet.account.person
                        .fullName
                    }
                  </strong>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Account ID
                  </span>

                  <span>
                    {selectedWithdrawal.wallet.account.id}
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Nền tảng
                  </span>

                  <span>
                    {getPlatformLabel(
                      selectedWithdrawal.wallet.account.platform,
                    )}
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Trạng thái tài khoản
                  </span>

                  <span>
                    {selectedWithdrawal.wallet.account.status}
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Email
                  </span>

                  <span>
                    {
                      selectedWithdrawal.wallet.account.person
                        .email ?? "—"
                    }
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Số điện thoại
                  </span>

                  <span>
                    {
                      selectedWithdrawal.wallet.account.person
                        .phone ?? "—"
                    }
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Số tiền rút
                  </span>

                  <strong>
                    {formatMoney(selectedWithdrawal.amount)}
                  </strong>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Trạng thái yêu cầu
                  </span>

                  <span
                    className={`admin-withdrawal-status admin-withdrawal-status-${selectedWithdrawal.status.toLowerCase()}`}
                  >
                    {getStatusLabel(selectedWithdrawal.status)}
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Ngày tạo
                  </span>

                  <span>
                    {formatDate(selectedWithdrawal.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="admin-withdrawal-label">
                    Cập nhật lần cuối
                  </span>

                  <span>
                    {formatDate(selectedWithdrawal.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="admin-withdrawal-bank">
                <h3>Tài khoản ngân hàng nhận tiền</h3>

                {selectedWithdrawal.bankAccount ? (
                  <div className="admin-withdrawal-bank-grid">
                    <div>
                      <span className="admin-withdrawal-label">
                        Bank Account ID
                      </span>

                      <span>
                        {selectedWithdrawal.bankAccount.id}
                      </span>
                    </div>

                    <div>
                      <span className="admin-withdrawal-label">
                        Số tài khoản
                      </span>

                      <strong>
                        {
                          selectedWithdrawal.bankAccount
                            .accountNumber
                        }
                      </strong>
                    </div>

                    <div>
                      <span className="admin-withdrawal-label">
                        Owner Account ID
                      </span>

                      <span>
                        {
                          selectedWithdrawal.bankAccount
                            .ownerAccountId ?? "—"
                        }
                      </span>
                    </div>

                    <div>
                      <span className="admin-withdrawal-label">
                        Owner Type
                      </span>

                      <span>
                        {selectedWithdrawal.bankAccount.ownerType}
                      </span>
                    </div>

                    {/* <div>
                      <span className="admin-withdrawal-label">
                        Số dư tài khoản ngân hàng
                      </span>

                      <strong>
                        {formatMoney(
                          selectedWithdrawal.bankAccount.balance,
                        )}
                      </strong>
                    </div> */}

                    <div>
                      <span className="admin-withdrawal-label">
                        Trạng thái
                      </span>

                      <span>
                        {getBankStatusLabel(
                          selectedWithdrawal.bankAccount.status,
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="admin-muted">
                    Yêu cầu chưa có tài khoản ngân hàng nhận tiền.
                  </p>
                )}
              </div>

              <div className="admin-withdrawal-note">
                <h3>Ghi chú</h3>

                <p>
                  {selectedWithdrawal.note ?? "Không có ghi chú."}
                </p>
              </div>

              <div className="admin-withdrawal-actions">
                {selectedWithdrawal.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      className="admin-button admin-button-primary"
                      disabled={processing}
                      onClick={() => void handleApprove()}
                    >
                      {processing
                        ? "Đang xử lý..."
                        : "Duyệt yêu cầu"}
                    </button>

                    <button
                      type="button"
                      className="admin-button admin-button-danger"
                      disabled={processing}
                      onClick={() =>
                        setShowRejectForm(!showRejectForm)
                      }
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {selectedWithdrawal.status === "APPROVED" && (
                  <button
                    type="button"
                    className="admin-button admin-button-primary"
                    disabled={processing}
                    onClick={() => void handleComplete()}
                  >
                    {processing
                      ? "Đang xử lý..."
                      : "Hoàn tất rút tiền"}
                  </button>
                )}
              </div>

              {showRejectForm &&
                selectedWithdrawal.status === "PENDING" && (
                  <div className="admin-withdrawal-reject-form">
                    <label htmlFor="withdrawal-reject-note">
                      Lý do từ chối
                    </label>

                    <textarea
                      id="withdrawal-reject-note"
                      value={rejectNote}
                      onChange={(event) =>
                        setRejectNote(event.target.value)
                      }
                      maxLength={255}
                      rows={4}
                      placeholder="Nhập ghi chú nếu cần..."
                      disabled={processing}
                    />

                    <div className="admin-withdrawal-reject-actions">
                      <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        disabled={processing}
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectNote("");
                        }}
                      >
                        Hủy
                      </button>

                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        disabled={processing}
                        onClick={() => void handleReject()}
                      >
                        {processing
                          ? "Đang xử lý..."
                          : "Xác nhận từ chối"}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </aside>
        </div>
      )}

    </section>
  );
}

export default AdminWithdrawalsPage;
