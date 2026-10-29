
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAdminFranchiseOverview,
  getAdminFranchiseAnalytics,
  getAdminFranchiseRanking,
  type AdminFranchiseOverview,
  type AdminFranchiseAnalytics,
  type AdminFranchiseRanking,
} from "../../../services/api/admin-franchise.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminFranchisePerformancePage.css";

interface DateRange {
  from: string;
  to: string;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLast30DaysRange(): DateRange {
  const today = new Date();
  const from = new Date(today);

  from.setDate(from.getDate() - 29);

  return {
    from: toDateString(from),
    to: toDateString(today),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatCurrency(value: number) {
  return `${formatNumber(value)} ₫`;
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatFullDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000_000)} tỷ`;
  }

  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} tr`;
  }

  if (value >= 1_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(value / 1_000)} nghìn`;
  }

  return formatNumber(value);
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

function AdminFranchisePerformancePage() {
  const [overview, setOverview] =
    useState<AdminFranchiseOverview | null>(null);

  const [analytics, setAnalytics] =
    useState<AdminFranchiseAnalytics | null>(null);

  const [ranking, setRanking] =
    useState<AdminFranchiseRanking | null>(null);

  const [dateRange, setDateRange] =
    useState<DateRange>(() => getLast30DaysRange());

  const [loading, setLoading] = useState(false);

  const [overviewError, setOverviewError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [rankingError, setRankingError] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    const token = getAccessToken("ADMIN");

    if (!token) {
      const message = "Không tìm thấy phiên đăng nhập.";

      setOverviewError(message);
      setAnalyticsError(message);
      setRankingError(message);

      return;
    }

    const period = getLast30DaysRange();

    setDateRange(period);
    setLoading(true);

    setOverviewError("");
    setAnalyticsError("");
    setRankingError("");

    const results = await Promise.allSettled([
      getAdminFranchiseOverview(token),

      getAdminFranchiseAnalytics(token, {
        from: period.from,
        to: period.to,
        groupBy: "day",
      }),

      getAdminFranchiseRanking(token, {
        sortBy: "revenue",
        from: period.from,
        to: period.to,
        limit: 5,
        offset: 0,
      }),
    ]);

    const [
      overviewResult,
      analyticsResult,
      rankingResult,
    ] = results;

    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value);
    } else {
      setOverviewError(
        getErrorMessage(
          overviewResult.reason,
          "Không thể tải tổng quan hiệu suất.",
        ),
      );
    }

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value);
    } else {
      setAnalyticsError(
        getErrorMessage(
          analyticsResult.reason,
          "Không thể tải xu hướng doanh thu.",
        ),
      );
    }

    if (rankingResult.status === "fulfilled") {
      setRanking(rankingResult.value);
    } else {
      setRankingError(
        getErrorMessage(
          rankingResult.reason,
          "Không thể tải bảng xếp hạng đại lý.",
        ),
      );
    }

    setLoading(false);
  }

  const metrics = [
    {
      label: "Doanh thu trong tháng",
      value: overview
        ? formatCurrency(overview.monthlyRevenue)
        : "—",
      description: "Theo thống kê tháng của hệ thống",
      icon: "₫",
      className: "is-revenue",
    },
    {
      label: "Đơn hàng trong tháng",
      value: overview
        ? formatNumber(overview.monthlyOrders)
        : "—",
      description: "Tổng đơn hàng theo thống kê tháng",
      icon: "01",
      className: "is-orders",
    },
    {
      label: "Tổng số đại lý",
      value: overview
        ? formatNumber(overview.totalFranchises)
        : "—",
      description: "Quy mô mạng lưới Franchise",
      icon: "FR",
      className: "is-network",
    },
    {
      label: "Đại lý hoạt động",
      value: overview
        ? formatNumber(overview.activeFranchises)
        : "—",
      description: "Theo thống kê tổng quan hệ thống",
      icon: "✓",
      className: "is-active",
    },
    {
      label: "Hoa hồng đã thanh toán",
      value: overview
        ? formatCurrency(overview.monthlyPaidCommission)
        : "—",
      description: "Hoa hồng đã trả trong tháng",
      icon: "↗",
      className: "is-commission",
    },
  ];

  const timeline = [...(analytics?.timeline ?? [])].sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const maximumRevenue = Math.max(
    0,
    ...timeline.map((item) => item.revenue),
  );

  const activeRate = overview && overview.totalFranchises > 0
    ? Math.min(
      100,
      Math.max(
        0,
        (overview.activeFranchises /
          overview.totalFranchises) *
        100,
      ),
    )
    : 0;

  const topFranchises = ranking?.items ?? [];

  return (
    <div className="admin-page admin-franchise-performance-page">
      <div className="admin-page-header franchise-performance-page-header">
        <div>
          <div className="franchise-performance-eyebrow">
            FRANCHISE MANAGEMENT
          </div>

          <h1>Tổng quan hiệu suất</h1>

          <p>
            Theo dõi kết quả kinh doanh và tình hình hoạt động
            của mạng lưới đại lý Franchise.
          </p>
        </div>

        <button
          type="button"
          className="admin-button admin-button-secondary franchise-performance-refresh"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Đang cập nhật..." : "Làm mới dữ liệu"}
        </button>
      </div>

      <section className="franchise-performance-section">
        <div className="franchise-performance-section-header">
          <div>
            <h2>Chỉ số hoạt động</h2>

            <p className="admin-muted">
              Tổng hợp quy mô mạng lưới và kết quả kinh doanh
              theo số liệu hiện có của hệ thống.
            </p>
          </div>
        </div>

        {overviewError && !overview ? (
          <div className="admin-card franchise-performance-state">
            <strong>Không thể tải chỉ số tổng quan</strong>

            <p>{overviewError}</p>

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              Thử tải lại
            </button>
          </div>
        ) : (
          <div className="franchise-performance-metrics">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className={`admin-card franchise-performance-metric-card ${metric.className}`}
              >
                <div className="franchise-performance-metric-top">
                  <span className="franchise-performance-metric-label">
                    {metric.label}
                  </span>

                  <span
                    className="franchise-performance-metric-icon"
                    aria-hidden="true"
                  >
                    {metric.icon}
                  </span>
                </div>

                <strong className="franchise-performance-metric-value">
                  {metric.value}
                </strong>

                <span className="franchise-performance-metric-description">
                  {metric.description}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="franchise-performance-section">
        <div className="franchise-performance-section-header">
          <div>
            <h2>Xu hướng doanh thu</h2>

            <p className="admin-muted">
              Biến động doanh thu theo ngày trong 30 ngày gần nhất.
            </p>
          </div>

          <span className="franchise-performance-period">
            {formatFullDate(dateRange.from)}
            <span aria-hidden="true"> — </span>
            {formatFullDate(dateRange.to)}
          </span>
        </div>

        <article className="admin-card franchise-performance-chart-card">
          {analyticsError && !analytics ? (
            <div className="franchise-performance-state">
              <strong>Không thể tải biểu đồ</strong>

              <p>{analyticsError}</p>

              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => void loadDashboard()}
                disabled={loading}
              >
                Thử tải lại
              </button>
            </div>
          ) : analytics && timeline.length > 0 ? (
            <>
              <div className="franchise-performance-chart-summary">
                <div>
                  <span className="franchise-performance-chart-label">
                    Doanh thu trong kỳ
                  </span>

                  <strong className="franchise-performance-chart-total">
                    {formatCurrency(analytics.summary.revenue)}
                  </strong>
                </div>

                <div className="franchise-performance-chart-legend">
                  <span className="franchise-performance-chart-legend-dot" />
                  Doanh thu
                </div>
              </div>


              <div className="franchise-performance-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeline}
                    margin={{
                      top: 12,
                      right: 12,
                      left: 8,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="franchiseRevenueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4263eb"
                          stopOpacity={0.24}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4263eb"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="#e9edf5"
                      strokeDasharray="4 5"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fill: "#8994a8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tickMargin={12}
                    />

                    <YAxis
                      tickFormatter={(value: number) =>
                        formatCompactCurrency(value)
                      }
                      tick={{ fill: "#8994a8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      domain={[0, "auto"]}
                      allowDecimals={false}
                    />

                    <Tooltip
                      labelFormatter={(label) =>
                        formatFullDate(String(label))
                      }
                      formatter={(value) => [
                        formatCurrency(Number(value ?? 0)),
                        "Doanh thu",
                      ]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e7ebf2",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(25, 42, 70, 0.12)",
                        padding: "10px 14px",
                      }}
                      labelStyle={{
                        color: "#758198",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Doanh thu"
                      stroke="#4263eb"
                      strokeWidth={2.5}
                      fill="url(#franchiseRevenueGradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#4263eb",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>


              {maximumRevenue === 0 && (
                <div className="franchise-performance-chart-empty-note">
                  <span aria-hidden="true">i</span>
                  Chưa ghi nhận doanh thu trong kỳ được chọn.
                </div>
              )}

              <div className="franchise-performance-chart-footer">
                <div>
                  <span>Số đơn hàng trong kỳ</span>
                  <strong>
                    {formatNumber(analytics.summary.orders)}
                  </strong>
                </div>

                <div>
                  <span>Hoa hồng đã thanh toán</span>
                  <strong>
                    {formatCurrency(
                      analytics.summary.paidCommission,
                    )}
                  </strong>
                </div>
              </div>
            </>
          ) : analytics && timeline.length === 0 ? (
            <div className="franchise-performance-state">
              <div className="franchise-performance-state-icon">
                <span aria-hidden="true">⌁</span>
              </div>

              <strong>Chưa có dữ liệu biểu đồ</strong>

              <p>
                API chưa trả về dữ liệu theo ngày trong khoảng
                thời gian đã chọn.
              </p>
            </div>
          ) : (
            <div className="franchise-performance-state">
              <strong>
                {loading
                  ? "Đang tải xu hướng doanh thu..."
                  : "Chưa có dữ liệu"}
              </strong>
            </div>
          )}
        </article>
      </section>

      <div className="franchise-performance-lower-grid">
        <section className="franchise-performance-section">
          <div className="franchise-performance-section-header">
            <div>
              <h2>Đại lý nổi bật</h2>

              <p className="admin-muted">
                Top 5 theo doanh thu trong 30 ngày gần nhất.
              </p>
            </div>

            <Link
              to="/admin/franchise-performance/ranking"
              className="franchise-performance-text-link"
            >
              Xem xếp hạng
              <span aria-hidden="true"> →</span>
            </Link>
          </div>

          <article className="admin-card franchise-performance-ranking-card">
            {rankingError && !ranking ? (
              <div className="franchise-performance-state">
                <strong>Không thể tải xếp hạng</strong>

                <p>{rankingError}</p>

                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => void loadDashboard()}
                  disabled={loading}
                >
                  Thử tải lại
                </button>
              </div>
            ) : topFranchises.length > 0 ? (
              <div className="franchise-performance-ranking-list">
                {topFranchises.map((franchise, index) => (
                  <div
                    key={franchise.franchiseId}
                    className="franchise-performance-ranking-item"
                  >
                    <div
                      className={`franchise-performance-ranking-position ${index < 3
                          ? `is-top-${index + 1}`
                          : ""
                        }`}
                    >
                      {franchise.rank}
                    </div>

                    <div className="franchise-performance-ranking-info">
                      <strong>
                        {franchise.fullName}
                      </strong>

                      <span>
                        {franchise.franchiseCode}
                      </span>
                    </div>

                    <div className="franchise-performance-ranking-result">
                      <strong>
                        {formatCurrency(franchise.revenue)}
                      </strong>

                      <span>
                        {formatNumber(franchise.orders)} đơn hàng
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="franchise-performance-state">
                <div className="franchise-performance-state-icon">
                  <span aria-hidden="true">☆</span>
                </div>

                <strong>Chưa có đại lý trong bảng xếp hạng</strong>

                <p>
                  Chưa có kết quả phù hợp để hiển thị trong kỳ
                  thống kê này.
                </p>
              </div>
            )}
          </article>
        </section>

        <section className="franchise-performance-section">
          <div className="franchise-performance-section-header">
            <div>
              <h2>Sức khỏe mạng lưới</h2>

              <p className="admin-muted">
                Tổng hợp tình trạng hoạt động theo số liệu hiện có.
              </p>
            </div>
          </div>

          <article className="admin-card franchise-performance-network-card">
            {overviewError && !overview ? (
              <div className="franchise-performance-state">
                <strong>Chưa có dữ liệu mạng lưới</strong>

                <p>{overviewError}</p>
              </div>
            ) : overview ? (
              <>
                <div className="franchise-performance-network-heading">
                  <div className="franchise-performance-network-icon">
                    <span aria-hidden="true">FR</span>
                  </div>

                  <div>
                    <span>Tổng quy mô mạng lưới</span>
                    <strong>
                      {formatNumber(overview.totalFranchises)}
                      <small> đại lý</small>
                    </strong>
                  </div>
                </div>

                <div className="franchise-performance-network-divider" />

                <div className="franchise-performance-network-stat">
                  <span>
                    <span className="franchise-performance-status-dot is-active" />
                    Đại lý hoạt động
                  </span>

                  <strong>
                    {formatNumber(overview.activeFranchises)}
                  </strong>
                </div>

                <div
                  className="franchise-performance-network-progress"
                  role="progressbar"
                  aria-label="Tỷ lệ đại lý hoạt động"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Number(activeRate.toFixed(1))}
                >
                  <span
                    style={{
                      width: `${activeRate}%`,
                    }}
                  />
                </div>

                <div className="franchise-performance-network-rate">
                  <strong>
                    {overview.totalFranchises > 0
                      ? `${activeRate.toLocaleString("vi-VN", {
                        maximumFractionDigits: 1,
                      })}%`
                      : "—"}
                  </strong>

                  <span>
                    {overview.totalFranchises > 0
                      ? "Tỷ lệ đại lý hoạt động"
                      : "Chưa có dữ liệu để tính tỷ lệ"}
                  </span>
                </div>

                <div className="franchise-performance-network-note">
                  Tỷ lệ được tính từ số đại lý hoạt động chia cho
                  tổng số đại lý theo API tổng quan. Đây không phải
                  chỉ số tăng trưởng doanh thu.
                </div>
              </>
            ) : (
              <div className="franchise-performance-state">
                <strong>
                  {loading
                    ? "Đang tải dữ liệu mạng lưới..."
                    : "Chưa có dữ liệu"}
                </strong>
              </div>
            )}
          </article>
        </section>
      </div>

      <section className="franchise-performance-footer-navigation">
        <div>
          <span className="franchise-performance-eyebrow">
            EXPLORE PERFORMANCE
          </span>

          <h2>Phân tích chuyên sâu</h2>

          <p className="admin-muted">
            Đi sâu vào dữ liệu theo thời gian hoặc so sánh hiệu suất
            giữa các đại lý.
          </p>
        </div>

        <div className="franchise-performance-navigation-grid">
          <Link
            to="/admin/franchise-performance/analytics"
            className="franchise-performance-navigation-card"
          >
            <span className="franchise-performance-navigation-icon">
              ↗
            </span>

            <span className="franchise-performance-navigation-content">
              <strong>Phân tích hiệu suất</strong>

              <small>
                Xem chi tiết doanh thu, đơn hàng và hoa hồng.
              </small>
            </span>

            <span
              className="franchise-performance-navigation-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          <Link
            to="/admin/franchise-performance/ranking"
            className="franchise-performance-navigation-card"
          >
            <span className="franchise-performance-navigation-icon">
              #
            </span>

            <span className="franchise-performance-navigation-content">
              <strong>Xếp hạng đại lý</strong>

              <small>
                So sánh theo doanh thu, đơn hàng và mạng lưới.
              </small>
            </span>

            <span
              className="franchise-performance-navigation-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AdminFranchisePerformancePage;
