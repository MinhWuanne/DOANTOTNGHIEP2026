
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import {
  getMemberProfile,
  updateMemberFullName,
  type MemberProfile,
} from "../../services/api/auth.api";
import {
  createMemberAddress,
  deleteMemberAddress,
  getMemberAddresses,
  updateMemberAddress,
  type AddressType,
  type CreateMemberAddressInput,
  type MemberAddress,
} from "../../services/api/member-address.api";
import "./MemberHomePage.css";


import {
  getMyMemberOrders,
  getMemberOrderPaymentInstruction,
  type MemberOrder,
  type MemberPaymentInstruction,
} from "../../services/api/member-checkout.api";

import MemberReturnsPage from "./MemberReturnsPage";
import MemberWalletPage from "./MemberWalletPage";

type MemberSection =
  | "overview"
  | "profile"
  | "addresses"
  | "orders"
  | "returns"
  | "wallet"
  | "referral";

const memberMenu: {
  id: MemberSection;
  label: string;
  icon: string;
}[] = [
    { id: "overview", label: "Tổng quan tài khoản", icon: "⌂" },
    { id: "profile", label: "Thông tin cá nhân", icon: "♙" },
    { id: "addresses", label: "Sổ địa chỉ", icon: "⌖" },
    { id: "orders", label: "Đơn hàng của tôi", icon: "▤" },
    { id: "returns", label: "Đổi trả hàng", icon: "↻" },
    { id: "wallet", label: "Ví thành viên", icon: "▱" },
    { id: "referral", label: "Mã giới thiệu", icon: "♧" },
  ];

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPED: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã hoàn trả",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  PARTIALLY_PAID: "Đã thanh toán một phần",
  REFUNDED: "Đã hoàn tiền",
};

function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? "Trạng thái chưa xác định";
}

function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? "Trạng thái chưa xác định";
}

function formatVnd(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${amount.toLocaleString("vi-VN")} ₫`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có thông tin";
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MemberHomePage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] =
    useState<MemberSection>("overview");

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressReloadKey, setAddressReloadKey] = useState(0);

  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] =
    useState<string | number | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] =
    useState<string | number | null>(null);

  const [addressType, setAddressType] =
    useState<AddressType>("HOME");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressWard, setAddressWard] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);

  const [memberOrders, setMemberOrders] = useState<MemberOrder[]>([]);
  const [memberOrdersLoading, setMemberOrdersLoading] = useState(false);
  const [memberOrdersError, setMemberOrdersError] = useState("");
  const [memberOrdersReloadKey, setMemberOrdersReloadKey] = useState(0);

  const [paymentInstruction, setPaymentInstruction] =
    useState<MemberPaymentInstruction | null>(null);
  const [paymentInstructionLoading, setPaymentInstructionLoading] =
    useState(false);
  const [paymentInstructionError, setPaymentInstructionError] =
    useState("");

  const [paymentInstructionOrderId, setPaymentInstructionOrderId] =
    useState<string | null>(null);

  const memberAccount = profile?.accounts.find(
    (account) => account.platform === "MEMBER",
  );

  const referralCode =
    memberAccount?.memberProfile?.referralCode ?? "";

  const referralLink =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/register?affiliateCode=${encodeURIComponent(referralCode)}`
      : "";

  const [referralCopyMessage, setReferralCopyMessage] = useState("");

  useEffect(() => {
    if (profile !== null) {
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setProfileError("");
      setProfileMessage("");

      try {
        const data = await getMemberProfile();

        if (!isMounted) {
          return;
        }

        setProfile(data);
        setFullName(data.fullName);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProfileError(
          error instanceof Error
            ? error.message
            : "Không thể tải thông tin cá nhân.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [profile]);


  useEffect(() => {
    if (activeSection !== "addresses" || !profile) {
      return;
    }

    let isMounted = true;

    async function loadAddresses() {
      setIsLoadingAddresses(true);
      setAddressError("");

      try {
        if (!profile) {
          throw new Error("Không tìm thấy thông tin thành viên.");
        }

        const account = profile.accounts.find(
          (item) => item.platform === "MEMBER",
        );
        if (!account) {
          throw new Error("Không tìm thấy tài khoản thành viên.");
        }

        const data = await getMemberAddresses(account.id);

        if (isMounted) {
          setAddresses(data);
        }
      } catch (error) {
        if (isMounted) {
          setAddressError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách địa chỉ.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddresses(false);
        }
      }
    }

    void loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [activeSection, profile, addressReloadKey]);

  useEffect(() => {
    if (activeSection !== "orders") {
      return;
    }

    let isMounted = true;

    async function loadMemberOrders() {
      setMemberOrdersLoading(true);
      setMemberOrdersError("");

      try {
        const data = await getMyMemberOrders();

        if (isMounted) {
          setMemberOrders(data);
        }
      } catch (error) {
        if (isMounted) {
          setMemberOrdersError(
            error instanceof Error
              ? error.message
              : "Không thể tải lịch sử đơn hàng.",
          );
        }
      } finally {
        if (isMounted) {
          setMemberOrdersLoading(false);
        }
      }
    }

    void loadMemberOrders();

    return () => {
      isMounted = false;
    };
  }, [activeSection, memberOrdersReloadKey]);

  function handleLogout() {
    clearAuthSession("MEMBER");
    navigate("/login", { replace: true });
  }

  function handleCancelEdit() {
    setFullName(profile?.fullName ?? "");
    setIsEditingProfile(false);
    setProfileError("");
    setProfileMessage("");
  }

  async function handleSaveProfile() {
    const normalizedFullName = fullName.trim();

    if (!normalizedFullName) {
      setProfileError("Họ và tên không được để trống.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const updatedProfile =
        await updateMemberFullName(normalizedFullName);

      setProfile(updatedProfile);
      setFullName(updatedProfile.fullName);
      setIsEditingProfile(false);
      setProfileMessage("Cập nhật họ và tên thành công.");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật thông tin cá nhân.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddressType("HOME");
    setReceiverName("");
    setReceiverPhone("");
    setAddressLine("");
    setAddressWard("");
    setAddressDistrict("");
    setAddressProvince("");
    setIsDefaultAddress(addresses.length === 0);
    setIsAddressFormOpen(false);
    setAddressError("");
  }

  function handleAddAddress() {
    setEditingAddressId(null);
    setAddressType("HOME");
    setReceiverName("");
    setReceiverPhone("");
    setAddressLine("");
    setAddressWard("");
    setAddressDistrict("");
    setAddressProvince("");
    setIsDefaultAddress(addresses.length === 0);
    setAddressError("");
    setAddressMessage("");
    setIsAddressFormOpen(true);
  }

  function handleEditAddress(address: MemberAddress) {
    setEditingAddressId(address.id);
    setAddressType(address.type);
    setReceiverName(address.receiverName);
    setReceiverPhone(address.phone);
    setAddressLine(address.addressLine);
    setAddressWard(address.ward ?? "");
    setAddressDistrict(address.district ?? "");
    setAddressProvince(address.province);
    setIsDefaultAddress(address.isDefault);
    setAddressError("");
    setAddressMessage("");
    setIsAddressFormOpen(true);
  }

  async function handleSaveAddress(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const account = profile?.accounts.find(
      (item) => item.platform === "MEMBER",
    );

    if (!account) {
      setAddressError("Không tìm thấy tài khoản thành viên.");
      return;
    }

    const input: CreateMemberAddressInput = {
      type: addressType,
      receiverName: receiverName.trim(),
      phone: receiverPhone.trim(),
      addressLine: addressLine.trim(),
      ward: addressWard.trim(),
      district: addressDistrict.trim(),
      province: addressProvince.trim(),
      isDefault: isDefaultAddress,
    };

    setIsSavingAddress(true);
    setAddressError("");
    setAddressMessage("");

    try {
      if (editingAddressId !== null) {
        await updateMemberAddress(
          account.id,
          editingAddressId,
          input,
        );

        setAddressMessage("Cập nhật địa chỉ thành công.");
      } else {
        await createMemberAddress(account.id, input);

        setAddressMessage("Thêm địa chỉ thành công.");
      }

      setIsAddressFormOpen(false);
      setEditingAddressId(null);
      setAddressReloadKey((current) => current + 1);
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Không thể lưu địa chỉ.",
      );
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSetDefaultAddress(
    address: MemberAddress,
  ) {
    const account = profile?.accounts.find(
      (item) => item.platform === "MEMBER",
    );

    if (!account || address.isDefault) {
      return;
    }

    setAddressError("");
    setAddressMessage("");

    try {
      await updateMemberAddress(account.id, address.id, {
        isDefault: true,
      });

      setAddressMessage("Đã đặt địa chỉ mặc định.");
      setAddressReloadKey((current) => current + 1);
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Không thể đặt địa chỉ mặc định.",
      );
    }
  }

  async function handleDeleteAddress(
    address: MemberAddress,
  ) {
    const account = profile?.accounts.find(
      (item) => item.platform === "MEMBER",
    );

    if (!account) {
      setAddressError("Không tìm thấy tài khoản thành viên.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa địa chỉ của ${address.receiverName}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingAddressId(address.id);
    setAddressError("");
    setAddressMessage("");

    try {
      await deleteMemberAddress(account.id, address.id);

      setAddressMessage(
        address.isDefault
          ? "Đã xóa địa chỉ mặc định. Vui lòng chọn địa chỉ mặc định mới nếu cần."
          : "Đã xóa địa chỉ.",
      );

      setAddressReloadKey((current) => current + 1);
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Không thể xóa địa chỉ.",
      );
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function handleContinueBankTransfer(order: MemberOrder) {
    setPaymentInstruction(null);
    setPaymentInstructionError("");
    setPaymentInstructionOrderId(String(order.id));
    setPaymentInstructionLoading(true);

    try {
      const instruction =
        await getMemberOrderPaymentInstruction(order.id);

      setPaymentInstruction(instruction);
    } catch (error) {
      setPaymentInstructionError(
        error instanceof Error
          ? error.message
          : "Không thể tải hướng dẫn chuyển khoản.",
      );
    } finally {
      setPaymentInstructionLoading(false);
    }
  }

  const activeItem = memberMenu.find(
    (item) => item.id === activeSection,
  );

  return (
    <div className="member-page">
      <main className="member-main">
        <div className="member-page-heading">
          <div>
            <p className="member-eyebrow">ICON DENIM / MY ACCOUNT</p>
            <h1>Tài khoản của tôi</h1>
            <p className="member-page-description">
              Quản lý thông tin cá nhân và hoạt động mua sắm của bạn.
            </p>
          </div>
        </div>

        <div className="member-layout">
          <aside className="member-sidebar">
            <div className="member-sidebar-heading">
              <div className="member-avatar" aria-hidden="true">
                ♙
              </div>

              <div>
                <p className="member-sidebar-title">
                  Tài khoản thành viên
                </p>
                <p className="member-sidebar-subtitle">
                  {profile?.fullName || "Xin chào bạn!"}
                </p>
              </div>
            </div>

            <div className="member-menu">
              <p className="member-menu-label">
                QUẢN LÝ TÀI KHOẢN
              </p>

              {memberMenu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`member-menu-item ${activeSection === item.id
                    ? "member-menu-item-active"
                    : ""
                    }`}
                  onClick={() => setActiveSection(item.id)}
                  aria-current={
                    activeSection === item.id ? "page" : undefined
                  }
                >
                  <span className="member-menu-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  <span className="member-menu-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}

              <div className="member-menu-separator" />

              <button
                type="button"
                className="member-menu-item member-logout-button"
                onClick={handleLogout}
              >
                <span className="member-menu-icon" aria-hidden="true">
                  ↪
                </span>
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          <section className="member-content">
            {activeSection === "overview" ? (
              <>
                <div className="member-content-heading">
                  <div>
                    <p className="member-eyebrow">
                      PERSONAL SPACE
                    </p>
                    <h2>Tổng quan tài khoản</h2>
                    <p>
                      Tất cả thông tin và tiện ích thành viên tại một nơi.
                    </p>
                  </div>
                </div>

                <div className="member-overview-grid">
                  {memberMenu
                    .filter((item) => item.id !== "overview")
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="member-overview-card"
                        onClick={() => setActiveSection(item.id)}
                      >
                        <span
                          className="member-overview-icon"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>

                        <span className="member-overview-card-title">
                          {item.label}
                        </span>

                        <span className="member-overview-card-description">
                          {item.id === "profile" &&
                            "Xem và quản lý thông tin cá nhân"}
                          {item.id === "addresses" &&
                            "Quản lý địa chỉ nhận hàng"}
                          {item.id === "orders" &&
                            "Theo dõi lịch sử mua sắm"}
                          {item.id === "returns" &&
                            "Theo dõi yêu cầu đổi trả"}
                          {item.id === "wallet" &&
                            "Quản lý ví và giao dịch"}
                          {item.id === "referral" &&
                            "Xem thông tin mã giới thiệu"}
                        </span>

                        <span className="member-overview-card-link">
                          Xem chi tiết <span aria-hidden="true">→</span>
                        </span>
                      </button>
                    ))}
                </div>

                <div className="member-welcome-panel">
                  <div>
                    <p className="member-eyebrow">
                      YOUR DENIM JOURNEY
                    </p>
                    <h3>Phong cách của bạn, lựa chọn của bạn.</h3>
                    <p>
                      Khám phá các sản phẩm và tiếp tục hành trình cùng
                      IconDenim.
                    </p>
                    <button
                      type="button"
                      className="member-primary-button"
                      onClick={() => navigate("/")}
                    >
                      Khám phá bộ sưu tập
                    </button>
                  </div>
                  <div
                    className="member-welcome-decoration"
                    aria-hidden="true"
                  >
                    ID
                  </div>
                </div>
              </>
            ) : activeSection === "profile" ? (
              <div className="member-profile-section">
                <div className="member-content-heading">
                  <div>
                    <p className="member-eyebrow">
                      PERSONAL INFORMATION
                    </p>
                    <h2>Thông tin cá nhân</h2>
                    <p>
                      Xem và quản lý thông tin tài khoản thành viên.
                    </p>
                  </div>
                </div>

                {isLoadingProfile ? (
                  <div className="member-profile-status">
                    Đang tải thông tin cá nhân...
                  </div>
                ) : profileError && !profile ? (
                  <div className="member-profile-status member-profile-error">
                    <p>{profileError}</p>
                    <button
                      type="button"
                      className="member-secondary-button"
                      onClick={() => {
                        setProfileError("");
                        setActiveSection("overview");
                        setProfile(null);
                      }}
                    >
                      Quay lại tổng quan
                    </button>
                  </div>
                ) : profile ? (
                  <div className="member-profile-card">
                    <div className="member-profile-card-heading">
                      <div>
                        <h3>Thông tin tài khoản</h3>
                        <p>
                          Họ tên có thể chỉnh sửa. Email và số điện thoại
                          hiện chỉ hỗ trợ xem.
                        </p>
                      </div>

                      {!isEditingProfile && (
                        <button
                          type="button"
                          className="member-secondary-button"
                          onClick={() => {
                            setFullName(profile.fullName);
                            setIsEditingProfile(true);
                            setProfileError("");
                            setProfileMessage("");
                          }}
                        >
                          Chỉnh sửa
                        </button>
                      )}
                    </div>

                    {profileMessage && (
                      <p className="member-profile-message">
                        {profileMessage}
                      </p>
                    )}

                    {profileError && (
                      <p className="member-profile-error">
                        {profileError}
                      </p>
                    )}

                    <form
                      className="member-profile-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveProfile();
                      }}
                    >
                      <div className="member-profile-field">
                        <label htmlFor="member-full-name">
                          Họ và tên
                        </label>
                        <input
                          id="member-full-name"
                          name="fullName"
                          type="text"
                          value={fullName}
                          onChange={(event) =>
                            setFullName(event.target.value)
                          }
                          disabled={!isEditingProfile || isSavingProfile}
                          maxLength={150}
                          required
                        />
                      </div>

                      <div className="member-profile-field">
                        <label htmlFor="member-email">
                          Email
                        </label>
                        <input
                          id="member-email"
                          name="email"
                          type="email"
                          value={memberAccount?.email ?? ""}
                          readOnly
                        />
                      </div>

                      <div className="member-profile-field">
                        <label htmlFor="member-phone">
                          Số điện thoại
                        </label>
                        <input
                          id="member-phone"
                          name="phone"
                          type="tel"
                          value={memberAccount?.phone ?? ""}
                          readOnly
                        />
                      </div>

                      {isEditingProfile && (
                        <div className="member-profile-actions">
                          <button
                            type="button"
                            className="member-secondary-button"
                            onClick={handleCancelEdit}
                            disabled={isSavingProfile}
                          >
                            Hủy
                          </button>

                          <button
                            type="submit"
                            className="member-primary-button"
                            disabled={isSavingProfile}
                          >
                            {isSavingProfile
                              ? "Đang lưu..."
                              : "Lưu thay đổi"}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                ) : null}
              </div>
            ) : activeSection === "addresses" ? (
              <div className="member-address-section">
                <div className="member-content-heading member-address-heading">
                  <div>
                    <p className="member-eyebrow">
                      DELIVERY INFORMATION
                    </p>
                    <h2>Sổ địa chỉ</h2>
                    <p>
                      Quản lý địa chỉ và thông tin nhận hàng của bạn.
                    </p>
                  </div>

                  {!isAddressFormOpen && (
                    <button
                      type="button"
                      className="member-primary-button"
                      onClick={handleAddAddress}
                    >
                      + Thêm địa chỉ
                    </button>
                  )}
                </div>

                {addressMessage && (
                  <p className="member-address-message">
                    {addressMessage}
                  </p>
                )}

                {addressError && (
                  <p className="member-address-error">
                    {addressError}
                  </p>
                )}

                {isLoadingProfile ? (
                  <div className="member-profile-status">
                    Đang tải thông tin tài khoản...
                  </div>
                ) : !profile ? (
                  <div className="member-profile-status">
                    <p>
                      {profileError ||
                        "Không thể xác định tài khoản thành viên."}
                    </p>
                    <button
                      type="button"
                      className="member-secondary-button"
                      onClick={() => {
                        setProfileError("");
                        setActiveSection("overview");
                        setProfile(null);
                      }}
                    >
                      Quay lại tổng quan
                    </button>
                  </div>
                ) : !memberAccount ? (
                  <div className="member-profile-status member-profile-error">
                    Không tìm thấy tài khoản thành viên.
                  </div>
                ) : (
                  <>
                    {isAddressFormOpen && (
                      <div className="member-address-form-card">
                        <div className="member-profile-card-heading">
                          <div>
                            <h3>
                              {editingAddressId !== null
                                ? "Chỉnh sửa địa chỉ"
                                : "Thêm địa chỉ mới"}
                            </h3>
                            <p>
                              Vui lòng nhập đầy đủ thông tin nhận hàng.
                            </p>
                          </div>
                        </div>

                        <form
                          className="member-address-form"
                          onSubmit={(event) => {
                            void handleSaveAddress(event);
                          }}
                        >
                          <div className="member-address-field">
                            <label htmlFor="member-address-type">
                              Loại địa chỉ
                            </label>
                            <select
                              id="member-address-type"
                              value={addressType}
                              onChange={(event) =>
                                setAddressType(
                                  event.target.value as AddressType,
                                )
                              }
                              disabled={isSavingAddress}
                            >
                              <option value="HOME">Nhà riêng</option>
                              <option value="OFFICE">Văn phòng</option>
                              <option value="OTHER">Khác</option>
                            </select>
                          </div>

                          <div className="member-address-field">
                            <label htmlFor="member-address-receiver">
                              Người nhận
                            </label>
                            <input
                              id="member-address-receiver"
                              value={receiverName}
                              onChange={(event) =>
                                setReceiverName(event.target.value)
                              }
                              maxLength={150}
                              required
                              disabled={isSavingAddress}
                            />
                          </div>

                          <div className="member-address-field">
                            <label htmlFor="member-address-phone">
                              Số điện thoại
                            </label>
                            <input
                              id="member-address-phone"
                              type="tel"
                              value={receiverPhone}
                              onChange={(event) =>
                                setReceiverPhone(event.target.value)
                              }
                              required
                              disabled={isSavingAddress}
                            />
                          </div>

                          <div className="member-address-field">
                            <label htmlFor="member-address-province">
                              Tỉnh / Thành phố
                            </label>
                            <input
                              id="member-address-province"
                              value={addressProvince}
                              onChange={(event) =>
                                setAddressProvince(event.target.value)
                              }
                              required
                              disabled={isSavingAddress}
                            />
                          </div>

                          <div className="member-address-field">
                            <label htmlFor="member-address-district">
                              Quận / Huyện
                            </label>
                            <input
                              id="member-address-district"
                              value={addressDistrict}
                              onChange={(event) =>
                                setAddressDistrict(event.target.value)
                              }
                              disabled={isSavingAddress}
                            />
                          </div>

                          <div className="member-address-field">
                            <label htmlFor="member-address-ward">
                              Phường / Xã
                            </label>
                            <input
                              id="member-address-ward"
                              value={addressWard}
                              onChange={(event) =>
                                setAddressWard(event.target.value)
                              }
                              disabled={isSavingAddress}
                            />
                          </div>

                          <div className="member-address-field member-address-field-full">
                            <label htmlFor="member-address-line">
                              Địa chỉ cụ thể
                            </label>
                            <input
                              id="member-address-line"
                              value={addressLine}
                              onChange={(event) =>
                                setAddressLine(event.target.value)
                              }
                              placeholder="Số nhà, tên đường..."
                              required
                              disabled={isSavingAddress}
                            />
                          </div>

                          <label className="member-address-default-option">
                            <input
                              type="checkbox"
                              checked={isDefaultAddress}
                              onChange={(event) =>
                                setIsDefaultAddress(event.target.checked)
                              }
                              disabled={isSavingAddress}
                            />
                            <span>Đặt làm địa chỉ mặc định</span>
                          </label>

                          <div className="member-profile-actions member-address-actions">
                            <button
                              type="button"
                              className="member-secondary-button"
                              onClick={resetAddressForm}
                              disabled={isSavingAddress}
                            >
                              Hủy
                            </button>

                            <button
                              type="submit"
                              className="member-primary-button"
                              disabled={isSavingAddress}
                            >
                              {isSavingAddress
                                ? "Đang lưu..."
                                : "Lưu địa chỉ"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {isLoadingAddresses ? (
                      <div className="member-profile-status">
                        Đang tải danh sách địa chỉ...
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="member-address-empty">
                        <div
                          className="member-empty-icon"
                          aria-hidden="true"
                        >
                          ⌖
                        </div>
                        <h3>Bạn chưa có địa chỉ nhận hàng</h3>
                        <p>
                          Thêm địa chỉ để thuận tiện hơn khi mua sắm
                          tại IconDenim.
                        </p>

                        {!isAddressFormOpen && (
                          <button
                            type="button"
                            className="member-primary-button"
                            onClick={handleAddAddress}
                          >
                            Thêm địa chỉ đầu tiên
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="member-address-list">
                        {addresses.map((address) => (
                          <article
                            className="member-address-card"
                            key={address.id}
                          >
                            <div className="member-address-card-heading">
                              <div className="member-address-recipient">
                                <h3>{address.receiverName}</h3>
                                <span>{address.phone}</span>
                              </div>

                              {address.isDefault && (
                                <span className="member-address-default-badge">
                                  Mặc định
                                </span>
                              )}
                            </div>

                            <p className="member-address-type">
                              {address.type === "HOME"
                                ? "Nhà riêng"
                                : address.type === "OFFICE"
                                  ? "Văn phòng"
                                  : "Khác"}
                            </p>

                            <p className="member-address-detail">
                              {[
                                address.addressLine,
                                address.ward,
                                address.district,
                                address.province,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>

                            <div className="member-address-card-actions">
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  className="member-text-button"
                                  onClick={() => {
                                    void handleSetDefaultAddress(address);
                                  }}
                                  disabled={
                                    deletingAddressId !== null ||
                                    isLoadingAddresses
                                  }
                                >
                                  Đặt mặc định
                                </button>
                              )}

                              <button
                                type="button"
                                className="member-text-button"
                                onClick={() => handleEditAddress(address)}
                                disabled={
                                  deletingAddressId !== null ||
                                  isSavingAddress
                                }
                              >
                                Chỉnh sửa
                              </button>

                              <button
                                type="button"
                                className="member-text-button member-text-button-danger"
                                onClick={() => {
                                  void handleDeleteAddress(address);
                                }}
                                disabled={
                                  deletingAddressId !== null ||
                                  isSavingAddress
                                }
                              >
                                {deletingAddressId === address.id
                                  ? "Đang xóa..."
                                  : "Xóa"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeSection === "orders" ? (
              <div className="member-orders-section">
                <div className="member-orders-heading">
                  <div>
                    <p className="member-eyebrow">
                      YOUR DENIM JOURNEY
                    </p>
                    <h2>Đơn hàng của tôi</h2>
                    <p>
                      Theo dõi đơn hàng và quản lý thanh toán của bạn.
                    </p>
                  </div>

                  <div className="member-orders-count">
                    <span>Tổng đơn hàng</span>
                    <strong>
                      {memberOrders.length.toString().padStart(2, "0")}
                    </strong>
                  </div>
                </div>

                {memberOrdersLoading ? (
                  <div className="member-orders-feedback">
                    <span className="member-orders-loader" />
                    <p>Đang tải lịch sử đơn hàng...</p>
                  </div>
                ) : memberOrdersError ? (
                  <div
                    className="member-orders-feedback member-orders-feedback-error"
                    role="alert"
                  >
                    <h3>Chưa thể tải đơn hàng</h3>
                    <p>{memberOrdersError}</p>

                    <button
                      type="button"
                      className="member-primary-button"
                      onClick={() => {
                        setMemberOrdersReloadKey(
                          (current) => current + 1,
                        );
                      }}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : memberOrders.length === 0 ? (
                  <div className="member-orders-empty">
                    <div
                      className="member-orders-empty-mark"
                      aria-hidden="true"
                    >
                      ID.
                    </div>

                    <p className="member-eyebrow">
                      A NEW LOOK AWAITS
                    </p>

                    <h3>Đơn hàng đầu tiên đang chờ bạn</h3>

                    <p>
                      Những lựa chọn yêu thích của bạn sẽ xuất hiện tại đây
                      sau khi hoàn tất đặt hàng.
                    </p>

                    <button
                      type="button"
                      className="member-primary-button"
                      onClick={() => navigate("/products")}
                    >
                      Khám phá bộ sưu tập
                      <span aria-hidden="true"> ↗</span>
                    </button>
                  </div>
                ) : (
                  <div className="member-orders-list">
                    {memberOrders.map((order) => {
                      const canContinuePayment =
                        order.paymentMethod === "BANK_TRANSFER" &&
                        !["CANCELLED", "RETURNED"].includes(
                          order.status,
                        ) &&
                        !["PAID", "REFUNDED"].includes(
                          order.paymentStatus,
                        );

                      const isSelectedPaymentOrder =
                        paymentInstructionOrderId === String(order.id);

                      const orderStatusClass = [
                        "member-order-status-badge",
                        `member-order-status-${order.status.toLowerCase()}`,
                      ].join(" ");

                      const paymentStatusClass = [
                        "member-order-payment-badge",
                        `member-order-payment-${order.paymentStatus.toLowerCase()}`,
                      ].join(" ");

                      const isCurrentInstruction =
                        isSelectedPaymentOrder &&
                        String(paymentInstruction?.order?.id) ===
                        String(order.id);

                      return (
                        <article
                          className="member-order-card"
                          key={order.id}
                        >
                          <div className="member-order-card-top">
                            <div className="member-order-identity">
                              <p className="member-eyebrow">
                                ORDER NO.
                              </p>

                              <h3>{order.orderNumber}</h3>

                              <p className="member-order-date">
                                Đặt ngày {formatDateTime(order.createdAt)}
                              </p>
                            </div>

                            <div className="member-order-badges">
                              <span className={orderStatusClass}>
                                {getOrderStatusLabel(order.status)}
                              </span>

                              <span className={paymentStatusClass}>
                                {getPaymentStatusLabel(
                                  order.paymentStatus,
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="member-order-products">
                            {order.items.map((item) => (
                              <div
                                className="member-order-product"
                                key={item.id}
                              >
                                <div
                                  className="member-order-product-mark"
                                  aria-hidden="true"
                                >
                                  ID.
                                </div>

                                <div className="member-order-product-info">
                                  <h4>{item.productName}</h4>

                                  <p>
                                    {item.variant?.sku ?? item.sku}
                                    {" · "}
                                    SL: {item.quantity}
                                  </p>
                                </div>

                                <strong>
                                  {formatVnd(item.subtotal)}
                                </strong>
                              </div>
                            ))}
                          </div>

                          <div className="member-order-card-bottom">
                            <div className="member-order-total">
                              <span>
                                {order.paymentMethod === "BANK_TRANSFER"
                                  ? "Chuyển khoản ngân hàng"
                                  : order.paymentMethod === "COD"
                                    ? "Thanh toán khi nhận hàng"
                                    : order.paymentMethod}
                              </span>

                              <p>Tổng thanh toán</p>

                              <strong>
                                {formatVnd(order.totalAmount)}
                              </strong>
                            </div>

                            {canContinuePayment && (
                              <button
                                type="button"
                                className="member-order-payment-button"
                                disabled={paymentInstructionLoading}
                                onClick={() => {
                                  void handleContinueBankTransfer(order);
                                }}
                              >
                                {paymentInstructionLoading &&
                                  isSelectedPaymentOrder
                                  ? "Đang tải..."
                                  : "Tiếp tục thanh toán"}

                                <span aria-hidden="true"> ↗</span>
                              </button>
                            )}
                          </div>

                          {isSelectedPaymentOrder &&
                            paymentInstructionError && (
                              <div
                                className="member-order-payment-error"
                                role="alert"
                              >
                                <p>
                                  Không thể tải hướng dẫn chuyển khoản:{" "}
                                  {paymentInstructionError}
                                </p>

                                <button
                                  type="button"
                                  className="member-text-button"
                                  disabled={paymentInstructionLoading}
                                  onClick={() => {
                                    void handleContinueBankTransfer(order);
                                  }}
                                >
                                  Thử lại
                                </button>
                              </div>
                            )}

                          {isCurrentInstruction && paymentInstruction && (
                            <div className="member-payment-instruction">
                              <div className="member-payment-instruction-heading">
                                <div>
                                  <p className="member-eyebrow">
                                    PAYMENT DETAILS
                                  </p>
                                  <h4>Thông tin chuyển khoản</h4>
                                </div>

                                <span className="member-payment-waiting">
                                  {paymentInstruction.status === "WAITING"
                                    ? "Đang chờ thanh toán"
                                    : paymentInstruction.status ===
                                      "PARTIALLY_PAID"
                                      ? "Đã nhận một phần tiền"
                                      : paymentInstruction.status === "PAID"
                                        ? "Đã thanh toán"
                                        : paymentInstruction.status ===
                                          "EXPIRED"
                                          ? "Đã hết hạn"
                                          : paymentInstruction.status ===
                                            "CANCELLED"
                                            ? "Đã hủy"
                                            : "Trạng thái thanh toán chưa xác định"}
                                </span>
                              </div>

                              <div className="member-payment-detail">
                                <span>Số tài khoản</span>
                                <strong>
                                  {paymentInstruction.bankAccount
                                    ?.accountNumber ||
                                    "Chưa có thông tin tài khoản"}
                                </strong>
                              </div>

                              <div className="member-payment-detail">
                                <span>Số tiền cần chuyển</span>
                                <strong className="member-payment-amount">
                                  {formatVnd(
                                    paymentInstruction.expectedAmount,
                                  )}
                                </strong>
                              </div>

                              <div className="member-payment-detail">
                                <span>Nội dung chuyển khoản</span>
                                <strong>
                                  {paymentInstruction.transferContent}
                                </strong>
                              </div>

                              <div className="member-payment-detail">
                                <span>Hạn thanh toán</span>
                                <strong>
                                  {formatDateTime(
                                    paymentInstruction.expiresAt,
                                  )}
                                </strong>
                              </div>

                              <p className="member-payment-note">
                                Vui lòng chuyển đúng số tiền và nội dung để
                                hệ thống đối chiếu giao dịch.
                              </p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  className="member-orders-back"
                  onClick={() => setActiveSection("overview")}
                >
                  <span aria-hidden="true">←</span>
                  Quay lại tổng quan
                </button>
              </div>
            ) : activeSection === "returns" ? (
              <MemberReturnsPage />
            ) : activeSection === "wallet" ? (
              <MemberWalletPage />
            ) : activeSection === "referral" ? (
              <div className="member-referral-page">
                <div className="member-referral-heading">
                  <p className="member-eyebrow">MEMBER REFERRAL</p>
                  <h2>Mã giới thiệu của tôi</h2>
                  <p>
                    Chia sẻ mã giới thiệu để bạn bè đăng ký tài khoản
                    Member thông qua liên kết của bạn.
                  </p>
                </div>

                <section className="member-referral-code-card">
                  <div className="member-referral-card-top">
                    <div>
                      <p className="member-referral-label">
                        MÃ GIỚI THIỆU
                      </p>
                      <h3>
                        {referralCode || "Chưa có mã giới thiệu"}
                      </h3>
                    </div>

                    <span
                      className="member-referral-code-icon"
                      aria-hidden="true"
                    >
                      ♧
                    </span>
                  </div>

                  {referralCode && (
                    <button
                      type="button"
                      className="member-referral-primary-button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(referralCode);
                          setReferralCopyMessage(
                            "Đã sao chép mã giới thiệu.",
                          );
                        } catch {
                          setReferralCopyMessage(
                            "Không thể sao chép tự động. Vui lòng sao chép mã thủ công.",
                          );
                        }
                      }}
                    >
                      Sao chép mã
                    </button>
                  )}

                  {referralCopyMessage && (
                    <p
                      className="member-referral-feedback"
                      role="status"
                    >
                      {referralCopyMessage}
                    </p>
                  )}
                </section>

                <section className="member-referral-link-card">
                  <div>
                    <p className="member-referral-label">
                      LIÊN KẾT ĐĂNG KÝ
                    </p>
                    <p className="member-referral-description">
                      Gửi liên kết này cho người bạn muốn giới thiệu.
                    </p>
                  </div>

                  <div className="member-referral-link-field">
                    <input
                      type="text"
                      value={referralLink}
                      readOnly
                      aria-label="Liên kết đăng ký qua mã giới thiệu"
                      placeholder="Liên kết sẽ hiển thị khi có mã giới thiệu"
                    />

                    <button
                      type="button"
                      className="member-referral-secondary-button"
                      disabled={!referralLink}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(referralLink);
                          setReferralCopyMessage(
                            "Đã sao chép liên kết đăng ký.",
                          );
                        } catch {
                          setReferralCopyMessage(
                            "Không thể sao chép tự động. Vui lòng sao chép liên kết thủ công.",
                          );
                        }
                      }}
                    >
                      Sao chép liên kết
                    </button>
                  </div>
                </section>

                <section className="member-referral-stats">
                  <div className="member-referral-section-heading">
                    <div>
                      <p className="member-eyebrow">
                        REFERRAL OVERVIEW
                      </p>
                      <h3>Thống kê giới thiệu</h3>
                    </div>
                  </div>

                  <div className="member-referral-stats-grid">
                    <article className="member-referral-stat-card">
                      <span
                        className="member-referral-stat-icon"
                        aria-hidden="true"
                      >
                        ♙
                      </span>
                      <p>Thành viên tuyến dưới</p>
                      <strong>Chưa có dữ liệu</strong>
                    </article>

                    <article className="member-referral-stat-card">
                      <span
                        className="member-referral-stat-icon"
                        aria-hidden="true"
                      >
                        ▤
                      </span>
                      <p>Tổng đơn hàng tuyến dưới</p>
                      <strong>Chưa có dữ liệu</strong>
                    </article>

                    <article className="member-referral-stat-card">
                      <span
                        className="member-referral-stat-icon"
                        aria-hidden="true"
                      >
                        ₫
                      </span>
                      <p>Doanh thu tuyến dưới</p>
                      <strong>Chưa có dữ liệu</strong>
                    </article>
                  </div>

                  <p className="member-referral-note">
                    Thống kê sẽ được cập nhật khi hệ thống có API
                    tổng hợp dữ liệu giới thiệu.
                  </p>
                </section>

                <button
                  type="button"
                  className="member-secondary-button"
                  onClick={() => setActiveSection("overview")}
                >
                  Quay lại tổng quan
                </button>
              </div>
            ) : (
              <div className="member-empty-section">
                <div
                  className="member-empty-icon"
                  aria-hidden="true"
                >
                  {activeItem?.icon}
                </div>

                <p className="member-eyebrow">MY ACCOUNT</p>

                <h2>{activeItem?.label}</h2>

                <p>
                  Mục này sẽ được triển khai ở bước tiếp theo sau khi
                  xác minh API và dữ liệu tương ứng.
                </p>

                <button
                  type="button"
                  className="member-secondary-button"
                  onClick={() => setActiveSection("overview")}
                >
                  Quay lại tổng quan
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MemberHomePage;