
import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  getAdminAccountById,
  updateAdminAccount,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./ChangeAdminPasswordModal.css";

interface ChangeAdminPasswordModalProps {
  adminId: string;
  onClose: () => void;
  onUpdated: () => void;
}

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_DETAIL_FAILED":
      return "Không thể tải thông tin ADMIN.";

    case "ADMIN_UPDATE_FAILED":
      return "Không thể đổi mật khẩu ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền thực hiện thao tác này.";

    case "PASSWORD_REQUIRED":
      return "Mật khẩu không được để trống.";

    case "PASSWORD_TOO_SHORT":
      return "Mật khẩu phải có ít nhất 6 ký tự.";

    case "NO_FIELDS_TO_UPDATE":
      return "Không có thông tin nào được thay đổi.";

    default:
      return error;
  }
}

export default function ChangeAdminPasswordModal({
  adminId,
  onClose,
  onUpdated,
}: ChangeAdminPasswordModalProps) {
  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      const accessToken = getAccessToken("SUPER_ADMIN");

      if (!accessToken) {
        if (!cancelled) {
          setError("Phiên đăng nhập đã hết hạn.");
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setError("");

      try {
        const admin =
          await getAdminAccountById(
            accessToken,
            adminId,
          );

        if (cancelled) {
          return;
        }

        setUsername(admin.username);
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
      if (event.key === "Escape" && !saving) {
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
  }, [onClose, saving]);

  function handleOverlayMouseDown(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      !saving
    ) {
      onClose();
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const accessToken = getAccessToken("SUPER_ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập đã hết hạn.");
      return;
    }

    if (!password) {
      setError("Mật khẩu không được để trống.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Mật khẩu phải có ít nhất 6 ký tự.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu xác nhận không khớp.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateAdminAccount(
        accessToken,
        adminId,
        {
          password,
        },
      );

      onUpdated();
    } catch (error) {
      if (error instanceof Error) {
        setError(
          getErrorLabel(error.message),
        );
      } else {
        setError(
          "Không thể đổi mật khẩu ADMIN.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-password-overlay"
      onMouseDown={
        handleOverlayMouseDown
      }
    >
      <div
        className="admin-password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-password-title"
      >
        <div className="admin-password-header">
          <div>
            <span className="admin-password-eyebrow">
              ADMIN ACCOUNT
            </span>

            <h2
              id="admin-password-title"
              className="admin-password-title"
            >
              Đổi mật khẩu
            </h2>

            <p className="admin-password-description">
              Thay đổi mật khẩu đăng nhập của tài
              khoản quản trị.
            </p>
          </div>

          <button
            type="button"
            className="admin-password-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="admin-password-state">
            <div className="admin-password-spinner" />

            <p>
              Đang tải thông tin ADMIN...
            </p>
          </div>
        ) : error && !username ? (
          <div className="admin-password-state admin-password-error-state">
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
          <form
            className="admin-password-form"
            onSubmit={handleSubmit}
          >
            <div className="admin-password-account">
              <div className="admin-password-avatar">
                {username
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <strong>{username}</strong>

                <span>
                  Tài khoản ADMIN
                </span>
              </div>
            </div>

            <div className="admin-password-fields">
              <label className="admin-password-field">
                <span>
                  Mật khẩu mới
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                />
              </label>

              <label className="admin-password-field">
                <span>
                  Xác nhận mật khẩu
                </span>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </label>
            </div>

            <div className="admin-password-note">
              <strong>
                Lưu ý
              </strong>

              <span>
                Mật khẩu mới sẽ thay thế mật khẩu
                hiện tại của tài khoản ADMIN này.
              </span>
            </div>

            {error && (
              <div className="admin-password-form-error">
                {error}
              </div>
            )}

            <div className="admin-password-footer">
              <button
                type="button"
                className="admin-password-cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-password-save-button"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
