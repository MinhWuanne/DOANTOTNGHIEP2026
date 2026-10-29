
import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";

import {
  disableAdminAccount,
  enableAdminAccount,
  getAdminAccountById,
  type AdminAccount,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminStatusActionModal.css";

interface AdminStatusActionModalProps {
  adminId: string;
  action: "DISABLE" | "ENABLE";
  onClose: () => void;
  onUpdated: () => void;
}

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_DETAIL_FAILED":
      return "Không thể tải thông tin ADMIN.";

    case "ADMIN_DISABLE_FAILED":
      return "Không thể khóa ADMIN.";

    case "ADMIN_ENABLE_FAILED":
      return "Không thể mở khóa ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền thực hiện thao tác này.";

    case "ADMIN_ALREADY_DISABLED":
      return "ADMIN này đã bị khóa.";

    case "ADMIN_ALREADY_ACTIVE":
      return "ADMIN này đang ở trạng thái ACTIVE.";

    case "SUPER_ADMIN_CANNOT_BE_DISABLED":
      return "Không thể khóa tài khoản SUPER_ADMIN.";

    default:
      return error;
  }
}

export default function AdminStatusActionModal({
  adminId,
  action,
  onClose,
  onUpdated,
}: AdminStatusActionModalProps) {
  const [admin, setAdmin] =
    useState<AdminAccount | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
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

        if (cancelled) {
          return;
        }

        setAdmin(data);
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

    void loadAdmin();

    return () => {
      cancelled = true;
    };
  }, [adminId]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !processing
      ) {
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
  }, [onClose, processing]);

  function handleOverlayMouseDown(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      !processing
    ) {
      onClose();
    }
  }

  async function handleConfirm() {
    if (processing) {
      return;
    }

    const accessToken = getAccessToken("SUPER_ADMIN");

    if (!accessToken) {
      setError(
        "Phiên đăng nhập đã hết hạn.",
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      if (action === "DISABLE") {
        await disableAdminAccount(
          accessToken,
          adminId,
        );
      } else {
        await enableAdminAccount(
          accessToken,
          adminId,
        );
      }

      onUpdated();
    } catch (error) {
      if (error instanceof Error) {
        setError(
          getErrorLabel(error.message),
        );
      } else if (action === "DISABLE") {
        setError("Không thể khóa ADMIN.");
      } else {
        setError("Không thể mở khóa ADMIN.");
      }
    } finally {
      setProcessing(false);
    }
  }

  const isDisable = action === "DISABLE";

  const title = isDisable
    ? "Khóa tài khoản ADMIN?"
    : "Mở khóa tài khoản ADMIN?";

  const description = isDisable
    ? "ADMIN này sẽ không thể tiếp tục sử dụng tài khoản quản trị cho đến khi được mở khóa."
    : "ADMIN này sẽ được chuyển về trạng thái ACTIVE và có thể tiếp tục sử dụng tài khoản quản trị.";

  const confirmLabel = isDisable
    ? "Khóa ADMIN"
    : "Mở khóa";

  return (
    <div
      className="admin-status-overlay"
      onMouseDown={
        handleOverlayMouseDown
      }
    >
      <div
        className="admin-status-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-status-title"
      >
        <div className="admin-status-header">
          <div>
            <span className="admin-status-eyebrow">
              ADMIN ACCOUNT
            </span>

            <h2
              id="admin-status-title"
              className="admin-status-title"
            >
              {title}
            </h2>

            <p className="admin-status-description">
              {description}
            </p>
          </div>

          <button
            type="button"
            className="admin-status-close"
            onClick={onClose}
            disabled={processing}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="admin-status-state">
            <div className="admin-status-spinner" />

            <p>
              Đang tải thông tin ADMIN...
            </p>
          </div>
        ) : error && !admin ? (
          <div className="admin-status-state admin-status-error-state">
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
        ) : (
          <div className="admin-status-content">
            {admin && (
              <div className="admin-status-account">
                <div className="admin-status-avatar">
                  {admin.username
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="admin-status-account-info">
                  <strong>
                    {admin.username}
                  </strong>

                  <span>
                    {admin.email}
                  </span>
                </div>

                <span
                  className={`admin-status-badge ${
                    admin.status === "ACTIVE"
                      ? "is-active"
                      : "is-disabled"
                  }`}
                >
                  {admin.status}
                </span>
              </div>
            )}

            <div
              className={`admin-status-warning ${
                isDisable
                  ? "is-disable"
                  : "is-enable"
              }`}
            >
              <strong>
                {isDisable
                  ? "Xác nhận khóa tài khoản"
                  : "Xác nhận mở khóa tài khoản"}
              </strong>

              <span>
                {isDisable
                  ? "Sau khi khóa, ADMIN sẽ không thể đăng nhập vào khu vực quản trị."
                  : "Sau khi mở khóa, ADMIN có thể đăng nhập lại vào khu vực quản trị."}
              </span>
            </div>

            {error && (
              <div className="admin-status-form-error">
                {error}
              </div>
            )}

            <div className="admin-status-footer">
              <button
                type="button"
                className="admin-status-cancel-button"
                onClick={onClose}
                disabled={processing}
              >
                Hủy
              </button>

              <button
                type="button"
                className={`admin-status-confirm-button ${
                  isDisable
                    ? "is-disable"
                    : "is-enable"
                }`}
                onClick={handleConfirm}
                disabled={
                  processing ||
                  !admin
                }
              >
                {processing
                  ? "Đang xử lý..."
                  : confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
