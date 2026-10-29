import type { ReactNode } from "react";

import "./AdminPagination.css";

interface AdminPaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: 10 | 20 | 50) => void;
    showPageSize?: boolean;
}

function buildPageItems(
    page: number,
    totalPages: number,
): Array<number | "ellipsis-left" | "ellipsis-right"> {
    if (totalPages <= 7) {
        return Array.from(
            { length: totalPages },
            (_, index) => index + 1,
        );
    }

    if (page <= 4) {
        return [
            1,
            2,
            3,
            4,
            5,
            "ellipsis-right",
            totalPages,
        ];
    }

    if (page >= totalPages - 3) {
        return [
            1,
            "ellipsis-left",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        "ellipsis-left",
        page - 2,
        page - 1,
        page,
        page + 1,
        page + 2,
        "ellipsis-right",
        totalPages,
    ];
}

function AdminPagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
    onLimitChange,
    showPageSize = true,
}: AdminPaginationProps) {
    if (total === 0 || totalPages <= 0) {
        return null;
    }

    const safePage = Math.min(
        Math.max(page, 1),
        totalPages,
    );

    const start =
        (safePage - 1) * limit + 1;

    const end = Math.min(
        safePage * limit,
        total,
    );

    const pageItems = buildPageItems(
        safePage,
        totalPages,
    );

    function renderPageItem(
        item: number | "ellipsis-left" | "ellipsis-right",
    ): ReactNode {
        if (item === "ellipsis-left") {
            return (
                <span
                    key={item}
                    className="admin-pagination-ellipsis"
                >
                    ...
                </span>
            );
        }

        if (item === "ellipsis-right") {
            return (
                <span
                    key={item}
                    className="admin-pagination-ellipsis"
                >
                    ...
                </span>
            );
        }

        return (
            <button
                key={item}
                type="button"
                className={
                    item === safePage
                        ? "admin-pagination-page admin-pagination-page-active"
                        : "admin-pagination-page"
                }
                onClick={() => onPageChange(item)}
                disabled={item === safePage}
                aria-current={
                    item === safePage
                        ? "page"
                        : undefined
                }
            >
                {item}
            </button>
        );
    }

    return (
        <div className="admin-pagination">
            <div className="admin-pagination-info">
                <span>
                    Hiển thị{" "}
                    <strong>
                        {start.toLocaleString("vi-VN")}–
                        {end.toLocaleString("vi-VN")}
                    </strong>{" "}
                    / {total.toLocaleString("vi-VN")}
                </span>

                {showPageSize && onLimitChange && (
                    <label className="admin-pagination-size">
                        <span>Hiển thị</span>

                        <select
                            value={limit}
                            onChange={(event) =>
                                onLimitChange(
                                    Number(
                                        event.target.value,
                                    ) as 10 | 20 | 50,
                                )
                            }
                            aria-label="Số bản ghi mỗi trang"
                        >
                            <option value={10}>
                                10
                            </option>

                            <option value={20}>
                                20
                            </option>

                            <option value={50}>
                                50
                            </option>
                        </select>

                        <span>/ trang</span>
                    </label>
                )}
            </div>

            <div className="admin-pagination-controls">
                <button
                    type="button"
                    className="admin-pagination-arrow"
                    onClick={() =>
                        onPageChange(safePage - 1)
                    }
                    disabled={safePage <= 1}
                    aria-label="Trang trước"
                >
                    ‹
                </button>

                <div className="admin-pagination-pages">
                    {pageItems.map(renderPageItem)}
                </div>

                <button
                    type="button"
                    className="admin-pagination-arrow"
                    onClick={() =>
                        onPageChange(safePage + 1)
                    }
                    disabled={safePage >= totalPages}
                    aria-label="Trang sau"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

export default AdminPagination;