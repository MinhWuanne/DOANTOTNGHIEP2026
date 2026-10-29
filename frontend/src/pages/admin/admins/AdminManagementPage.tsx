
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  getAdminAccounts,
  type AdminAccount,
} from "../../../services/api/admin.api";

import { getAccessToken } from "../../../utils/auth";

import "./AdminManagementPage.css";
import CreateAdminModal from "./CreateAdminModal";
import AdminDetailModal from "./AdminDetailModal";
import EditAdminModal from "./EditAdminModal";
import ChangeAdminPasswordModal from "./ChangeAdminPasswordModal";
import AdminStatusActionModal from "./AdminStatusActionModal";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "DISABLED";

interface ActionMenuPosition {
  top: number;
  left: number;
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
  status: AdminAccount["status"],
) {
  if (status === "ACTIVE") {
    return "Đang hoạt động";
  }

  return "Đã khóa";
}

function getErrorLabel(error: string) {
  switch (error) {
    case "ADMIN_LIST_FAILED":
      return "Không thể tải danh sách ADMIN.";

    case "ADMIN_DETAIL_FAILED":
      return "Không thể tải thông tin ADMIN.";

    case "ADMIN_AUTHORIZATION_REQUIRED":
      return "Phiên đăng nhập quản trị không hợp lệ.";

    case "SUPER_ADMIN_REQUIRED":
      return "Bạn không có quyền truy cập khu vực này.";

    default:
      return error;
  }
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createModalOpen, setCreateModalOpen] =
    useState(false);

  const [detailModalOpen, setDetailModalOpen] =
    useState(false);

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  const [passwordModalOpen, setPasswordModalOpen] =
    useState(false);

  const [statusModalOpen, setStatusModalOpen] =
    useState(false);

  const [selectedStatusAdminId, setSelectedStatusAdminId] =
    useState<string | null>(null);

  const [statusAction, setStatusAction] =
    useState<"DISABLE" | "ENABLE" | null>(null);

  const [selectedPasswordAdminId, setSelectedPasswordAdminId] =
    useState<string | null>(null);

  const [selectedEditAdminId, setSelectedEditAdminId] =
    useState<string | null>(null);

  const [selectedAdminId, setSelectedAdminId] =
    useState<string | null>(null);

  const [activeMenuAdminId, setActiveMenuAdminId] =
    useState<string | null>(null);

  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

  const actionButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const actionMenuRef =
    useRef<HTMLDivElement | null>(null);

  async function loadAdmins() {
    const accessToken = getAccessToken("SUPER_ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập đã hết hạn.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setActiveMenuAdminId(null);
    setActionMenuPosition(null);

    try {
      const data =
        await getAdminAccounts(accessToken);

      setAdmins(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(getErrorLabel(error.message));
      } else {
        setError(
          "Không thể tải danh sách ADMIN.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return admins.filter((admin) => {
      const matchesSearch =
        keyword === "" ||
        admin.username
          .toLowerCase()
          .includes(keyword) ||
        admin.email
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        admin.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [admins, search, statusFilter]);

  function closeActionMenu() {
    setActiveMenuAdminId(null);
    setActionMenuPosition(null);
  }

  function openAdminEdit(
    admin: AdminAccount,
  ) {
    closeActionMenu();
    setSelectedEditAdminId(admin.id);
    setEditModalOpen(true);
  }

  function closeAdminEdit() {
    setEditModalOpen(false);
    setSelectedEditAdminId(null);
  }

  function openAdminPasswordChange(
    admin: AdminAccount,
  ) {
    closeActionMenu();
    setSelectedPasswordAdminId(admin.id);
    setPasswordModalOpen(true);
  }

  function closeAdminPasswordChange() {
    setPasswordModalOpen(false);
    setSelectedPasswordAdminId(null);
  }

  function openAdminStatusAction(
    admin: AdminAccount,
  ) {
    closeActionMenu();

    setSelectedStatusAdminId(admin.id);

    setStatusAction(
      admin.status === "ACTIVE"
        ? "DISABLE"
        : "ENABLE",
    );

    setStatusModalOpen(true);
  }

  function closeAdminStatusAction() {
    setStatusModalOpen(false);
    setSelectedStatusAdminId(null);
    setStatusAction(null);
  }

  function updateActionMenuPosition() {
    const button = actionButtonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    const menuWidth = 178;
    const menuHeight = 155;
    const gap = 6;
    const viewportPadding = 8;

    const preferredLeft =
      rect.right - menuWidth;

    const left = Math.min(
      Math.max(
        preferredLeft,
        viewportPadding,
      ),
      Math.max(
        viewportPadding,
        window.innerWidth -
        menuWidth -
        viewportPadding,
      ),
    );

    const hasSpaceBelow =
      rect.bottom +
      gap +
      menuHeight <=
      window.innerHeight -
      viewportPadding;

    const top = hasSpaceBelow
      ? rect.bottom + gap
      : Math.max(
        viewportPadding,
        rect.top -
        menuHeight -
        gap,
      );

    setActionMenuPosition({
      top,
      left,
    });
  }

  function toggleActionMenu(
    admin: AdminAccount,
    button: HTMLButtonElement,
  ) {
    if (activeMenuAdminId === admin.id) {
      closeActionMenu();
      return;
    }

    actionButtonRef.current = button;
    setActiveMenuAdminId(admin.id);

    requestAnimationFrame(() => {
      updateActionMenuPosition();
    });
  }

  function openAdminDetail(
    admin: AdminAccount,
  ) {
    closeActionMenu();
    setSelectedAdminId(admin.id);
    setDetailModalOpen(true);
  }

  function closeAdminDetail() {
    setDetailModalOpen(false);
    setSelectedAdminId(null);
  }

  useEffect(() => {
    if (!activeMenuAdminId) {
      return;
    }

    function handleViewportChange() {
      updateActionMenuPosition();
    }

    function handleOutsidePointerDown(
      event: MouseEvent,
    ) {
      const target = event.target as Node;

      if (
        actionMenuRef.current?.contains(
          target,
        ) ||
        actionButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      closeActionMenu();
    }

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    document.addEventListener(
      "mousedown",
      handleOutsidePointerDown,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );

      document.removeEventListener(
        "mousedown",
        handleOutsidePointerDown,
      );
    };
  }, [activeMenuAdminId]);

  const activeMenuAdmin =
    activeMenuAdminId
      ? admins.find(
        (admin) =>
          admin.id === activeMenuAdminId,
      ) ?? null
      : null;

  return (
    <section className="admin-management">
      <div className="admin-management-header">
        <div>
          <span className="admin-management-eyebrow">
            ADMINISTRATION
          </span>

          <h1 className="admin-management-title">
            Quản lý ADMIN
          </h1>

          <p className="admin-management-description">
            Quản lý tài khoản quản trị của hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="admin-create-button"
          onClick={() =>
            setCreateModalOpen(true)
          }
        >
          <span>+</span>
          Tạo ADMIN
        </button>
      </div>

      <div className="admin-management-toolbar">
        <div className="admin-search-wrapper">
          <span className="admin-search-icon">
            ⌕
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Tìm username hoặc email..."
            className="admin-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as StatusFilter,
            )
          }
          className="admin-status-filter"
        >
          <option value="ALL">
            Tất cả trạng thái
          </option>

          <option value="ACTIVE">
            Đang hoạt động
          </option>

          <option value="DISABLED">
            Đã khóa
          </option>
        </select>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => void loadAdmins()}
          disabled={loading}
          title="Tải lại danh sách"
        >
          ↻
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <div>
            <strong>
              Không thể tải dữ liệu
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAdmins()
            }
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <strong>
              Danh sách tài khoản
            </strong>

            {!loading && !error && (
              <span>
                {filteredAdmins.length} tài khoản
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="admin-table-state">
            <div className="admin-loading-spinner" />

            <p>
              Đang tải danh sách ADMIN...
            </p>
          </div>
        ) : error ? (
          <div className="admin-table-state">
            <p>
              Dữ liệu chưa thể hiển thị.
            </p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="admin-table-state">
            <div className="admin-empty-icon">
              —
            </div>

            <strong>
              {admins.length === 0
                ? "Chưa có tài khoản ADMIN"
                : "Không tìm thấy tài khoản phù hợp"}
            </strong>

            <p>
              {admins.length === 0
                ? "Danh sách tài khoản quản trị hiện đang trống."
                : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ADMIN</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY TẠO</th>
                  <th className="admin-action-column">
                    THAO TÁC
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAdmins.map(
                  (admin) => {
                    const menuOpen =
                      activeMenuAdminId ===
                      admin.id;

                    return (
                      <tr key={admin.id}>
                        <td>
                          <div className="admin-identity">
                            <div className="admin-avatar">
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
                        </td>

                        <td>
                          <span className="admin-email">
                            {admin.email}
                          </span>
                        </td>

                        <td>
                          <span className="admin-role-badge">
                            {admin.role}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`admin-status-badge admin-status-${admin.status.toLowerCase()}`}
                          >
                            <span className="admin-status-dot" />

                            {getStatusLabel(
                              admin.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="admin-date">
                            {formatDate(
                              admin.createdAt,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="admin-action-wrapper">
                            <button
                              type="button"
                              className={`admin-row-action ${menuOpen
                                ? "admin-row-action-active"
                                : ""
                                }`}
                              onClick={(event) =>
                                toggleActionMenu(
                                  admin,
                                  event.currentTarget,
                                )
                              }
                              aria-label={`Thao tác với ${admin.username}`}
                              aria-expanded={
                                menuOpen
                              }
                            >
                              ⋯
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeMenuAdmin &&
        actionMenuPosition &&
        createPortal(
          <div
            ref={actionMenuRef}
            className="admin-action-menu"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
            }}
          >
            <button
              type="button"
              onClick={() =>
                openAdminDetail(
                  activeMenuAdmin,
                )
              }
            >
              Xem chi tiết
            </button>

            <button
              type="button"
              onClick={() =>
                openAdminEdit(activeMenuAdmin)
              }
            >
              Chỉnh sửa
            </button>

            <button
              type="button"
              onClick={() =>
                openAdminPasswordChange(activeMenuAdmin)
              }
            >
              Đổi mật khẩu
            </button>

            <div className="admin-action-menu-divider" />

            <button
              type="button"
              className={
                activeMenuAdmin.status ===
                  "ACTIVE"
                  ? "admin-action-danger"
                  : "admin-action-enable"
              }
              onClick={() => openAdminStatusAction(activeMenuAdmin)} >
              {activeMenuAdmin.status ===
                "ACTIVE"
                ? "Khóa ADMIN"
                : "Mở khóa ADMIN"}
            </button>
          </div>,
          document.body,
        )}

      {createModalOpen && (
        <CreateAdminModal
          onClose={() =>
            setCreateModalOpen(false)
          }
          onCreated={() => {
            setCreateModalOpen(false);
            void loadAdmins();
          }}
        />
      )}

      {detailModalOpen &&
        selectedAdminId && (
          <AdminDetailModal
            adminId={selectedAdminId}
            onClose={closeAdminDetail}
          />
        )}

      {editModalOpen &&
        selectedEditAdminId && (
          <EditAdminModal
            adminId={selectedEditAdminId}
            onClose={closeAdminEdit}
            onUpdated={() => {
              closeAdminEdit();
              void loadAdmins();
            }}
          />
        )}

      {passwordModalOpen &&
        selectedPasswordAdminId && (
          <ChangeAdminPasswordModal
            adminId={selectedPasswordAdminId}
            onClose={closeAdminPasswordChange}
            onUpdated={() => {
              closeAdminPasswordChange();
              void loadAdmins();
            }}
          />
        )}

      {statusModalOpen &&
        selectedStatusAdminId &&
        statusAction && (
          <AdminStatusActionModal
            adminId={selectedStatusAdminId}
            action={statusAction}
            onClose={closeAdminStatusAction}
            onUpdated={() => {
              closeAdminStatusAction();
              void loadAdmins();
            }}
          />
        )}
    </section>
  );
}
