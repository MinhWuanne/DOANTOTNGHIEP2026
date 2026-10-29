import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminFranchiseAnalytics,
  getAdminFranchises,
  type AdminFranchiseAnalytics,
  type AdminFranchise,
} from "../../../services/api/admin-franchise.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminFranchiseAnalyticsPage.css";
type PeriodKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";
type DateRange = {
  from: string;
  to: string;
};
type MetricKey =
  | "orders"
  | "revenue"
  | "paidCommission"
  | "newFranchises";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const compactCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const PERIOD_OPTIONS: {
  value: PeriodKey;
  label: string;
}[] = [
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "thisWeek", label: "Tuần này" },
    { value: "lastWeek", label: "Tuần trước" },
    { value: "thisMonth", label: "Tháng này" },
    { value: "lastMonth", label: "Tháng trước" },
  ];
const METRIC_CONFIG: {

  key: MetricKey;

  label: string;

  color: string;

}[] = [

    {

      key: "orders",

      label: "Tổng đơn hàng",

      color: "#2563eb",

    },

    {

      key: "revenue",

      label: "Tổng doanh thu",

      color: "#16a34a",

    },

    {

      key: "paidCommission",

      label: "Hoa hồng đã thanh toán",

      color: "#ea580c",

    },

    {

      key: "newFranchises",

      label: "Đại lý mới",

      color: "#9333ea",

    },

  ];

function getDateString(date: Date): string {

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}

function parseDate(value: string): Date {

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);

}

function addDays(date: Date, amount: number): Date {

  const result = new Date(date);

  result.setDate(result.getDate() + amount);

  return result;

}

function startOfWeek(date: Date): Date {

  const result = new Date(date);

  const day = result.getDay();

  const distance = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - distance);

  result.setHours(0, 0, 0, 0);

  return result;

}

function startOfMonth(date: Date): Date {

  return new Date(date.getFullYear(), date.getMonth(), 1);

}

function endOfMonth(date: Date): Date {

  return new Date(date.getFullYear(), date.getMonth() + 1, 0);

}

function getRange(period: PeriodKey, today: Date): DateRange {

  const currentDay = new Date(today);

  currentDay.setHours(0, 0, 0, 0);

  if (period === "today") {

    return {

      from: getDateString(currentDay),

      to: getDateString(currentDay),

    };

  }

  if (period === "yesterday") {

    const yesterday = addDays(currentDay, -1);

    return {

      from: getDateString(yesterday),

      to: getDateString(yesterday),

    };

  }

  if (period === "thisWeek") {

    return {

      from: getDateString(startOfWeek(currentDay)),

      to: getDateString(currentDay),

    };

  }

  if (period === "lastWeek") {

    const thisWeekStart = startOfWeek(currentDay);

    const lastWeekStart = addDays(thisWeekStart, -7);

    return {

      from: getDateString(lastWeekStart),

      to: getDateString(addDays(thisWeekStart, -1)),

    };

  }

  if (period === "thisMonth") {

    return {

      from: getDateString(startOfMonth(currentDay)),

      to: getDateString(currentDay),

    };

  }

  const lastMonthDate = new Date(

    currentDay.getFullYear(),

    currentDay.getMonth() - 1,

    1,

  );

  return {

    from: getDateString(startOfMonth(lastMonthDate)),

    to: getDateString(endOfMonth(lastMonthDate)),

  };

}

function getPreviousRange(

  period: PeriodKey,

  current: DateRange,

): DateRange {

  const currentFrom = parseDate(current.from);

  const currentTo = parseDate(current.to);

  if (period === "today" || period === "yesterday") {

    const previousDay = addDays(currentFrom, -1);

    return {

      from: getDateString(previousDay),

      to: getDateString(previousDay),

    };

  }

  if (period === "thisWeek") {

    const previousFrom = addDays(currentFrom, -7);

    const previousTo = addDays(currentTo, -7);

    return {

      from: getDateString(previousFrom),

      to: getDateString(previousTo),

    };

  }

  if (period === "lastWeek") {

    return {

      from: getDateString(addDays(currentFrom, -7)),

      to: getDateString(addDays(currentTo, -7)),

    };

  }

  if (period === "thisMonth") {

    const previousMonthEnd = addDays(currentFrom, -1);

    const previousMonthStart = startOfMonth(previousMonthEnd);

    const elapsedDays =

      Math.round(

        (currentTo.getTime() - currentFrom.getTime()) /

        (24 * 60 * 60 * 1000),

      ) + 1;

    const previousMonthDays =

      Math.round(

        (endOfMonth(previousMonthEnd).getTime() -

          previousMonthStart.getTime()) /

        (24 * 60 * 60 * 1000),

      ) + 1;

    const previousEnd = addDays(

      previousMonthStart,

      Math.min(elapsedDays, previousMonthDays) - 1,

    );

    return {

      from: getDateString(previousMonthStart),

      to: getDateString(previousEnd),

    };

  }

  const currentMonthStart = parseDate(current.from);

  const previousMonthDate = new Date(

    currentMonthStart.getFullYear(),

    currentMonthStart.getMonth() - 1,

    1,

  );

  return {

    from: getDateString(startOfMonth(previousMonthDate)),

    to: getDateString(endOfMonth(previousMonthDate)),

  };

}

function formatDateLabel(value: string): string {

  const date = parseDate(value);

  return date.toLocaleDateString("vi-VN", {

    day: "2-digit",

    month: "2-digit",

  });

}

function formatRangeLabel(range: DateRange): string {

  return `${formatDateLabel(range.from)}/${parseDate(range.from).getFullYear()} – ${formatDateLabel(range.to)}/${parseDate(range.to).getFullYear()}`;

}

function normalizeText(value: string): string {

  return value

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/đ/g, "d")

    .replace(/Đ/g, "D")

    .toLowerCase()

    .trim();

}

function getFranchiseName(franchise: AdminFranchise): string {

  const code = franchise.franchiseProfile?.franchiseCode;

  const name = franchise.person?.fullName;

  if (code && name) {

    return `${code} — ${name}`;

  }

  return name || code || franchise.id;

}

function matchesFranchise(

  franchise: AdminFranchise,

  query: string,

): boolean {

  const optionalFields = franchise as AdminFranchise & {

    invitationCode?: string;

    inviteCode?: string;

    referralCode?: string;

  };

  const searchableFields = [

    franchise.id,

    franchise.personId,

    franchise.person?.fullName,

    franchise.email,

    franchise.phone,

    franchise.franchiseProfile?.franchiseCode,

    optionalFields.invitationCode,

    optionalFields.inviteCode,

    optionalFields.referralCode,

  ];

  const normalizedQuery = normalizeText(query);

  return searchableFields.some(

    (value) =>

      value &&

      normalizeText(String(value)).includes(normalizedQuery),

  );

}

function getNewFranchiseCount(

  franchises: AdminFranchise[],

  range: DateRange,

): number {

  return franchises.filter((franchise) => {

    if (!franchise.createdAt) {

      return false;

    }

    const createdDate = new Date(franchise.createdAt);

    if (Number.isNaN(createdDate.getTime())) {

      return false;

    }

    const dateString = getDateString(createdDate);

    return dateString >= range.from && dateString <= range.to;

  }).length;

}

function getMetrics(

  analytics: AdminFranchiseAnalytics | null,

  newFranchises: number,

): Record<MetricKey, number> {

  return {

    orders: analytics?.summary.orders ?? 0,

    revenue: analytics?.summary.revenue ?? 0,

    paidCommission: analytics?.summary.paidCommission ?? 0,

    newFranchises,

  };

}

function formatMetricValue(key: MetricKey, value: number): string {

  if (key === "revenue" || key === "paidCommission") {

    return currencyFormatter.format(value);

  }

  return numberFormatter.format(value);

}

type TimelinePoint = {
  date: string;
  orders: number;
  revenue: number;
  paidCommission: number;
  newFranchises: number;
};

function AnalyticsLineChart({
  data,
  metric,
}: {
  data: TimelinePoint[];
  metric: (typeof METRIC_CONFIG)[number];
}) {
  const isCurrency =
    metric.key === "revenue" ||
    metric.key === "paidCommission";

  return (
    <div className="admin-franchise-analytics-single-chart">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{
            top: 12,
            right: 16,
            left: 8,
            bottom: 4,
          }}
        >
          <CartesianGrid
            stroke="#e2e8f0"
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />

          <YAxis
            width={isCurrency ? 76 : 48}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value: number) =>
              isCurrency
                ? compactCurrencyFormatter.format(value)
                : numberFormatter.format(value)
            }
            allowDecimals={false}
            domain={[0, "auto"]}
          />

          <Tooltip
            labelFormatter={(label) =>
              formatDateLabel(String(label))
            }
            formatter={(value) => [
              formatMetricValue(metric.key, Number(value ?? 0)),
              metric.label,
            ]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              padding: "10px 12px",
            }}
            labelStyle={{
              color: "#0f172a",
              fontWeight: 600,
              marginBottom: 4,
            }}
          />

          <Line
            type="monotone"
            dataKey={metric.key}
            name={metric.label}
            stroke={metric.color}
            strokeWidth={2.5}
            dot={{
              r: data.length <= 10 ? 3 : 0,
              fill: metric.color,
              strokeWidth: 0,
            }}
            activeDot={{
              r: 5,
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return 0;
    }
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;

}
function getChangeText(current: number, previous: number): string {
  const difference = current - previous;
  if (difference > 0) {
    return `Tăng ${formatDifference(difference)}`;
  }
  if (difference < 0) {
    return `Giảm ${formatDifference(Math.abs(difference))}`;
  }
  return "Không thay đổi";
}
function formatDifference(value: number): string {
  return numberFormatter.format(value);
}
function getAssessment(
  metric: MetricKey,
  current: number,
  previous: number,
): { title: string; advice: string } {
  const difference = current - previous;
  if (difference === 0) {
    return {
      title: "Chỉ số không thay đổi",
      advice:
        "Tiếp tục theo dõi ở kỳ tiếp theo và kiểm tra thêm tỷ lệ chuyển đổi, hoạt động bán hàng và tình trạng xử lý đơn.",
    };
  }
  if (difference > 0) {
    if (metric === "orders") {
      return {
        title: "Số đơn hàng tăng",
        advice:
          "Kiểm tra nguồn đơn hàng tăng trưởng, tỷ lệ hoàn tất và khả năng đáp ứng tồn kho. Duy trì các kênh đang hoạt động hiệu quả.",
      };
    }
    if (metric === "revenue") {
      return {
        title: "Doanh thu tăng",
        advice:
          "Đối chiếu doanh thu với số đơn và giá trị trung bình mỗi đơn để xác định nguồn tăng trưởng. Ưu tiên duy trì các sản phẩm và kênh có hiệu quả.",
      };
    }
    if (metric === "paidCommission") {
      return {
        title: "Hoa hồng đã thanh toán tăng",
        advice:
          "Đối chiếu với doanh thu đủ điều kiện hưởng hoa hồng và các đợt chi trả để bảo đảm số tiền tăng phù hợp với nghiệp vụ.",
      };
    }
    return {
      title: "Có thêm đại lý mới",
      advice:
        "Theo dõi tỷ lệ kích hoạt và hiệu suất của đại lý mới sau khi tham gia. Tập trung hỗ trợ onboarding để giúp đại lý sớm phát sinh hoạt động.",
    };
  }
  if (metric === "orders") {
    return {
      title: "Số đơn hàng giảm",
      advice:
        "Kiểm tra lưu lượng truy cập, tỷ lệ chuyển đổi, trạng thái sản phẩm và hoạt động của đại lý. Liên hệ các đại lý giảm hoạt động để tìm nguyên nhân.",
    };
  }
  if (metric === "revenue") {

    return {

      title: "Doanh thu giảm",

      advice:

        "Kiểm tra số đơn, giá trị trung bình đơn hàng, sản phẩm hết hàng và biến động theo đại lý. Chỉ triển khai khuyến mãi sau khi xác định được nguyên nhân phù hợp.",

    };

  }

  if (metric === "paidCommission") {

    return {

      title: "Hoa hồng đã thanh toán giảm",

      advice:

        "Kiểm tra doanh thu đủ điều kiện, thời điểm ghi nhận hoa hồng và lịch thanh toán. Mức giảm có thể do lịch chi trả, không nhất thiết là hiệu suất kinh doanh giảm.",

    };

  }

  return {

    title: "Số đại lý mới giảm",

    advice:

      "Kiểm tra nguồn tuyển đại lý, số lượt đăng ký và tỷ lệ hoàn tất đăng ký. Rà soát quy trình giới thiệu và hỗ trợ đại lý hiện tại phát triển mạng lưới.",

  };

}

function exportExcel(

  periodLabel: string,

  range: DateRange,

  metrics: Record<MetricKey, number>,

  previousMetrics: Record<MetricKey, number>,

  timeline: AdminFranchiseAnalytics["timeline"],

  franchises: AdminFranchise[],

  franchiseId: string,

) {

  const selectedFranchise = franchises.find(

    (franchise) => franchise.id === franchiseId,

  );

  const rows: string[][] = [

    ["BÁO CÁO PHÂN TÍCH HIỆU SUẤT ĐẠI LÝ"],

    ["Kỳ thống kê", periodLabel],

    ["Từ ngày", range.from],

    ["Đến ngày", range.to],

    ["Đại lý", selectedFranchise ? getFranchiseName(selectedFranchise) : "Toàn hệ thống"],

    [],

    ["CHỈ SỐ", "KỲ HIỆN TẠI", "KỲ ĐỐI CHIẾU", "CHÊNH LỆCH", "THAY ĐỔI (%)"],

  ];

  for (const metric of METRIC_CONFIG) {

    const current = metrics[metric.key];

    const previous = previousMetrics[metric.key];

    const percent = getPercentChange(current, previous);

    rows.push([

      metric.label,

      String(current),

      String(previous),

      String(current - previous),

      percent === null ? "Không xác định (kỳ trước bằng 0)" : `${percent.toFixed(2)}%`,

    ]);

  }

  rows.push(

    [],

    ["CHI TIẾT THEO THỜI GIAN"],

    ["Ngày", "Đơn hàng", "Doanh thu", "Hoa hồng đã thanh toán"],

  );

  for (const item of timeline) {

    rows.push([

      item.date,

      String(item.orders),

      String(item.revenue),

      String(item.paidCommission),

    ]);

  }

  const escapeCell = (value: string) =>

    `<td style="border:1px solid #d1d5db;padding:6px;">${value

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")}</td>`;

  const html = `

    <html>

      <head>

        <meta charset="UTF-8" />

      </head>

      <body>

        <table>

          ${rows

      .map(

        (row) =>

          `<tr>${row

            .map((cell) => escapeCell(cell))

            .join("")}</tr>`,

      )

      .join("")}

        </table>

      </body>

    </html>

  `;

  const blob = new Blob(["\ufeff", html], {

    type: "application/vnd.ms-excel;charset=utf-8;",

  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = `bao-cao-hieu-suat-dai-ly-${range.from}-${range.to}.xls`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

}

export default function AdminFranchiseAnalyticsPage() {

  const [franchises, setFranchises] = useState<AdminFranchise[]>([]);

  const [analytics, setAnalytics] =

    useState<AdminFranchiseAnalytics | null>(null);

  const [previousAnalytics, setPreviousAnalytics] =

    useState<AdminFranchiseAnalytics | null>(null);

  const [period, setPeriod] = useState<PeriodKey>("thisWeek");

  const [franchiseId, setFranchiseId] = useState("");

  const [franchiseSearch, setFranchiseSearch] = useState("");

  const [showFranchiseResults, setShowFranchiseResults] = useState(false);

  const [loading, setLoading] = useState(true);

  const [franchisesLoading, setFranchisesLoading] = useState(true);

  const [error, setError] = useState("");

  const [franchisesError, setFranchisesError] = useState("");

  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => getRange(period, today), [period, today]);

  const previousRange = useMemo(

    () => getPreviousRange(period, range),

    [period, range],

  );

  const loadFranchises = useCallback(async () => {

    setFranchisesLoading(true);

    setFranchisesError("");

    try {

      const token = getAccessToken("ADMIN");
      if (!token) {

        throw new Error(

          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

        );

      }

      const result = await getAdminFranchises(token);

      setFranchises(result);

    } catch (err) {

      setFranchisesError(

        err instanceof Error

          ? err.message

          : "Không thể tải danh sách đại lý.",

      );

    } finally {

      setFranchisesLoading(false);

    }

  }, []);

  const loadAnalytics = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const token = getAccessToken("ADMIN");
      if (!token) {

        throw new Error(

          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

        );

      }

      const [currentResult, previousResult] = await Promise.all([

        getAdminFranchiseAnalytics(token, {

          franchiseId: franchiseId || undefined,

          from: range.from,

          to: range.to,

          groupBy: "day",

        }),

        getAdminFranchiseAnalytics(token, {

          franchiseId: franchiseId || undefined,

          from: previousRange.from,

          to: previousRange.to,

          groupBy: "day",

        }),

      ]);

      setAnalytics(currentResult);

      setPreviousAnalytics(previousResult);

    } catch (err) {

      setAnalytics(null);

      setPreviousAnalytics(null);

      setError(

        err instanceof Error

          ? err.message

          : "Không thể tải dữ liệu phân tích hiệu suất.",

      );

    } finally {

      setLoading(false);

    }

  }, [franchiseId, range.from, range.to, previousRange.from, previousRange.to]);

  const refreshAll = useCallback(() => {

    void loadFranchises();

    void loadAnalytics();

  }, [loadFranchises, loadAnalytics]);

  useEffect(() => {

    void loadFranchises();

  }, [loadFranchises]);

  useEffect(() => {

    void loadAnalytics();

  }, [loadAnalytics]);

  const filteredFranchises = useMemo(() => {

    if (!franchiseSearch.trim()) {

      return franchises.slice(0, 10);

    }

    return franchises

      .filter((franchise) =>

        matchesFranchise(franchise, franchiseSearch),

      )

      .slice(0, 20);

  }, [franchises, franchiseSearch]);

  const selectedFranchise = useMemo(

    () => franchises.find((franchise) => franchise.id === franchiseId),

    [franchises, franchiseId],

  );

  const timeline = useMemo(() => {

    const existingItems = new Map(

      (analytics?.timeline ?? []).map((item) => [item.date.slice(0, 10), item]),

    );

    const fromDate = parseDate(range.from);

    const toDate = parseDate(range.to);

    const dates: string[] = [];

    for (

      let date = new Date(fromDate);

      date <= toDate;

      date = addDays(date, 1)

    ) {

      dates.push(getDateString(date));

    }

    return dates.map((date) => {

      const item = existingItems.get(date);

      return {

        date,

        orders: item?.orders ?? 0,

        revenue: item?.revenue ?? 0,

        paidCommission: item?.paidCommission ?? 0,

        newFranchises: getNewFranchiseCount(franchises, {

          from: date,

          to: date,

        }),

      };

    });

  }, [analytics, range.from, range.to, franchises]);

  const newFranchises = getNewFranchiseCount(franchises, range);

  const previousNewFranchises = getNewFranchiseCount(

    franchises,

    previousRange,

  );

  const metrics = getMetrics(analytics, newFranchises);

  const previousMetrics = getMetrics(

    previousAnalytics,

    previousNewFranchises,

  );

  const comparisonMetrics = METRIC_CONFIG.map((metric) => {
    const current = metrics[metric.key];
    const previous = previousMetrics[metric.key];
    const percent = getPercentChange(current, previous);
    const assessment = getAssessment(metric.key, current, previous);
    return {

      ...metric,

      current,

      previous,

      difference: current - previous,

      percent,

      changeText: getChangeText(current, previous),

      assessment,

    };

  });

  const handleSelectFranchise = (franchise: AdminFranchise | null) => {

    setFranchiseId(franchise?.id ?? "");

    setFranchiseSearch(franchise ? getFranchiseName(franchise) : "");

    setShowFranchiseResults(false);

  };

  const handleExport = () => {

    exportExcel(

      PERIOD_OPTIONS.find((item) => item.value === period)?.label ?? period,

      range,

      metrics,

      previousMetrics,

      timeline,

      franchises,

      franchiseId,

    );

  };

  return (
    <div className="admin-page admin-franchise-analytics-page">
      <div className="admin-franchise-analytics-header">
        <div>
          <div className="admin-muted">
            Quản lý đại lý / Quản lý hiệu suất
          </div>
          <h1 className="admin-page-title">
            Phân tích hiệu suất
          </h1>
          <p className="admin-muted">
            Theo dõi đơn hàng, doanh thu, hoa hồng và sự phát triển
            mạng lưới đại lý.
          </p>
        </div>

        <div className="admin-franchise-analytics-header-actions">

          <button

            type="button"

            className="admin-button admin-button-secondary"

            onClick={handleExport}

            disabled={loading || !analytics}

          >

            Xuất Excel

          </button>

          <button

            type="button"

            className="admin-button admin-button-secondary"

            onClick={refreshAll}

            disabled={loading || franchisesLoading}

          >

            {loading || franchisesLoading

              ? "Đang tải..."

              : "Làm mới"}

          </button>

        </div>

      </div>

      <section className="admin-card admin-franchise-analytics-filters">

        <div className="admin-franchise-analytics-filter">

          <label htmlFor="analytics-franchise-search">

            Tìm đại lý

          </label>

          <div className="admin-franchise-analytics-search">

            <input

              id="analytics-franchise-search"

              type="search"

              value={franchiseSearch}

              placeholder="Tên, SĐT, email, mã đại lý..."

              autoComplete="off"

              onFocus={() => setShowFranchiseResults(true)}

              onChange={(event) => {

                setFranchiseSearch(event.target.value);

                setShowFranchiseResults(true);

              }}

              disabled={franchisesLoading}

            />

            {franchiseId && (

              <button

                type="button"

                className="admin-franchise-analytics-clear-search"

                aria-label="Bỏ chọn đại lý"

                onClick={() => handleSelectFranchise(null)}

              >

                ×

              </button>

            )}

            {showFranchiseResults && (

              <div className="admin-franchise-analytics-search-results">

                <button

                  type="button"

                  className="admin-franchise-analytics-search-option"

                  onClick={() => handleSelectFranchise(null)}

                >

                  <strong>Toàn hệ thống</strong>

                  <span>Tất cả đại lý</span>

                </button>

                {filteredFranchises.map((franchise) => (

                  <button

                    type="button"

                    key={franchise.id}

                    className="admin-franchise-analytics-search-option"

                    onClick={() => handleSelectFranchise(franchise)}

                  >

                    <strong>{getFranchiseName(franchise)}</strong>

                    <span>

                      {franchise.phone || "Chưa có số điện thoại"}

                      {" · "}

                      {franchise.email}

                    </span>

                  </button>

                ))}

                {filteredFranchises.length === 0 && (

                  <div className="admin-franchise-analytics-search-empty">

                    Không tìm thấy đại lý phù hợp.

                  </div>

                )}

                <button

                  type="button"

                  className="admin-franchise-analytics-search-close"

                  onClick={() => setShowFranchiseResults(false)}

                >

                  Đóng danh sách

                </button>

              </div>

            )}

          </div>

          {selectedFranchise && (

            <span className="admin-franchise-analytics-selected">

              Đang xem: {getFranchiseName(selectedFranchise)}

            </span>

          )}

        </div>

        <div className="admin-franchise-analytics-filter">

          <label htmlFor="analytics-period">Kỳ thống kê</label>

          <select

            id="analytics-period"

            value={period}

            onChange={(event) =>

              setPeriod(event.target.value as PeriodKey)

            }

          >

            {PERIOD_OPTIONS.map((option) => (

              <option key={option.value} value={option.value}>

                {option.label}

              </option>

            ))}

          </select>

        </div>

        <div className="admin-franchise-analytics-period-info">

          <span>Thời gian đang xem</span>

          <strong>{formatRangeLabel(range)}</strong>

          <span>Đối chiếu: {formatRangeLabel(previousRange)}</span>

        </div>

      </section>

      {franchisesError && (

        <div

          className="admin-franchise-analytics-error"

          role="alert"

        >

          {franchisesError}

        </div>

      )}

      {error && (

        <div

          className="admin-franchise-analytics-error"

          role="alert"

        >

          <span>{error}</span>

          <button

            type="button"

            onClick={() => void loadAnalytics()}

            disabled={loading}

          >

            Thử lại

          </button>

        </div>

      )}

      <section className="admin-franchise-analytics-summary">

        {METRIC_CONFIG.map((metric) => (

          <article

            key={metric.key}

            className="admin-card admin-franchise-analytics-stat"

            style={{ borderTopColor: metric.color }}

          >

            <div className="admin-franchise-analytics-stat-label">

              {metric.label}

            </div>

            <div className="admin-franchise-analytics-stat-value">

              {loading

                ? "—"

                : formatMetricValue(metric.key, metrics[metric.key])}

            </div>

            <div className="admin-franchise-analytics-stat-description">

              {loading

                ? "Đang cập nhật số liệu"

                : getChangeText(

                  metrics[metric.key],

                  previousMetrics[metric.key],

                )}

            </div>

          </article>

        ))}

      </section>

      <section className="admin-franchise-analytics-chart-card">
        <div className="admin-franchise-analytics-section-header">
          <div>
            <span className="admin-franchise-analytics-eyebrow">
              XU HƯỚNG KINH DOANH
            </span>

            <h2>Biểu đồ hiệu suất</h2>

            <p className="admin-muted">
              {formatRangeLabel(range)} · Hiển thị giá trị thực tế của từng chỉ số.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-card admin-franchise-analytics-empty">
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : (
          <div className="admin-franchise-analytics-chart-grid">
            {METRIC_CONFIG.map((metric) => (
              <article
                key={metric.key}
                className="admin-card admin-franchise-analytics-chart-item"
              >
                <div className="admin-franchise-analytics-chart-value">
                  <span>{metric.label}</span>

                  <strong>
                    {formatMetricValue(metric.key, metrics[metric.key])}
                  </strong>
                </div>

                <AnalyticsLineChart
                  data={timeline}
                  metric={metric}
                />
              </article>
            ))}
          </div>
        )}

        {!loading && (
          <div className="admin-franchise-analytics-chart-footer">
            <span>{timeline.length} mốc thời gian</span>

            <span>
              Di chuột vào biểu đồ để xem số liệu chi tiết.
            </span>
          </div>
        )}
      </section>

      <section className="admin-card admin-franchise-analytics-comparison-card">

        <div className="admin-franchise-analytics-section-header">

          <div>

            <span className="admin-franchise-analytics-eyebrow">

              SO SÁNH HIỆU SUẤT

            </span>

            <h2>Biến động so với kỳ trước</h2>

            <p className="admin-muted">

              Kỳ hiện tại: {formatRangeLabel(range)} · Kỳ đối chiếu:{" "}

              {formatRangeLabel(previousRange)}

            </p>

          </div>

        </div>

        <div className="admin-franchise-analytics-comparison-list">

          {comparisonMetrics.map((metric) => (

            <article

              key={metric.key}

              className="admin-franchise-analytics-comparison-item"

            >

              <div className="admin-franchise-analytics-comparison-top">

                <span

                  className="admin-franchise-analytics-legend-dot"

                  style={{ backgroundColor: metric.color }}

                />

                <strong>{metric.label}</strong>

              </div>

              <div className="admin-franchise-analytics-comparison-values">

                <div>

                  <span>Kỳ hiện tại</span>

                  <strong>

                    {formatMetricValue(metric.key, metric.current)}

                  </strong>

                </div>

                <div>

                  <span>Kỳ trước</span>

                  <strong>

                    {formatMetricValue(metric.key, metric.previous)}

                  </strong>

                </div>

              </div>

              <div

                className={`admin-franchise-analytics-change ${metric.difference > 0

                  ? "is-positive"

                  : metric.difference < 0

                    ? "is-negative"

                    : "is-neutral"

                  }`}

              >

                <strong>{metric.changeText}</strong>

                <span>

                  {metric.percent === null

                    ? metric.current > 0

                      ? "Tăng từ mức nền bằng 0"

                      : "Không xác định"

                    : `${metric.percent > 0 ? "+" : ""}${metric.percent.toFixed(1)}%`}

                </span>

              </div>

              <div className="admin-franchise-analytics-assessment">

                <strong>{metric.assessment.title}</strong>

                <p>{metric.assessment.advice}</p>

              </div>

            </article>

          ))}

        </div>

        <p className="admin-franchise-analytics-disclaimer">

          Nhận định và giải pháp là gợi ý dựa trên chiều biến động của

          chỉ số, không phải kết luận về nguyên nhân thực tế. Cần kiểm

          tra dữ liệu đơn hàng, hoạt động đại lý và lịch thanh toán

          trước khi đưa ra quyết định.

        </p>

      </section>

      <section className="admin-card admin-franchise-analytics-table-card">

        <div className="admin-franchise-analytics-section-header">

          <div>

            <span className="admin-franchise-analytics-eyebrow">

              DỮ LIỆU CHI TIẾT

            </span>

            <h2>Hiệu suất theo ngày</h2>

          </div>

        </div>

        <div className="admin-table-wrapper">

          <table className="admin-table">

            <thead>

              <tr>

                <th>Ngày</th>

                <th className="admin-franchise-analytics-number-cell">

                  Đơn hàng

                </th>

                <th className="admin-franchise-analytics-number-cell">

                  Doanh thu

                </th>

                <th className="admin-franchise-analytics-number-cell">

                  Hoa hồng đã thanh toán

                </th>

                <th className="admin-franchise-analytics-number-cell">

                  Đại lý mới

                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td colSpan={5} className="admin-franchise-analytics-empty">

                    Đang tải dữ liệu...

                  </td>

                </tr>

              ) : timeline.length === 0 ? (

                <tr>

                  <td colSpan={5} className="admin-franchise-analytics-empty">

                    Chưa có dữ liệu trong kỳ này.

                  </td>

                </tr>

              ) : (

                timeline.map((item) => (

                  <tr key={item.date}>

                    <td>{item.date}</td>

                    <td className="admin-franchise-analytics-number-cell">

                      {numberFormatter.format(item.orders)}

                    </td>

                    <td className="admin-franchise-analytics-number-cell">

                      {currencyFormatter.format(item.revenue)}

                    </td>

                    <td className="admin-franchise-analytics-number-cell">

                      {currencyFormatter.format(item.paidCommission)}

                    </td>

                    <td className="admin-franchise-analytics-number-cell">

                      {numberFormatter.format(item.newFranchises)}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        {!loading && (

          <div className="admin-franchise-analytics-table-footer">

            <span>Tổng đơn hàng</span>

            <strong>{numberFormatter.format(metrics.orders)}</strong>

            <span>Tổng doanh thu</span>

            <strong>{currencyFormatter.format(metrics.revenue)}</strong>

            <span>Hoa hồng đã thanh toán</span>

            <strong>

              {currencyFormatter.format(metrics.paidCommission)}

            </strong>

            <span>Đại lý mới</span>

            <strong>

              {numberFormatter.format(metrics.newFranchises)}

            </strong>

          </div>

        )}

      </section>

      {showFranchiseResults && (

        <button

          type="button"

          aria-label="Đóng danh sách tìm kiếm đại lý"

          className="admin-franchise-analytics-search-backdrop"

          onClick={() => setShowFranchiseResults(false)}

        />

      )}

    </div>

  );

}
