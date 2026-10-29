import { useState } from "react";
import type { FormEvent } from "react";

import {
createAdminAccount,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./CreateAdminModal.css";

interface CreateAdminModalProps {
onClose: () => void;
onCreated: () => void;
}

function getErrorLabel(error: string) {
switch (error) {
case "USERNAME_REQUIRED":
return "Vui lòng nhập username.";


case "EMAIL_REQUIRED":
  return "Vui lòng nhập email.";

case "PASSWORD_REQUIRED":
  return "Vui lòng nhập mật khẩu.";

case "PASSWORD_TOO_SHORT":
  return "Mật khẩu chưa đủ độ dài yêu cầu.";

case "USERNAME_ALREADY_EXISTS":
  return "Username đã tồn tại.";

case "EMAIL_ALREADY_EXISTS":
  return "Email đã tồn tại.";

case "SUPER_ADMIN_CREATION_NOT_ALLOWED":
  return "Không được phép tạo tài khoản SUPER_ADMIN.";

case "SUPER_ADMIN_REQUIRED":
  return "Bạn không có quyền thực hiện thao tác này.";

case "ADMIN_AUTHORIZATION_REQUIRED":
  return "Phiên đăng nhập quản trị không hợp lệ.";

default:
  return error;


}
}

export default function CreateAdminModal({
onClose,
onCreated,
}: CreateAdminModalProps) {
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleSubmit(
event: FormEvent<HTMLFormElement>,
) {
event.preventDefault();


setError("");

const accessToken = getAccessToken("SUPER_ADMIN");

if (!accessToken) {
  setError(
    "Phiên đăng nhập đã hết hạn.",
  );
  return;
}

setLoading(true);

try {
  await createAdminAccount(
    accessToken,
    {
      username,
      email,
      password,
    },
  );

  onCreated();
} catch (error) {
  if (error instanceof Error) {
    setError(
      getErrorLabel(error.message),
    );
  } else {
    setError(
      "Không thể tạo tài khoản ADMIN.",
    );
  }
} finally {
  setLoading(false);
}


}

return (
<div
className="create-admin-overlay"
onMouseDown={(event) => {
if (
event.target === event.currentTarget &&
!loading
) {
onClose();
}
}}
> <div
     className="create-admin-modal"
     role="dialog"
     aria-modal="true"
     aria-labelledby="create-admin-title"
   > <div className="create-admin-header"> <div> <span className="create-admin-eyebrow">
ADMINISTRATION </span>


        <h2 id="create-admin-title">
          Tạo tài khoản ADMIN
        </h2>

        <p>
          Tạo một tài khoản quản trị mới cho hệ thống.
        </p>
      </div>

      <button
        type="button"
        className="create-admin-close"
        onClick={onClose}
        disabled={loading}
        aria-label="Đóng"
      >
        ×
      </button>
    </div>

    <form
      className="create-admin-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="create-admin-error">
          {error}
        </div>
      )}

      <label className="create-admin-field">
        <span>
          Username
          <b>*</b>
        </span>

        <input
          type="text"
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          placeholder="Nhập username"
          autoComplete="username"
          disabled={loading}
          autoFocus
        />
      </label>

      <label className="create-admin-field">
        <span>
          Email
          <b>*</b>
        </span>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="admin@example.com"
          autoComplete="email"
          disabled={loading}
        />
      </label>

      <label className="create-admin-field">
        <span>
          Password
          <b>*</b>
        </span>

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          placeholder="Nhập mật khẩu"
          autoComplete="new-password"
          disabled={loading}
        />
      </label>

      <div className="create-admin-note">
        Tài khoản mới sẽ được tạo với quyền{" "}
        <strong>ADMIN</strong> và trạng thái{" "}
        <strong>ACTIVE</strong>.
      </div>

      <div className="create-admin-actions">
        <button
          type="button"
          className="create-admin-cancel"
          onClick={onClose}
          disabled={loading}
        >
          Hủy
        </button>

        <button
          type="submit"
          className="create-admin-submit"
          disabled={loading}
        >
          {loading
            ? "Đang tạo..."
            : "Tạo ADMIN"}
        </button>
      </div>
    </form>
  </div>
</div>


);
}
