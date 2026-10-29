import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFranchiseAuth,
  getFranchiseDirectDownline,
  getFranchiseAllDownline,
  getFranchiseInviteCode,
  type FranchiseDownlineAccount,
} from "../../services/api/franchise-dashboard.api";
import "./FranchiseNetworkPage.css";

type NetworkView = "DIRECT" | "ALL";

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const messages: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
    INVALID_API_RESPONSE: "Máy chủ trả về dữ liệu không hợp lệ.",
    INVALID_FRANCHISE_ACCOUNT: "Tài khoản không thuộc nền tảng Franchise.",
    ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản Franchise.",
  };

  return messages[error.message] ?? error.message;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    SUSPENDED: "Tạm ngưng",
    TERMINATED: "Đã chấm dứt",
    LOCKED: "Đã khóa",
    INACTIVE: "Không hoạt động",
    PENDING: "Chờ xử lý",
  };

  return labels[status.toUpperCase()] ?? status;
}

function getStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "franchise-network-status-active";
    case "SUSPENDED":
    case "LOCKED":
      return "franchise-network-status-warning";
    case "TERMINATED":
    case "INACTIVE":
      return "franchise-network-status-inactive";
    default:
      return "franchise-network-status-default";
  }
}

function FranchiseNetworkPage() {
  const [view, setView] = useState<NetworkView>("DIRECT");
  const [accounts, setAccounts] = useState<FranchiseDownlineAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");

  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<"CODE" | "LINK" | null>(null);

  const inviteLink = inviteCode
    ? `${window.location.origin}/register?affiliateCode=${encodeURIComponent(inviteCode)}`
    : "";

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const auth = await getFranchiseAuth();

      const result =
        view === "DIRECT"
          ? await getFranchiseDirectDownline(auth.accountId)
          : await getFranchiseAllDownline(auth.accountId);

      setAccounts(result);
    } catch (requestError) {
      setAccounts([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  useEffect(() => {
    let cancelled = false;

    async function loadInviteCode() {
      setInviteLoading(true);
      setInviteError(null);

      try {
        const result = await getFranchiseInviteCode();

        if (!cancelled) {
          setInviteCode(result.inviteCode);
        }
      } catch (requestError) {
        if (!cancelled) {
          setInviteError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    }

    void loadInviteCode();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        !keyword ||
        account.id.toLowerCase().includes(keyword) ||
        account.personId.toLowerCase().includes(keyword) ||
        (account.email ?? "").toLowerCase().includes(keyword) ||
        (account.phone ?? "").toLowerCase().includes(keyword);

      const matchesPlatform =
        platformFilter === "ALL" ||
        account.platform === platformFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        account.status.toUpperCase() === statusFilter;

      const matchesLevel =
        levelFilter === "ALL" ||
        String(account.level) === levelFilter;

      return (
        matchesSearch &&
        matchesPlatform &&
        matchesStatus &&
        matchesLevel
      );
    });
  }, [accounts, search, platformFilter, statusFilter, levelFilter]);

  const directCount = accounts.filter(
    (account) => account.level === 1,
  ).length;

  const memberCount = accounts.filter(
    (account) => account.platform === "MEMBER",
  ).length;

  const franchiseCount = accounts.filter(
    (account) => account.platform === "FRANCHISE",
  ).length;

  const levels = useMemo(
    () =>
      [...new Set(accounts.map((account) => account.level))].sort(
        (a, b) => a - b,
      ),
    [accounts],
  );

  function resetFilters() {
    setSearch("");
    setPlatformFilter("ALL");
    setStatusFilter("ALL");
    setLevelFilter("ALL");
  }

  async function copyInviteValue(
    value: string,
    item: "CODE" | "LINK",
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedItem(item);
    } catch {
      setCopiedItem(null);
      setInviteError(
        "Không thể sao chép tự động. Vui lòng chọn và sao chép nội dung thủ công.",
      );
    }
  }

  return (
    <main className="franchise-network">
      <header className="franchise-network-header">
        <div>
          <div className="franchise-network-eyebrow">
            ICONDENIM · FRANCHISE PORTAL
          </div>
          <h1>Mạng lưới tuyến dưới</h1>
          <p>
            Theo dõi các tài khoản được giới thiệu trực tiếp và toàn bộ
            mạng lưới theo từng cấp.
          </p>
        </div>

        <button
          type="button"
          className="franchise-network-refresh"
          onClick={() => void loadNetwork()}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </header>

      <section className="franchise-network-overview">
        <article className="franchise-network-summary-card">
          <span className="franchise-network-summary-label">
            {view === "DIRECT" ? "TUYẾN TRỰC TIẾP" : "TUYẾN TRỰC TIẾP TRONG KẾT QUẢ"}
          </span>
          <strong>{loading ? "—" : directCount}</strong>
          <p>Tài khoản ở cấp 1</p>
        </article>

        <article className="franchise-network-summary-card">
          <span className="franchise-network-summary-label">
            TÀI KHOẢN MEMBER
          </span>
          <strong>{loading ? "—" : memberCount}</strong>
          <p>Member trong phạm vi đang xem</p>
        </article>

        <article className="franchise-network-summary-card">
          <span className="franchise-network-summary-label">
            TÀI KHOẢN FRANCHISE
          </span>
          <strong>{loading ? "—" : franchiseCount}</strong>
          <p>Franchise trong phạm vi đang xem</p>
        </article>

        <article className="franchise-network-summary-card franchise-network-summary-highlight">
          <span className="franchise-network-summary-label">
            TỔNG TUYẾN DƯỚI
          </span>
          <strong>{loading ? "—" : accounts.length}</strong>
          <p>
            {view === "DIRECT"
              ? "Tài khoản được giới thiệu trực tiếp"
              : "Tài khoản ở tất cả các cấp"}
          </p>
        </article>
      </section>

      <section className="franchise-network-invite">
        <div className="franchise-network-invite-heading">
          <span className="franchise-network-invite-eyebrow">
            GROW YOUR NETWORK
          </span>
          <h2>Mã giới thiệu của bạn</h2>
          <p>
            Chia sẻ mã hoặc liên kết đăng ký để người mới tham gia
            mạng lưới thông qua tài khoản Franchise của bạn.
          </p>
        </div>

        {inviteError && (
          <p className="franchise-network-invite-error" role="alert">
            {inviteError}
          </p>
        )}

        <div className="franchise-network-invite-field">
          <label htmlFor="franchise-invite-code">Mã giới thiệu</label>
          <div className="franchise-network-invite-control">
            <input
              id="franchise-invite-code"
              value={inviteLoading ? "Đang tải mã giới thiệu..." : inviteCode}
              readOnly
              aria-label="Mã giới thiệu Franchise"
            />
            <button
              type="button"
              onClick={() => void copyInviteValue(inviteCode, "CODE")}
              disabled={inviteLoading || !inviteCode}
            >
              {copiedItem === "CODE" ? "Đã sao chép" : "Sao chép mã"}
            </button>
          </div>
        </div>

        <div className="franchise-network-invite-field">
          <label htmlFor="franchise-invite-link">Liên kết đăng ký</label>
          <div className="franchise-network-invite-control">
            <input
              id="franchise-invite-link"
              value={inviteLoading ? "Đang tạo liên kết..." : inviteLink}
              readOnly
              aria-label="Liên kết đăng ký qua mã giới thiệu"
            />
            <button
              type="button"
              onClick={() => void copyInviteValue(inviteLink, "LINK")}
              disabled={inviteLoading || !inviteLink}
            >
              {copiedItem === "LINK" ? "Đã sao chép" : "Sao chép link"}
            </button>
          </div>
        </div>
      </section>

      <section className="franchise-network-panel">
        <div className="franchise-network-panel-heading">
          <div>
            <h2>Danh sách tài khoản</h2>
            <p>
              Thông tin được lấy từ dữ liệu mạng lưới của hệ thống.
            </p>
          </div>

          <div className="franchise-network-tabs" role="group" aria-label="Phạm vi mạng lưới">
            <button
              type="button"
              className={view === "DIRECT" ? "active" : ""}
              aria-pressed={view === "DIRECT"}
              onClick={() => setView("DIRECT")}
            >
              Tuyến trực tiếp
            </button>
            <button
              type="button"
              className={view === "ALL" ? "active" : ""}
              aria-pressed={view === "ALL"}
              onClick={() => setView("ALL")}
            >
              Toàn mạng lưới
            </button>
          </div>
        </div>

        {error && (
          <div className="franchise-network-alert" role="alert">
            <div>
              <strong>Không thể tải mạng lưới</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadNetwork()}
              disabled={loading}
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="franchise-network-filters">
          <label className="franchise-network-search">
            <span>Tìm kiếm</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã tài khoản, email, số điện thoại..."
            />
          </label>

          <label>
            <span>Nền tảng</span>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
            >
              <option value="ALL">Tất cả nền tảng</option>
              <option value="MEMBER">Member</option>
              <option value="FRANCHISE">Franchise</option>
            </select>
          </label>

          <label>
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Tạm ngưng</option>
              <option value="TERMINATED">Đã chấm dứt</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="INACTIVE">Không hoạt động</option>
              <option value="PENDING">Chờ xử lý</option>
            </select>
          </label>

          {view === "ALL" && (
            <label>
              <span>Cấp mạng lưới</span>
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
              >
                <option value="ALL">Tất cả các cấp</option>
                {levels.map((level) => (
                  <option key={level} value={String(level)}>
                    Cấp {level}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className="franchise-network-reset"
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </button>
        </div>

        <div className="franchise-network-table-meta">
          <span>
            {loading
              ? "Đang tải danh sách..."
              : `Hiển thị ${filteredAccounts.length} / ${accounts.length} tài khoản`}
          </span>
          {view === "ALL" && (
            <span className="franchise-network-hierarchy-note">
              Cấp 1 là tuyến trực tiếp
            </span>
          )}
        </div>

        <div className="franchise-network-table-wrapper">
          <table className="franchise-network-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Nền tảng</th>
                <th>Cấp</th>
                <th>Trạng thái</th>
                <th>Liên hệ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="franchise-network-table-message">
                    Đang tải dữ liệu mạng lưới...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="franchise-network-table-message">
                    Không có dữ liệu để hiển thị.
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="franchise-network-table-message">
                    {accounts.length === 0
                      ? "Mạng lưới chưa có tài khoản tuyến dưới."
                      : "Không tìm thấy tài khoản phù hợp với bộ lọc."}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="franchise-network-account">
                        <strong>
                          {account.platform === "FRANCHISE" ? "FR" : "MB"}-
                          {account.id}
                        </strong>
                        <span>Mã Person: {account.personId}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`franchise-network-platform franchise-network-platform-${account.platform.toLowerCase()}`}
                      >
                        {account.platform}
                      </span>
                    </td>
                    <td>
                      <span className="franchise-network-level">
                        Cấp {account.level}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`franchise-network-status ${getStatusClass(account.status)}`}
                      >
                        {formatStatus(account.status)}
                      </span>
                    </td>
                    <td>
                      <div className="franchise-network-contact">
                        <span>{account.email || "Chưa có email"}</span>
                        <span>{account.phone || "Chưa có số điện thoại"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="franchise-network-footer">
        <span>ICONDENIM</span>
        <span>FRANCHISE NETWORK MANAGEMENT</span>
      </footer>
    </main>
  );
}

export default FranchiseNetworkPage;
