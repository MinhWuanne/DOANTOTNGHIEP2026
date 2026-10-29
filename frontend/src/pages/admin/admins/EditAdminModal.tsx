
import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  getAdminAccountById,
  updateAdminAccount,
  type AdminAccountDetail,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./EditAdminModal.css";

interface EditAdminModalProps {
  adminId: string;
  onClose: () => void;
  onUpdated: () => void;
}

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_DETAIL_FAILED":
      return "Không thể tải thông tin ADMIN.";

    case "ADMIN_UPDATE_FAILED":
      return "Không thể cập nhật ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền thực hiện thao tác này.";

    case "USERNAME_REQUIRED":
      return "Username không được để trống.";

    case "EMAIL_REQUIRED":
      return "Email không được để trống.";

    case "USERNAME_ALREADY_EXISTS":
      return "Username đã tồn tại.";

    case "EMAIL_ALREADY_EXISTS":
      return "Email đã tồn tại.";

    case "NO_FIELDS_TO_UPDATE":
      return "Không có thông tin nào được thay đổi.";

    default:
      return error;
  }
}

export default function EditAdminModal({
  adminId,
  onClose,
  onUpdated,
}: EditAdminModalProps) {
  const [admin, setAdmin] =
    useState<AdminAccountDetail | null>(null);

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

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
        setUsername(data.username);
        setEmail(data.email);
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
      setError(
        "Phiên đăng nhập đã hết hạn.",
      );
      return;
    }

    const trimmedUsername =
      username.trim();

    const trimmedEmail =
      email.trim();

    if (!trimmedUsername) {
      setError(
        "Username không được để trống.",
      );
      return;
    }

    if (!trimmedEmail) {
      setError(
        "Email không được để trống.",
      );
      return;
    }

    const usernameChanged =
      trimmedUsername !==
      admin?.username;

    const emailChanged =
      trimmedEmail !== admin?.email;

    if (
      !usernameChanged &&
      !emailChanged
    ) {
      setError(
        "Không có thông tin nào được thay đổi.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateAdminAccount(
        accessToken,
        adminId,
        {
          ...(usernameChanged
            ? {
                username:
                  trimmedUsername,
              }
            : {}),
          ...(emailChanged
            ? {
                email: trimmedEmail,
              }
            : {}),
        },
      );

      setSuccess(true);

      onUpdated();
    } catch (error) {
      if (error instanceof Error) {
        setError(
          getErrorLabel(error.message),
        );
      } else {
        setError(
          "Không thể cập nhật ADMIN.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-edit-overlay"
      onMouseDown={
        handleOverlayMouseDown
      }
    >
      <div
        className="admin-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-title"
      >
        <div className="admin-edit-header">
          <div>
            <span className="admin-edit-eyebrow">
              ADMIN ACCOUNT
            </span>

            <h2
              id="admin-edit-title"
              className="admin-edit-title"
            >
              Chỉnh sửa ADMIN
            </h2>

            <p className="admin-edit-description">
              Cập nhật thông tin tài khoản quản trị.
            </p>
          </div>

          <button
            type="button"
            className="admin-edit-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="admin-edit-state">
            <div className="admin-edit-spinner" />

            <p>
              Đang tải thông tin ADMIN...
            </p>
          </div>
        ) : error && !admin ? (
          <div className="admin-edit-state admin-edit-error-state">
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
            className="admin-edit-form"
            onSubmit={handleSubmit}
          >
            {admin && (
              <div className="admin-edit-account-summary">
                <div className="admin-edit-avatar">
                  {admin.username
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {admin.username}
                  </strong>

                  <span>
                    ID #{admin.id}
                  </span>
                </div>
              </div>
            )}

            <div className="admin-edit-fields">
              <label className="admin-edit-field">
                <span>
                  Username
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  autoComplete="username"
                  placeholder="Nhập username"
                />
              </label>

              <label className="admin-edit-field">
                <span>
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  autoComplete="email"
                  placeholder="Nhập email"
                />
              </label>
            </div>

            <div className="admin-edit-note">
              <strong>
                Lưu ý
              </strong>

              <span>
                Vai trò, trạng thái và mật khẩu
                được quản lý bằng các thao tác
                riêng.
              </span>
            </div>

            {error && (
              <div className="admin-edit-form-error">
                {error}
              </div>
            )}

            {success && (
              <div className="admin-edit-form-success">
                Cập nhật ADMIN thành công.
              </div>
            )}

            <div className="admin-edit-footer">
              <button
                type="button"
                className="admin-edit-cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-edit-save-button"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

