
import { useCallback, useEffect, useState } from "react";
import {
    getFranchiseCommissions,
    type FranchiseCommissionItem,
    type FranchiseCommissionPeriod,
    type FranchiseCommissionsResponse,
} from "../../services/api/franchise-dashboard.api";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "./FranchiseCommissionPage.css";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
});

const periodOptions: {
    value: FranchiseCommissionPeriod;
    label: string;
}[] = [
    { value: "today", label: "Hôm nay" },
    { value: "7days", label: "7 ngày gần nhất" },
    { value: "week", label: "Tuần này" },
    { value: "month", label: "Tháng này" },
    { value: "year", label: "Năm nay" },
    { value: "custom", label: "Khoảng ngày tùy chỉnh" },
];

const statusLabels: Record<string, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    PAID: "Đã thanh toán",
    CANCELLED: "Đã hủy",
};

function formatCurrency(value: string | number): string {
    const amount = Number(value);

    return Number.isFinite(amount)
        ? currencyFormatter.format(amount)
        : "—";
}

function formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : dateFormatter.format(date);
}

function formatDateOnly(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : dateOnlyFormatter.format(date);
}

function formatChartPeriod(value: string): string {
    const parts = value.split("-");

    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
    }

    if (parts.length === 2) {
        return `${parts[1]}/${parts[0]}`;
    }

    return value;
}

function getErrorMessage(error: unknown): string {
    const code = error instanceof Error ? error.message : "";

    const messages: Record<string, string> = {
        AUTHORIZATION_REQUIRED:
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        INVALID_FRANCHISE_ACCOUNT:
            "Tài khoản nhượng quyền không hợp lệ.",
        INVALID_API_RESPONSE:
            "Dữ liệu phản hồi từ máy chủ không hợp lệ.",
        INVALID_COMMISSION_PERIOD:
            "Khoảng thời gian thống kê không hợp lệ.",
        INVALID_COMMISSION_DATE_RANGE:
            "Ngày bắt đầu và ngày kết thúc không hợp lệ.",
        FRANCHISE_API_REQUEST_FAILED:
            "Không thể tải dữ liệu hoa hồng.",
    };

    return messages[code] ??
        "Không thể tải dữ liệu hoa hồng. Vui lòng thử lại.";
}

function getStatusClass(status: string): string {
    const classes: Record<string, string> = {
        PENDING: "pending",
        APPROVED: "approved",
        PAID: "paid",
        CANCELLED: "cancelled",
    };

    return classes[status] ?? "default";
}

export default function FranchiseCommissionPage() {
    const [period, setPeriod] =
        useState<FranchiseCommissionPeriod>("month");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [appliedPeriod, setAppliedPeriod] =
        useState<FranchiseCommissionPeriod>("month");
    const [appliedFrom, setAppliedFrom] = useState("");
    const [appliedTo, setAppliedTo] = useState("");

    const [data, setData] =
        useState<FranchiseCommissionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const loadCommissions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getFranchiseCommissions(
                appliedPeriod,
                appliedPeriod === "custom" ? appliedFrom : undefined,
                appliedPeriod === "custom" ? appliedTo : undefined,
            );

            setData(result);
        } catch (loadError) {
            setData(null);
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }, [appliedPeriod, appliedFrom, appliedTo]);

    useEffect(() => {
        void loadCommissions();
    }, [loadCommissions, reloadKey]);

    function handlePeriodChange(
        nextPeriod: FranchiseCommissionPeriod,
    ) {
        setPeriod(nextPeriod);

        if (nextPeriod !== "custom") {
            setAppliedPeriod(nextPeriod);
            setAppliedFrom("");
            setAppliedTo("");
        }
    }

    function handleApplyCustomRange() {
        if (!from || !to) {
            setError("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
            return;
        }

        if (from > to) {
            setError("Ngày bắt đầu không được sau ngày kết thúc.");
            return;
        }

        setAppliedFrom(from);
        setAppliedTo(to);
        setAppliedPeriod("custom");
        setReloadKey((current) => current + 1);
    }

    const chartData = (data?.chart ?? []).map((item) => ({
        ...item,
        label: formatChartPeriod(item.period),
    }));

    const items: FranchiseCommissionItem[] = data?.items ?? [];

    return (
        <main className="franchise-commission-page">
            <div className="franchise-commission-container">
                <header className="franchise-commission-heading">
                    <div>
                        <span className="franchise-commission-eyebrow">
                            FRANCHISE FINANCE
                        </span>
                        <h1>Hoa hồng của tôi</h1>
                        <p>
                            Theo dõi hoa hồng phát sinh, trạng thái duyệt
                            và khoản tiền đã được thanh toán.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="franchise-commission-refresh"
                        onClick={() =>
                            setReloadKey((current) => current + 1)
                        }
                        disabled={loading}
                    >
                        {loading ? "Đang tải..." : "Làm mới dữ liệu"}
                    </button>
                </header>

                <section
                    className="franchise-commission-filters"
                    aria-label="Bộ lọc hoa hồng"
                >
                    <label>
                        <span>Thời gian thống kê</span>
                        <select
                            value={period}
                            onChange={(event) =>
                                handlePeriodChange(
                                    event.target.value as FranchiseCommissionPeriod,
                                )
                            }
                        >
                            {periodOptions.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {period === "custom" && (
                        <>
                            <label>
                                <span>Từ ngày</span>
                                <input
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    onChange={(event) =>
                                        setFrom(event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                <span>Đến ngày</span>
                                <input
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(event) =>
                                        setTo(event.target.value)
                                    }
                                />
                            </label>

                            <button
                                type="button"
                                className="franchise-commission-apply"
                                onClick={handleApplyCustomRange}
                                disabled={loading}
                            >
                                Áp dụng
                            </button>
                        </>
                    )}
                </section>

                {error && (
                    <div
                        className="franchise-commission-alert"
                        role="alert"
                    >
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() =>
                                setReloadKey((current) => current + 1)
                            }
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {data && (
                    <p className="franchise-commission-date-range">
                        Khoảng thời gian:{" "}
                        <strong>
                            {formatDateOnly(data.dateRange.from)}
                        </strong>
                        {" — "}
                        <strong>
                            {formatDateOnly(data.dateRange.to)}
                        </strong>
                    </p>
                )}

                <section
                    className="franchise-commission-summary"
                    aria-label="Tổng quan hoa hồng"
                >
                    <article className="franchise-commission-card franchise-commission-card-primary">
                        <span>Tổng hoa hồng</span>
                        <strong>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(
                                    data?.summary.totalCommission ?? 0,
                                )}
                        </strong>
                        <p>
                            {data?.summary.totalOrders ?? 0} bản ghi hợp lệ
                        </p>
                    </article>

                    <article className="franchise-commission-card">
                        <span>Chờ duyệt</span>
                        <strong>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(
                                    data?.summary.pendingAmount ?? 0,
                                )}
                        </strong>
                        <p>Hoa hồng đang chờ xử lý</p>
                    </article>

                    <article className="franchise-commission-card">
                        <span>Đã duyệt</span>
                        <strong>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(
                                    data?.summary.approvedAmount ?? 0,
                                )}
                        </strong>
                        <p>Đã duyệt, chưa thanh toán</p>
                    </article>

                    <article className="franchise-commission-card">
                        <span>Đã thanh toán</span>
                        <strong>
                            {loading
                                ? "Đang tải..."
                                : formatCurrency(
                                    data?.summary.paidAmount ?? 0,
                                )}
                        </strong>
                        <p>Hoa hồng đã thanh toán</p>
                    </article>
                </section>

                <section
                    className="franchise-commission-chart-section"
                    aria-labelledby="franchise-commission-chart-title"
                >
                    <div className="franchise-commission-section-heading">
                        <div>
                            <span className="franchise-commission-eyebrow">
                                COMMISSION PERFORMANCE
                            </span>
                            <h2 id="franchise-commission-chart-title">
                                Biến động hoa hồng
                            </h2>
                            <p>
                                Tổng tiền hoa hồng hợp lệ theo từng ngày hoặc tháng.
                            </p>
                        </div>
                    </div>

                    <div className="franchise-commission-chart">
                        {loading ? (
                            <p className="franchise-commission-empty">
                                Đang tải biểu đồ...
                            </p>
                        ) : chartData.length === 0 ? (
                            <p className="franchise-commission-empty">
                                Chưa có dữ liệu hoa hồng trong khoảng thời gian này.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{
                                        top: 12,
                                        right: 20,
                                        left: 8,
                                        bottom: 8,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="franchiseCommissionGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#536b4d"
                                                stopOpacity={0.28}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#536b4d"
                                                stopOpacity={0.02}
                                            />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12 }}
                                        minTickGap={20}
                                    />

                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value: number) =>
                                            new Intl.NumberFormat("vi-VN", {
                                                notation: "compact",
                                                maximumFractionDigits: 1,
                                            }).format(value)
                                        }
                                        width={65}
                                    />

                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === "amount"
                                                ? formatCurrency(Number(value ?? 0))
                                                : Number(value ?? 0),
                                            name === "amount"
                                                ? "Hoa hồng"
                                                : "Số đơn",
                                        ]}
                                        labelFormatter={(_, payload) => {
                                            const item = payload?.[0]?.payload;
                                            return item?.period ?? "";
                                        }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        name="amount"
                                        stroke="#536b4d"
                                        strokeWidth={2.5}
                                        fill="url(#franchiseCommissionGradient)"
                                        activeDot={{ r: 5 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                <section
                    className="franchise-commission-history"
                    aria-labelledby="franchise-commission-history-title"
                >
                    <div className="franchise-commission-history-heading">
                        <div>
                            <span className="franchise-commission-eyebrow">
                                COMMISSION HISTORY
                            </span>
                            <h2 id="franchise-commission-history-title">
                                Lịch sử hoa hồng
                            </h2>
                            <p>
                                Danh sách hoa hồng phát sinh trong khoảng thời gian đã chọn.
                            </p>
                        </div>

                        <span className="franchise-commission-count">
                            {items.length} bản ghi
                        </span>
                    </div>

                    <div className="franchise-commission-table-wrapper">
                        <table className="franchise-commission-table">
                            <thead>
                                <tr>
                                    <th>Mã đơn hàng</th>
                                    <th>Thời gian</th>
                                    <th>Tiền hoa hồng</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="franchise-commission-empty"
                                        >
                                            Đang tải lịch sử hoa hồng...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="franchise-commission-empty"
                                        >
                                            Chưa có hoa hồng trong khoảng thời gian này.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>
                                                    {item.orderNumber || item.orderId}
                                                </strong>
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td className="franchise-commission-amount">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        "franchise-commission-status " +
                                                        `franchise-commission-status-${getStatusClass(item.status)}`
                                                    }
                                                >
                                                    {statusLabels[item.status] ??
                                                        item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <footer className="franchise-commission-footer">
                    <span>ICONDENIM</span>
                    <span>FRANCHISE COMMISSION MANAGEMENT</span>
                </footer>
            </div>
        </main>
    );
}
