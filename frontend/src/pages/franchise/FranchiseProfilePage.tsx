
import { useCallback, useEffect, useState } from "react";
import {
  getFranchiseProfile,
  updateFranchiseFullName,
  type FranchisePersonalProfile,
} from "../../services/api/franchise-profile.api";
import "./FranchiseProfilePage.css";

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const messages: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Phiên đăng nhập không hợp lệ.",
    AUTH_ME_FAILED: "Không thể xác minh phiên đăng nhập.",
    PERSON_ID_NOT_FOUND: "Không tìm thấy thông tin định danh.",
    PROFILE_LOAD_FAILED: "Không thể tải hồ sơ cá nhân.",
    PROFILE_UPDATE_FAILED: "Không thể cập nhật họ tên.",
    FULL_NAME_REQUIRED: "Vui lòng nhập họ tên hợp lệ.",
    PERSON_NOT_FOUND: "Không tìm thấy hồ sơ cá nhân.",
  };

  return messages[error.message] ?? error.message;
}

function getAccountStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    LOCKED: "Đã khóa",
    INACTIVE: "Không hoạt động",
    SUSPENDED: "Tạm ngưng",
    TERMINATED: "Đã chấm dứt",
  };

  return labels[status] ?? status;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function FranchiseProfilePage() {
  const [profile, setProfile] =
    useState<FranchisePersonalProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getFranchiseProfile();
      setProfile(result);
      setFullName(result.fullName ?? "");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const franchiseAccount = profile?.accounts.find(
    (account) => account.platform === "FRANCHISE",
  );

  const franchiseProfile = franchiseAccount?.franchiseProfile;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setError("Vui lòng nhập họ tên.");
      return;
    }

    if (trimmedName.length > 150) {
      setError("Họ tên không được vượt quá 150 ký tự.");
      return;
    }

    if (trimmedName === profile?.fullName) {
      setEditing(false);
      return;
    }

    setSaving(true);

    try {
      const updated = await updateFranchiseFullName(trimmedName);
      setProfile(updated);
      setFullName(updated.fullName);
      setEditing(false);
      setSuccess("Đã cập nhật họ tên thành công.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setFullName(profile?.fullName ?? "");
    setEditing(false);
    setError(null);
    setSuccess(null);
  }

  return (
    <section className="franchise-profile-page">
      <div className="franchise-profile-container">
        <div className="franchise-profile-breadcrumb">
          <span>Tài khoản</span>
          <span aria-hidden="true">/</span>
          <strong>Hồ sơ cá nhân</strong>
        </div>

        <header className="franchise-profile-heading">
          <div>
            <span className="franchise-profile-eyebrow">
              ICONDENIM · FRANCHISE PORTAL
            </span>
            <h1>Hồ sơ cá nhân</h1>
            <p>
              Quản lý thông tin định danh và theo dõi trạng thái tài khoản
              đại lý của bạn.
            </p>
          </div>

          <div className="franchise-profile-heading-mark" aria-hidden="true">
            ID
          </div>
        </header>

        {error && (
          <div className="franchise-profile-alert franchise-profile-alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="franchise-profile-alert franchise-profile-alert-success" role="status">
            {success}
          </div>
        )}

        {loading ? (
          <div className="franchise-profile-loading">
            Đang tải hồ sơ cá nhân...
          </div>
        ) : profile ? (
          <>
            <section className="franchise-profile-identity">
              <div className="franchise-profile-avatar" aria-hidden="true">
                {(profile.fullName.trim().charAt(0) || "F").toUpperCase()}
              </div>

              <div className="franchise-profile-identity-info">
                <span>ĐẠI LÝ FRANCHISE</span>
                <h2>{profile.fullName || "Chưa cập nhật họ tên"}</h2>
                <p>
                  Mã đại lý:{" "}
                  <strong>{franchiseProfile?.franchiseCode ?? "Chưa có mã"}</strong>
                </p>
              </div>

              <div className="franchise-profile-status">
                <span className="franchise-profile-status-label">
                  Trạng thái tài khoản
                </span>
                <strong
                  className={
                    franchiseAccount?.status === "ACTIVE"
                      ? "is-active"
                      : "is-inactive"
                  }
                >
                  <span />
                  {getAccountStatus(franchiseAccount?.status ?? "UNKNOWN")}
                </strong>
              </div>
            </section>

            <section className="franchise-profile-card">
              <div className="franchise-profile-card-heading">
                <div>
                  <span className="franchise-profile-section-index">01 / THÔNG TIN</span>
                  <h2>Thông tin cá nhân</h2>
                  <p>Họ tên có thể chỉnh sửa. Email và số điện thoại được giữ nguyên theo thông tin tài khoản.</p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    className="franchise-profile-button franchise-profile-button-secondary"
                    onClick={() => {
                      setEditing(true);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                )}
              </div>

              <form onSubmit={handleSave}>
                <div className="franchise-profile-fields">
                  <label className="franchise-profile-field">
                    <span>Họ và tên</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={!editing || saving}
                      maxLength={150}
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className="franchise-profile-field">
                    <span>Email</span>
                    <input
                      type="text"
                      value={franchiseAccount?.email ?? "Chưa cập nhật"}
                      readOnly
                      disabled
                    />
                  </label>

                  <label className="franchise-profile-field">
                    <span>Số điện thoại</span>
                    <input
                      type="text"
                      value={franchiseAccount?.phone ?? "Chưa cập nhật"}
                      readOnly
                      disabled
                    />
                  </label>

                  <label className="franchise-profile-field">
                    <span>Ngày tham gia</span>
                    <input
                      type="text"
                      value={formatDate(franchiseProfile?.joinedAt)}
                      readOnly
                      disabled
                    />
                  </label>
                </div>

                {editing && (
                  <div className="franchise-profile-form-actions">
                    <button
                      type="button"
                      className="franchise-profile-button franchise-profile-button-secondary"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      className="franchise-profile-button franchise-profile-button-primary"
                      disabled={saving}
                    >
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                )}
              </form>
            </section>

            <section className="franchise-profile-card franchise-profile-account-card">
              <div>
                <span className="franchise-profile-section-index">02 / TÀI KHOẢN</span>
                <h2>Thông tin đại lý</h2>
                <p>Thông tin nhận diện tài khoản trên hệ thống Franchise.</p>
              </div>

              <div className="franchise-profile-account-details">
                <div>
                  <span>Nền tảng</span>
                  <strong>FRANCHISE</strong>
                </div>
                <div>
                  <span>Trạng thái đại lý</span>
                  <strong>
                    {getAccountStatus(franchiseProfile?.status ?? "UNKNOWN")}
                  </strong>
                </div>
                <div>
                  <span>Ngày tạo tài khoản</span>
                  <strong>{formatDate(franchiseAccount?.createdAt)}</strong>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="franchise-profile-empty">
            <h2>Không có dữ liệu hồ sơ</h2>
            <p>Không thể hiển thị thông tin tài khoản Franchise của bạn.</p>
            <button
              type="button"
              className="franchise-profile-button franchise-profile-button-primary"
              onClick={() => void loadProfile()}
            >
              Thử tải lại
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default FranchiseProfilePage;
