
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAdminFranchiseRanking,
  type AdminFranchiseRanking,
  type FranchiseRankingSortBy,
} from "../../../services/api/admin-franchise.api";

import { getAccessToken } from "../../../utils/auth";
import "./AdminFranchiseRankingPage.css";

const PAGE_SIZE = 10;

type PeriodKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "last30Days";

const SORT_OPTIONS: {
  value: FranchiseRankingSortBy;
  label: string;
}[] = [
    { value: "revenue", label: "Doanh thu" },
    { value: "orders", label: "Số đơn hàng" },
    { value: "commission", label: "Hoa hồng đã thanh toán" },
    { value: "network", label: "Quy mô mạng lưới" },
  ];

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "thisWeek", label: "Tuần này" },
  { value: "lastWeek", label: "Tuần trước" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "last30Days", label: "30 ngày gần nhất" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodDates(period: PeriodKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  const end = new Date(today);

  switch (period) {
    case "today":
      break;

    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;

    case "thisWeek": {
      const day = (today.getDay() + 6) % 7;
      start.setDate(today.getDate() - day);
      break;
    }

    case "lastWeek": {
      const day = (today.getDay() + 6) % 7;
      start.setDate(today.getDate() - day - 7);
      end.setDate(today.getDate() - day - 1);
      break;
    }

    case "thisMonth":
      start.setDate(1);
      break;

    case "lastMonth":
      start.setDate(1);
      start.setMonth(start.getMonth() - 1);
      end.setDate(0);
      break;

    case "last30Days":
      start.setDate(start.getDate() - 29);
      break;
  }

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = "\uFEFF" + rows.map((row) =>
    row.map(escapeCsv).join(","),
  ).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function AdminFranchiseRankingPage() {
  const initialPeriod: PeriodKey = "last30Days";
  const initialDates = getPeriodDates(initialPeriod);

  const [sortBy, setSortBy] =
    useState<FranchiseRankingSortBy>("revenue");

  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [ranking, setRanking] =
    useState<AdminFranchiseRanking | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRanking = useCallback(async () => {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setRanking(null);
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    if (from && to && from > to) {
      setRanking(null);
      setError("Ngày bắt đầu không được sau ngày kết thúc.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getAdminFranchiseRanking(accessToken, {
        sortBy,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setRanking(result);
    } catch (err) {
      setRanking(null);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải bảng xếp hạng đại lý.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, page, sortBy, to]);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const items = ranking?.items ?? [];
  const total = ranking?.total ?? 0;

  // Lưu ý: đây là số liệu của trang hiện tại, không phải toàn bộ kết quả.
  const pageOrders = items.reduce(
    (sum, item) => sum + item.orders,
    0,
  );

  const pageRevenue = items.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );

  const pageCommission = items.reduce(
    (sum, item) => sum + item.paidCommission,
    0,
  );

  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
    "Doanh thu";

  // Tìm kiếm phía frontend trên các đại lý đã tải về ở trang hiện tại.
  const filteredItems = useMemo(() => {
    const keyword = normalizeSearch(search);

    if (!keyword) return items;

    return items.filter((item) => {
      const searchableText = normalizeSearch(
        [
          item.fullName,
          item.franchiseCode,
          item.franchiseId,
        ].filter(Boolean).join(" "),
      );

      return searchableText.includes(keyword);
    });
  }, [items, search]);

  const topThree = useMemo(
    () => page === 0 ? items.slice(0, 3) : [],
    [items, page],
  );

  function selectPeriod(nextPeriod: PeriodKey) {
    const dates = getPeriodDates(nextPeriod);

    setPeriod(nextPeriod);
    setFrom(dates.from);
    setTo(dates.to);
    setPage(0);
  }

  function resetFilters() {
    const dates = getPeriodDates(initialPeriod);

    setSortBy("revenue");
    setPeriod(initialPeriod);
    setFrom(dates.from);
    setTo(dates.to);
    setSearch("");
    setPage(0);
  }

  function exportRanking() {
    if (filteredItems.length === 0) return;

    const rows: unknown[][] = [
      [
        "Thứ hạng",
        "Mã đại lý",
        "Tên đại lý",
        "Số đơn hàng",
        "Doanh thu (VND)",
        "Hoa hồng đã thanh toán (VND)",
        "Tổng đại lý tuyến dưới",
      ],
      ...filteredItems.map((item) => [
        item.rank,
        item.franchiseCode || "",
        item.fullName || "",
        item.orders,
        item.revenue,
        item.paidCommission,
        item.totalDownline,
      ]),
    ];

    downloadCsv(
      `xep-hang-dai-ly-${from || "tat-ca"}-${to || "tat-ca"}.csv`,
      rows,
    );
  }

  return (
    <div className="admin-page afr-ranking-page">
      <header className="admin-page-header afr-ranking-header">
        <div>
          <p className="admin-muted afr-ranking-eyebrow">
            QUẢN LÝ ĐẠI LÝ
          </p>

          <h1 className="admin-page-title">Xếp hạng đại lý</h1>

          <p className="admin-muted afr-ranking-description">
            Theo dõi thứ hạng, so sánh hiệu suất và nhận diện
            những đại lý nổi bật trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="admin-button afr-ranking-refresh"
          onClick={() => void loadRanking()}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "↻ Làm mới"}
        </button>
      </header>

      <section className="admin-card afr-ranking-filter">
        <div className="afr-ranking-section-heading">
          <div>
            <h2>Bộ lọc xếp hạng</h2>
            <p className="admin-muted">
              Chọn khoảng thời gian và tiêu chí cần phân tích.
            </p>
          </div>
        </div>

        <div className="afr-ranking-periods">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`afr-ranking-period ${period === option.value ? "is-active" : ""
                }`}
              onClick={() => selectPeriod(option.value)}
              aria-pressed={period === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="afr-ranking-filter-grid">
          <label className="afr-ranking-field">
            <span>Tiêu chí xếp hạng</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as FranchiseRankingSortBy);
                setPage(0);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="afr-ranking-field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPeriod("last30Days");
                setPage(0);
              }}
            />
          </label>

          <label className="afr-ranking-field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPeriod("last30Days");
                setPage(0);
              }}
            />
          </label>

          <button
            type="button"
            className="admin-button afr-ranking-reset"
            onClick={resetFilters}
            disabled={loading}
          >
            Đặt lại
          </button>
        </div>

        <p className="admin-muted afr-ranking-filter-note">
          Xếp hạng theo <strong>{selectedSortLabel.toLowerCase()}</strong>
          {" · "}Kỳ thống kê: <strong>{from || "Tất cả"}</strong>
          {" – "}<strong>{to || "Tất cả"}</strong>
        </p>
      </section>

      {error && (
        <div className="afr-ranking-error" role="alert">
          <div>
            <strong>Không thể tải bảng xếp hạng</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="admin-button"
            onClick={() => void loadRanking()}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="afr-ranking-metrics">
        <article className="admin-card afr-ranking-metric">
          <div className="afr-ranking-metric-icon is-blue">♙</div>
          <span>Tổng số đại lý</span>
          <strong>{loading ? "—" : formatNumber(total)}</strong>
          <p className="admin-muted">Theo bộ lọc hiện tại</p>
        </article>

        <article className="admin-card afr-ranking-metric">
          <div className="afr-ranking-metric-icon is-violet">▤</div>
          <span>Đơn hàng trên trang</span>
          <strong>{loading ? "—" : formatNumber(pageOrders)}</strong>
          <p className="admin-muted">Tổng của các đại lý đã tải</p>
        </article>

        <article className="admin-card afr-ranking-metric">
          <div className="afr-ranking-metric-icon is-green">₫</div>
          <span>Doanh thu trên trang</span>
          <strong className="afr-ranking-currency">
            {loading ? "—" : formatCurrency(pageRevenue)}
          </strong>
          <p className="admin-muted">Tổng của các đại lý đã tải</p>
        </article>

        <article className="admin-card afr-ranking-metric">
          <div className="afr-ranking-metric-icon is-orange">↗</div>
          <span>Hoa hồng đã thanh toán</span>
          <strong className="afr-ranking-currency">
            {loading ? "—" : formatCurrency(pageCommission)}
          </strong>
          <p className="admin-muted">Tổng của các đại lý đã tải</p>
        </article>
      </section>

      {!loading && !error && page === 0 && topThree.length > 0 && (
        <section className="afr-ranking-podium-section">
          <div className="afr-ranking-table-heading">
            <div>
              <h2>Top đại lý dẫn đầu</h2>
              <p className="admin-muted">
                Xếp theo {selectedSortLabel.toLowerCase()} trong kỳ đã chọn.
              </p>
            </div>
          </div>

          <div className="afr-ranking-podium">
            {topThree.map((item) => (
              <article
                key={item.franchiseId}
                className={`afr-ranking-podium-card rank-${item.rank}`}
              >
                <div className="afr-ranking-podium-medal">
                  {item.rank === 1 ? "♛" : `#${item.rank}`}
                </div>

                <span className="afr-ranking-podium-label">
                  {item.rank === 1
                    ? "Dẫn đầu"
                    : item.rank === 2
                      ? "Á quân"
                      : "Hạng ba"}
                </span>

                <strong className="afr-ranking-podium-name">
                  {item.fullName || "Chưa cập nhật tên"}
                </strong>

                <span className="afr-ranking-podium-code">
                  {item.franchiseCode || "Chưa có mã đại lý"}
                </span>

                <strong className="afr-ranking-podium-value">
                  {sortBy === "orders"
                    ? `${formatNumber(item.orders)} đơn`
                    : sortBy === "commission"
                      ? formatCurrency(item.paidCommission)
                      : sortBy === "network"
                        ? `${formatNumber(item.totalDownline)} đại lý`
                        : formatCurrency(item.revenue)}
                </strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="admin-card afr-ranking-table-card">
        <div className="afr-ranking-table-heading">
          <div>
            <h2>Bảng xếp hạng chi tiết</h2>
            <p className="admin-muted">
              Kết quả được sắp xếp theo {selectedSortLabel.toLowerCase()}.
            </p>
          </div>

          <button
            type="button"
            className="admin-button afr-ranking-export"
            onClick={exportRanking}
            disabled={loading || filteredItems.length === 0}
          >
            ↓ Xuất Excel (CSV)
          </button>
        </div>

        <div className="afr-ranking-search-row">
          <label className="afr-ranking-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên hoặc mã đại lý trên trang hiện tại..."
              aria-label="Tìm đại lý"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </label>

          {!loading && !error && (
            <span className="admin-muted afr-ranking-count">
              {filteredItems.length} kết quả trên trang này
            </span>
          )}
        </div>

        {loading ? (
          <div className="afr-ranking-state">
            <span className="afr-ranking-spinner" />
            <p>Đang tải dữ liệu xếp hạng...</p>
          </div>
        ) : error ? (
          <div className="afr-ranking-state">
            <p>Dữ liệu chưa sẵn sàng. Vui lòng thử tải lại.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="afr-ranking-state">
            <h3>{search ? "Không tìm thấy đại lý" : "Chưa có dữ liệu xếp hạng"}</h3>
            <p className="admin-muted">
              {search
                ? "Thử tìm bằng tên hoặc mã đại lý khác."
                : "Hãy thử thay đổi khoảng thời gian hoặc tiêu chí xếp hạng."}
            </p>
          </div>
        ) : (
          <>
            <div className="afr-ranking-table-scroll">
              <table className="afr-ranking-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Đại lý</th>
                    <th className="afr-ranking-number">Đơn hàng</th>
                    <th className="afr-ranking-number">Doanh thu</th>
                    <th className="afr-ranking-number">Hoa hồng đã trả</th>
                    <th className="afr-ranking-number">Tuyến dưới</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.franchiseId}>
                      <td>
                        <span
                          className={`afr-ranking-badge ${item.rank <= 3
                              ? `afr-ranking-top-${item.rank}`
                              : ""
                            }`}
                        >
                          #{item.rank}
                        </span>
                      </td>

                      <td>
                        <div className="afr-ranking-franchise">
                          <strong>
                            {item.fullName || "Chưa cập nhật tên"}
                          </strong>
                          <span className="admin-muted">
                            {item.franchiseCode || "Chưa có mã đại lý"}
                          </span>
                        </div>
                      </td>

                      <td className="afr-ranking-number">
                        {formatNumber(item.orders)}
                      </td>

                      <td className="afr-ranking-number afr-ranking-emphasis">
                        {formatCurrency(item.revenue)}
                      </td>

                      <td className="afr-ranking-number">
                        {formatCurrency(item.paidCommission)}
                      </td>

                      <td className="afr-ranking-number">
                        {formatNumber(item.totalDownline)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="afr-ranking-pagination">
              <span className="admin-muted">
                Trang {page + 1} · {formatNumber(total)} đại lý
              </span>

              <div>
                <button
                  type="button"
                  className="admin-button afr-ranking-secondary"
                  disabled={page === 0 || loading}
                  onClick={() => {
                    setSearch("");
                    setPage((current) => Math.max(0, current - 1));
                  }}
                >
                  ← Trang trước
                </button>

                <button
                  type="button"
                  className="admin-button afr-ranking-secondary"
                  disabled={!ranking?.hasMore || loading}
                  onClick={() => {
                    setSearch("");
                    setPage((current) => current + 1);
                  }}
                >
                  Trang sau →
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <p className="afr-ranking-disclaimer">
        Các chỉ số tổng hợp phía trên phản ánh dữ liệu của trang đã tải.
        Tìm kiếm và xuất báo cáo hiện áp dụng cho các đại lý đã tải ở trang
        hiện tại; để tìm kiếm và xuất toàn bộ hệ thống cần hỗ trợ từ API.
      </p>
    </div>
  );
}
