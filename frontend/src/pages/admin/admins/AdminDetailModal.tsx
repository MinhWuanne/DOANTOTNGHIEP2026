
import { useEffect, useState } from "react";

import {
  getAdminAccountById,
  type AdminAccountDetail,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminDetailModal.css";

interface AdminDetailModalProps {
  adminId: string;
  onClose: () => void;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(
  status: AdminAccountDetail["status"],
) {
  if (status === "ACTIVE") {
    return "Đang hoạt động";
  }

  return "Đã khóa";
}

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_DETAIL_FAILED":
      return "Không thể tải thông tin ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền xem thông tin ADMIN.";

    default:
      return error;
  }
}

export default function AdminDetailModal({
  adminId,
  onClose,
}: AdminDetailModalProps) {
  const [admin, setAdmin] =
    useState<AdminAccountDetail | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminDetail() {
      const accessToken = getAccessToken("SUPER_ADMIN");

      if (!accessToken) {
        if (!cancelled) {
          setError(
            "Phiên đăng nhập đã hết hạn.",
          );
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await getAdminAccountById(
            accessToken,
            adminId,
          );

        if (!cancelled) {
          setAdmin(data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof Error) {
          setError(
            getErrorLabel(error.message),
          );
        } else {
          setError(
            "Không thể tải thông tin ADMIN.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAdminDetail();

    return () => {
      cancelled = true;
    };
  }, [adminId]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  function handleOverlayMouseDown(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="admin-detail-overlay"
      onMouseDown={
        handleOverlayMouseDown
      }
    >
      <div
        className="admin-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-detail-title"
      >
        <div className="admin-detail-header">
          <div>
            <span className="admin-detail-eyebrow">
              ADMIN ACCOUNT
            </span>

            <h2
              id="admin-detail-title"
              className="admin-detail-title"
            >
              Chi tiết ADMIN
            </h2>

            <p className="admin-detail-description">
              Thông tin tài khoản quản trị hệ thống.
            </p>
          </div>

          <button
            type="button"
            className="admin-detail-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="admin-detail-state">
            <div className="admin-loading-spinner" />

            <p>
              Đang tải thông tin ADMIN...
            </p>
          </div>
        ) : error ? (
          <div className="admin-detail-state admin-detail-error-state">
            <strong>
              Không thể tải dữ liệu
            </strong>

            <p>{error}</p>

            <button
              type="button"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        ) : admin ? (
          <>
            <div className="admin-detail-body">
              <section className="admin-detail-section">
                <div className="admin-detail-section-title">
                  Tài khoản
                </div>

                <div className="admin-detail-grid">
                  <div className="admin-detail-field">
                    <span>Username</span>
                    <strong>
                      {admin.username}
                    </strong>
                  </div>

                  <div className="admin-detail-field">
                    <span>ID</span>
                    <strong>
                      #{admin.id}
                    </strong>
                  </div>

                  <div className="admin-detail-field admin-detail-field-full">
                    <span>Email</span>
                    <strong>
                      {admin.email}
                    </strong>
                  </div>

                  <div className="admin-detail-field">
                    <span>Vai trò</span>

                    <span className="admin-detail-role">
                      {admin.role}
                    </span>
                  </div>

                  <div className="admin-detail-field">
                    <span>Trạng thái</span>

                    <span
                      className={`admin-detail-status admin-detail-status-${admin.status.toLowerCase()}`}
                    >
                      <span className="admin-detail-status-dot" />

                      {getStatusLabel(
                        admin.status,
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="admin-detail-section">
                <div className="admin-detail-section-title">
                  Người tạo
                </div>

                {admin.createdBy ? (
                  <div className="admin-detail-creator">
                    <div className="admin-detail-creator-avatar">
                      {admin.createdBy.username
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="admin-detail-creator-info">
                      <strong>
                        {admin.createdBy.username}
                      </strong>

                      <span>
                        {admin.createdBy.email}
                      </span>

                      <small>
                        {admin.createdBy.role}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="admin-detail-empty">
                    Không xác định
                  </div>
                )}
              </section>

              <section className="admin-detail-section">
                <div className="admin-detail-section-title">
                  Thời gian
                </div>

                <div className="admin-detail-grid">
                  <div className="admin-detail-field">
                    <span>Ngày tạo</span>

                    <strong>
                      {formatDate(
                        admin.createdAt,
                      )}
                    </strong>
                  </div>

                  <div className="admin-detail-field">
                    <span>Cập nhật lần cuối</span>

                    <strong>
                      {formatDate(
                        admin.updatedAt,
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            </div>

            <div className="admin-detail-footer">
              <button
                type="button"
                className="admin-detail-close-button"
                onClick={onClose}
              >
                Đóng
              </button>
            </div>
          </>
        ) : (
          <div className="admin-detail-state">
            <p>
              Không tìm thấy thông tin ADMIN.
            </p>

            <button
              type="button"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}