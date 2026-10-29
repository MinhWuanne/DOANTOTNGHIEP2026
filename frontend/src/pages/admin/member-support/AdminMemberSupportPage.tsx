import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getAdminComplaintById,
  getAdminComplaints,
  sendAdminComplaintMessage,
  assignAdminToComplaint,
  getActiveAdmins,
  updateAdminComplaintStatus,
  recallAdminComplaintMessage,
  sendAdminComplaintMessageWithAttachment,
  downloadAdminComplaintAttachment,
  type UpdateAdminComplaintStatusInput,
  type ActiveAdminOption,
  type AdminComplaintDetail,
  type AdminComplaintListItem,

} from "../../../services/api/admin-complaint.api";

import {
  createAdminFinancialAdjustment,
  confirmAdminFinancialAdjustment,
  type AdminFinancialAdjustment,
  type FinancialAdjustmentDirection,
  type FinancialAdjustmentReason,
} from "../../../services/api/admin-wallet.api";
import { getAccessToken } from "../../../utils/auth";
import "./AdminMemberSupportPage.css";

const pageConfig = {
  "/admin/member-support": {
    title: "Xử lý khiếu nại",
    description:
      "Quản lý và theo dõi các yêu cầu hỗ trợ, khiếu nại của thành viên.",
  },
  "/admin/member-support/payments": {
    title: "Khiếu nại thanh toán",
    description:
      "Tiếp nhận, xác minh và xử lý các khiếu nại liên quan đến giao dịch, nạp tiền và thanh toán.",
  },
  "/admin/member-support/returns": {
    title: "Khiếu nại đổi trả hàng",
    description:
      "Theo dõi khiếu nại đổi trả và kết nối với quy trình Return / Refund hiện có.",
  },
  "/admin/member-support/feedback": {
    title: "Góp ý thành viên",
    description:
      "Tiếp nhận và theo dõi các góp ý, phản hồi từ thành viên.",
  },
};

type StatusFilter = "ALL" | "OPEN";

function getAdminIdFromAccessToken(
  accessToken: string | null,
): string | null {
  if (!accessToken) {
    return null;
  }

  try {
    const payload = accessToken.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(
      window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    ) as { adminId?: unknown; role?: unknown };

    if (
      typeof decoded.adminId !== "string" ||
      decoded.role !== "ADMIN" ||
      !/^[1-9]\d*$/.test(decoded.adminId)
    ) {
      return null;
    }

    return decoded.adminId;
  } catch {
    return null;
  }
}

function getComplaintCategoryLabel(
  category: AdminComplaintListItem["category"],
) {
  const labels: Record<AdminComplaintListItem["category"], string> = {
    ORDER: "Đơn hàng",
    PAYMENT: "Thanh toán",
    RETURN: "Đổi trả",
    WALLET: "Ví",
    COMMISSION: "Hoa hồng",
    WITHDRAWAL: "Rút tiền",
    ACCOUNT: "Tài khoản",
    FEEDBACK: "Góp ý",
    REF: "Giới thiệu",
    OTHER: "Khác",
  };

  return labels[category];
}

function getComplaintCategoryClass(
  category: AdminComplaintListItem["category"],
) {
  const classes: Record<AdminComplaintListItem["category"], string> = {
    ORDER: "other",
    PAYMENT: "payment",
    RETURN: "returns",
    WALLET: "payment",
    COMMISSION: "other",
    WITHDRAWAL: "payment",
    ACCOUNT: "other",
    FEEDBACK: "feedback",
    REF: "other",
    OTHER: "other",
  };

  return classes[category];
}

function getComplaintStatusLabel(
  status: AdminComplaintListItem["status"],
) {
  const labels: Record<AdminComplaintListItem["status"], string> = {
    PENDING: "Chờ xử lý",
    IN_PROGRESS: "Đang xử lý",
    RESOLVED: "Đã giải quyết",
    REJECTED: "Đã từ chối",
  };

  return labels[status];
}

function getComplaintStatusClass(
  status: AdminComplaintListItem["status"],
) {
  const classes: Record<AdminComplaintListItem["status"], string> = {
    PENDING: "waiting",
    IN_PROGRESS: "processing",
    RESOLVED: "resolved",
    REJECTED: "open",
  };

  return classes[status];
}

function formatComplaintTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminMemberSupportPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [complaints, setComplaints] = useState<AdminComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [selectedComplaintId, setSelectedComplaintId] = useState<
    string | null
  >(null);
  const [selectedComplaint, setSelectedComplaint] =
    useState<AdminComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [activeAdmins, setActiveAdmins] = useState<ActiveAdminOption[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  const [messageContent, setMessageContent] = useState("");
  const [messageType, setMessageType] =
    useState<"MESSAGE" | "INTERNAL_NOTE">("MESSAGE");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");

  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(
    null,
  );
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [recallingMessageId, setRecallingMessageId] = useState<string | null>(
    null,
  );
  const [recallError, setRecallError] = useState<{
    messageId: string;
    text: string;
  } | null>(null);

  const [statusAction, setStatusAction] = useState<
    UpdateAdminComplaintStatusInput["status"] | null
  >(null);
  const [resolutionReasonInput, setResolutionReasonInput] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  // Financial adjustment
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentDirection, setAdjustmentDirection] =
    useState<FinancialAdjustmentDirection>("CREDIT");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] =
    useState<FinancialAdjustmentReason>("MEMBER_COMPLAINT");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [adjustmentTicket, setAdjustmentTicket] =
    useState<AdminFinancialAdjustment | null>(null);
  const [adjustmentPassword, setAdjustmentPassword] = useState("");
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState("");
  const [adjustmentSuccess, setAdjustmentSuccess] = useState("");

  async function loadComplaints(search = searchTerm) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setError("Phiên đăng nhập không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getAdminComplaints(accessToken, {
        search,
        page: 1,
        pageSize: 50,
      });

      setComplaints(result.items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách khiếu nại.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadComplaintDetail(complaintId: string) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setDetailError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setSelectedComplaintId(complaintId);
      setSelectedComplaint(null);

      // Reset financial adjustment UI when switching complaints.
      setShowAdjustmentForm(false);
      setAdjustmentTicket(null);
      setAdjustmentPassword("");
      setAdjustmentAmount("");
      setAdjustmentDirection("CREDIT");
      setAdjustmentReason("MEMBER_COMPLAINT");
      setAdjustmentNote("");
      setAdjustmentError("");
      setAdjustmentSuccess("");

      setDetailLoading(true);
      setDetailError("");

      setAssignmentError("");
      setAssignmentSuccess("");
      setMessageError("");
      setStatusError("");
      setStatusSuccess("");
      setStatusAction(null);
      setResolutionReasonInput("");
      setSelectedAdminId("");

      const detail = await getAdminComplaintById(
        accessToken,
        complaintId,
      );

      setSelectedComplaint(detail);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết khiếu nại.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadActiveAdmins() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setAssignmentError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setAssignmentError("");

      const admins = await getActiveAdmins(accessToken);

      setActiveAdmins(admins);
    } catch (err) {
      setAssignmentError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách Admin.",
      );
    }
  }

  async function handleAssignAdmin() {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken || !selectedComplaintId) {
      setAssignmentError("Vui lòng chọn khiếu nại hợp lệ.");
      return;
    }

    if (!selectedAdminId) {
      setAssignmentError("Vui lòng chọn Admin tiếp nhận.");
      return;
    }

    try {
      setAssignmentLoading(true);
      setAssignmentError("");
      setAssignmentSuccess("");

      await assignAdminToComplaint(
        accessToken,
        selectedComplaintId,
        selectedAdminId,
      );

      await loadComplaintDetail(selectedComplaintId);
      await loadComplaints();

      setAssignmentSuccess("Phân công Admin thành công.");
      setSelectedAdminId("");
      await loadActiveAdmins();
    } catch (err) {
      setAssignmentError(
        err instanceof Error
          ? err.message
          : "Không thể phân công Admin.",
      );
    } finally {
      setAssignmentLoading(false);
    }
  }

  async function handleUpdateComplaintStatus() {
    if (!selectedComplaint || !statusAction || statusLoading) {
      return;
    }

    const isClosing =
      statusAction === "RESOLVED" || statusAction === "REJECTED";

    const reason = resolutionReasonInput.trim();

    if (isClosing && !reason) {
      setStatusError("Vui lòng nhập lý do giải quyết hoặc từ chối.");
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setStatusError(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      );
      return;
    }

    setStatusLoading(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const input: UpdateAdminComplaintStatusInput = {
        status: statusAction,
        ...(isClosing ? { resolutionReason: reason } : {}),
      };

      await updateAdminComplaintStatus(
        accessToken,
        selectedComplaint.id,
        input,
      );

      await loadComplaintDetail(selectedComplaint.id);
      await loadComplaints();

      setStatusAction(null);
      setResolutionReasonInput("");
      setStatusSuccess("Cập nhật trạng thái khiếu nại thành công.");
    } catch (err) {
      setStatusError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái khiếu nại.",
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDownloadAttachment(
    attachmentId: string,
    originalName: string,
  ) {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setMessageError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setMessageError("");

      const blob = await downloadAdminComplaintAttachment(
        accessToken,
        attachmentId,
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Không thể tải tệp đính kèm.",
      );
    }
  }

  async function handleSendMessage() {
    const content = messageContent.trim();

    if (!selectedComplaintId || !selectedComplaint) {
      setMessageError("Vui lòng chọn một phiếu khiếu nại.");
      return;
    }

    if (
      selectedComplaint.status === "RESOLVED" ||
      selectedComplaint.status === "REJECTED"
    ) {
      setMessageError("Phiếu đã đóng, không thể gửi tin nhắn mới.");
      return;
    }

    if (!content) {
      setMessageError("Vui lòng nhập nội dung tin nhắn.");
      return;
    }

    if (selectedAttachment && messageType === "INTERNAL_NOTE") {
      setMessageError(
        "Không thể đính kèm tệp trong ghi chú nội bộ. Hãy chuyển sang trả lời thành viên.",
      );
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setMessageError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setSendingMessage(true);
      setMessageError("");

      if (selectedAttachment) {
        await sendAdminComplaintMessageWithAttachment(
          accessToken,
          selectedComplaintId,
          content,
          selectedAttachment,
        );
      } else {
        await sendAdminComplaintMessage(
          accessToken,
          selectedComplaintId,
          {
            content,
            messageType,
          },
        );
      }

      setMessageContent("");
      setSelectedAttachment(null);

      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }

      await loadComplaintDetail(selectedComplaintId);
      await loadComplaints();
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Không thể gửi tin nhắn. Vui lòng thử lại.",
      );
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleRecallMessage(messageId: string) {
    if (!selectedComplaintId || !selectedComplaint) {
      return;
    }

    if (
      selectedComplaint.status === "RESOLVED" ||
      selectedComplaint.status === "REJECTED"
    ) {
      setRecallError({
        messageId,
        text: "Phiếu đã đóng, không thể thu hồi tin nhắn.",
      });
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setRecallError({
        messageId,
        text: "Phiên đăng nhập không hợp lệ.",
      });
      return;
    }

    if (
      !window.confirm(
        "Bạn có chắc chắn muốn thu hồi tin nhắn này? Tin nhắn sẽ bị ẩn khỏi cuộc hội thoại.",
      )
    ) {
      return;
    }

    try {
      setRecallingMessageId(messageId);
      setRecallError(null);

      await recallAdminComplaintMessage(
        accessToken,
        selectedComplaintId,
        messageId,
      );

      await loadComplaintDetail(selectedComplaintId);
      await loadComplaints();
    } catch (err) {
      setRecallError({
        messageId,
        text:
          err instanceof Error
            ? err.message
            : "Không thể thu hồi tin nhắn. Vui lòng thử lại.",
      });
    } finally {
      setRecallingMessageId(null);
    }
  }

  async function handleCreateAdjustment() {
    if (!selectedComplaint || adjustmentLoading || adjustmentTicket) {
      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setAdjustmentError("Phiên đăng nhập ADMIN không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    const parsedAmount = Number(adjustmentAmount);

    if (
      !Number.isSafeInteger(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setAdjustmentError("Số tiền phải là số nguyên dương hợp lệ.");
      return;
    }

    if (adjustmentReason === "OTHER" && !adjustmentNote.trim()) {
      setAdjustmentError("Vui lòng ghi rõ lý do khi chọn Lý do khác.");
      return;
    }

    setAdjustmentLoading(true);
    setAdjustmentError("");
    setAdjustmentSuccess("");

    try {
      const created = await createAdminFinancialAdjustment(
        accessToken,
        {
          recipientAccountId: selectedComplaint.accountId,
          complaintId: selectedComplaint.id,
          direction: adjustmentDirection,
          amount: parsedAmount,
          reason: adjustmentReason,
          ...(adjustmentNote.trim()
            ? { note: adjustmentNote.trim() }
            : {}),
        },
      );

      setAdjustmentTicket(created);
      setAdjustmentPassword("");
      setShowAdjustmentForm(false);
      setAdjustmentSuccess(
        `Đã tạo phiếu ${created.ticketCode}. Vui lòng xác nhận trong 15 phút.`,
      );
    } catch (err) {
      setAdjustmentError(
        err instanceof Error
          ? err.message
          : "Không thể tạo phiếu điều chỉnh số dư.",
      );
    } finally {
      setAdjustmentLoading(false);
    }
  }

  async function handleConfirmAdjustment() {
    if (
      !adjustmentTicket ||
      !adjustmentPassword ||
      adjustmentLoading
    ) {
      if (!adjustmentPassword) {
        setAdjustmentError("Vui lòng nhập mật khẩu ADMIN để xác nhận.");
      }

      return;
    }

    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      setAdjustmentError("Phiên đăng nhập ADMIN không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    setAdjustmentLoading(true);
    setAdjustmentError("");
    setAdjustmentSuccess("");

    try {
      const completed = await confirmAdminFinancialAdjustment(
        accessToken,
        adjustmentTicket.ticketCode,
        adjustmentPassword,
      );

      setAdjustmentSuccess(
        `Phiếu ${completed.ticketCode} đã được xác nhận thành công.`,
      );
      setAdjustmentTicket(null);
      setAdjustmentPassword("");
      setAdjustmentAmount("");
      setAdjustmentNote("");
      setAdjustmentDirection("CREDIT");
      setAdjustmentReason("MEMBER_COMPLAINT");
      setShowAdjustmentForm(false);
    } catch (err) {
      setAdjustmentError(
        err instanceof Error
          ? err.message
          : "Không thể xác nhận phiếu điều chỉnh số dư.",
      );
    } finally {
      setAdjustmentLoading(false);
    }
  }

  useEffect(() => {
    void loadActiveAdmins();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadComplaints(searchTerm);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);


  useEffect(() => {
    if (!selectedComplaintId) {
      return;
    }

    let cancelled = false;
    let refreshing = false;

    const refreshConversation = async () => {
      if (
        cancelled ||
        refreshing ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const accessToken = getAccessToken("ADMIN");

      if (!accessToken) {
        return;
      }

      refreshing = true;

      try {
        const latest = await getAdminComplaintById(
          accessToken,
          selectedComplaintId,
        );

        if (!cancelled) {
          setSelectedComplaint((current) => {
            if (current?.id !== latest.id) {
              return current;
            }

            return latest;
          });
        }
      } catch {
        // Bỏ qua lỗi polling tạm thời.
        // Không làm gián đoạn thao tác đang thực hiện.
      } finally {
        refreshing = false;
      }
    };

    const timerId = window.setInterval(() => {
      void refreshConversation();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshConversation();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [selectedComplaintId]);


  const page =
    pageConfig[currentPath as keyof typeof pageConfig] ??
    pageConfig["/admin/member-support"];

  const categoryScopedComplaints = complaints.filter((complaint) => {
    if (currentPath === "/admin/member-support/payments") {
      return ["PAYMENT", "WALLET", "WITHDRAWAL"].includes(
        complaint.category,
      );
    }

    if (currentPath === "/admin/member-support/returns") {
      return complaint.category === "RETURN";
    }

    if (currentPath === "/admin/member-support/feedback") {
      return complaint.category === "FEEDBACK";
    }

    return true;
  });

  const filteredComplaints = categoryScopedComplaints.filter((complaint) => {
    if (statusFilter === "OPEN") {
      return (
        complaint.status === "PENDING" ||
        complaint.status === "IN_PROGRESS"
      );
    }

    return true;
  });

  const totalLoaded = categoryScopedComplaints.length;

  const pendingCount = categoryScopedComplaints.filter(
    (complaint) => complaint.status === "PENDING",
  ).length;

  const inProgressCount = categoryScopedComplaints.filter(
    (complaint) => complaint.status === "IN_PROGRESS",
  ).length;

  const resolvedCount = categoryScopedComplaints.filter(
    (complaint) => complaint.status === "RESOLVED",
  ).length;

  const isComplaintClosed =
    selectedComplaint?.status === "RESOLVED" ||
    selectedComplaint?.status === "REJECTED";

  return (
    <div className="admin-page admin-support-page">
      <div className="admin-page-header admin-support-page-header">
        <div>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>

        <div className="admin-support-header-note">
          <span className="admin-support-live-dot" />
          Trung tâm hỗ trợ
        </div>
      </div>

      <div className="admin-support-stats">
        <div className="admin-support-stat">
          <div className="admin-support-stat-icon blue">▤</div>
          <div>
            <span>Tổng hội thoại đã tải</span>
            <strong>{totalLoaded}</strong>
            <small>Tối đa 50 phiếu trong kết quả hiện tại</small>
          </div>
        </div>

        <div className="admin-support-stat">
          <div className="admin-support-stat-icon orange">◷</div>
          <div>
            <span>Chờ xử lý</span>
            <strong>{pendingCount}</strong>
            <small>Trạng thái PENDING</small>
          </div>
        </div>

        <div className="admin-support-stat">
          <div className="admin-support-stat-icon purple">☷</div>
          <div>
            <span>Đang xử lý</span>
            <strong>{inProgressCount}</strong>
            <small>Trạng thái IN_PROGRESS</small>
          </div>
        </div>

        <div className="admin-support-stat">
          <div className="admin-support-stat-icon green">✓</div>
          <div>
            <span>Đã giải quyết</span>
            <strong>{resolvedCount}</strong>
            <small>Trạng thái RESOLVED</small>
          </div>
        </div>
      </div>

      <div className="admin-support-workspace">
        <aside className="admin-support-inbox">
          <div className="admin-support-inbox-header">
            <div>
              <h2>Hội thoại</h2>
              <span>
                {totalLoaded} phiếu trong kết quả đã tải
              </span>
            </div>
          </div>

          <div className="admin-support-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Tìm tên, mã phiếu..."
              aria-label="Tìm hội thoại"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
            />
          </div>

          <div className="admin-support-filter-row">
            <button
              type="button"
              className={statusFilter === "ALL" ? "active" : ""}
              onClick={() => setStatusFilter("ALL")}
            >
              Tất cả ({totalLoaded})
            </button>

            <button
              type="button"
              className={statusFilter === "OPEN" ? "active" : ""}
              onClick={() => setStatusFilter("OPEN")}
            >
              Đang mở ({pendingCount + inProgressCount})
            </button>
          </div>

          <div className="admin-support-conversation-list">
            {loading ? (
              <div className="admin-support-inbox-footer">
                Đang tải danh sách khiếu nại...
              </div>
            ) : error ? (
              <div className="admin-support-inbox-footer">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void loadComplaints(searchTerm)}
                >
                  Thử tải lại
                </button>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="admin-support-inbox-footer">
                {statusFilter === "OPEN"
                  ? "Không có khiếu nại đang mở."
                  : "Không tìm thấy khiếu nại nào."}
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <button
                  type="button"
                  key={complaint.id}
                  className={`admin-support-conversation ${complaint.id === selectedComplaintId ? "selected" : ""
                    }`}
                  onClick={() => void loadComplaintDetail(complaint.id)}
                >
                  <div className="admin-support-avatar">
                    {complaint.ticketCode.slice(-2)}
                  </div>

                  <div className="admin-support-conversation-content">
                    <div className="admin-support-conversation-top">
                      <strong>{complaint.ticketCode}</strong>
                      <span>
                        {formatComplaintTime(complaint.updatedAt)}
                      </span>
                    </div>

                    <div className="admin-support-conversation-subject">
                      {complaint.subject}
                    </div>

                    <div className="admin-support-conversation-preview">
                      {complaint._count.messages} tin nhắn · Mã thành viên:{" "}
                      {complaint.accountId}
                    </div>

                    <div className="admin-support-conversation-bottom">
                      <span
                        className={`admin-support-tag ${getComplaintCategoryClass(
                          complaint.category,
                        )}`}
                      >
                        {getComplaintCategoryLabel(complaint.category)}
                      </span>

                      <span
                        className={`admin-support-status ${getComplaintStatusClass(
                          complaint.status,
                        )}`}
                      >
                        {getComplaintStatusLabel(complaint.status)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="admin-support-inbox-footer">
            {loading
              ? "Đang tải dữ liệu..."
              : `Đang hiển thị ${filteredComplaints.length} phiếu`}
          </div>
        </aside>

        <section className="admin-support-chat">
          <div className="admin-support-chat-header">
            <div className="admin-support-chat-person">
              <div className="admin-support-avatar large">
                {selectedComplaint
                  ? selectedComplaint.ticketCode.slice(-2)
                  : "KH"}
              </div>

              <div>
                <h2>
                  {selectedComplaint
                    ? selectedComplaint.ticketCode
                    : "Chưa chọn khiếu nại"}
                </h2>

                <div className="admin-support-chat-subtitle">
                  <span>
                    {selectedComplaint
                      ? `Mã thành viên: ${selectedComplaint.accountId}`
                      : "Chọn phiếu từ danh sách"}
                  </span>

                  {selectedComplaint && (
                    <>
                      <span className="admin-support-separator">•</span>
                      <span>
                        Tạo lúc{" "}
                        {formatComplaintTime(selectedComplaint.createdAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-support-chat-actions">
              {selectedComplaint && (
                <span
                  className={`admin-support-status ${getComplaintStatusClass(
                    selectedComplaint.status,
                  )}`}
                >
                  {getComplaintStatusLabel(selectedComplaint.status)}
                </span>
              )}
            </div>
          </div>

          <div className="admin-support-chat-topic">
            <div>
              <span>CHỦ ĐỀ HỖ TRỢ</span>
              <strong>
                {selectedComplaint
                  ? selectedComplaint.subject
                  : "Chưa có chủ đề"}
              </strong>
            </div>

            {selectedComplaint && (
              <span
                className={`admin-support-tag ${getComplaintCategoryClass(
                  selectedComplaint.category,
                )}`}
              >
                {getComplaintCategoryLabel(selectedComplaint.category)}
              </span>
            )}
          </div>

          {selectedComplaint && (
            <div className="admin-support-assignment">
              <div className="admin-support-assignment-header">
                <strong>Người phụ trách</strong>
                <span>
                  {selectedComplaint.assignments.length}/2 Admin
                </span>
              </div>

              {selectedComplaint.assignments.length > 0 && (
                <div className="admin-support-assignment-list">
                  {selectedComplaint.assignments.map((assignment) => (
                    <div key={assignment.adminId}>
                      <span>Admin #{assignment.adminId}</span>
                      <span>
                        {new Date(assignment.assignedAt).toLocaleString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!isComplaintClosed &&
                selectedComplaint.assignments.length < 2 && (
                  <div className="admin-support-assignment-controls">
                    <select
                      value={selectedAdminId}
                      onChange={(event) => {
                        setSelectedAdminId(event.target.value);
                        setAssignmentError("");
                        setAssignmentSuccess("");
                      }}
                      disabled={assignmentLoading}
                    >
                      <option value="">Chọn Admin tiếp nhận</option>

                      {activeAdmins
                        .filter(
                          (admin) =>
                            !selectedComplaint.assignments.some(
                              (assignment) =>
                                assignment.adminId === String(admin.id),
                            ),
                        )
                        .map((admin) => (
                          <option
                            key={admin.id}
                            value={String(admin.id)}
                          >
                            {admin.username} — {admin.email}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void handleAssignAdmin()}
                      disabled={assignmentLoading || !selectedAdminId}
                    >
                      {assignmentLoading
                        ? "Đang phân công..."
                        : "Phân công"}
                    </button>
                  </div>
                )}

              {assignmentError && (
                <p className="admin-support-assignment-error">
                  {assignmentError}
                </p>
              )}

              {assignmentSuccess && (
                <p className="admin-support-assignment-success">
                  {assignmentSuccess}
                </p>
              )}
            </div>
          )}

          <div className="admin-support-messages">
            {detailLoading ? (
              <div className="admin-support-system-message">
                <span>◷</span>
                Đang tải lịch sử trao đổi...
              </div>
            ) : detailError ? (
              <div className="admin-support-system-message">
                <span>!</span>
                {detailError}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedComplaintId) {
                      void loadComplaintDetail(selectedComplaintId);
                    }
                  }}
                >
                  Thử tải lại
                </button>
              </div>
            ) : !selectedComplaint ? (
              <div className="admin-support-system-message">
                <span>✦</span>
                Chọn một phiếu khiếu nại để xem lịch sử trao đổi.
              </div>
            ) : selectedComplaint.messages.length === 0 ? (
              <div className="admin-support-system-message">
                <span>✦</span>
                Phiếu này chưa có tin nhắn.
              </div>
            ) : (
              <>
                <div className="admin-support-date-divider">
                  <span>
                    {new Date(
                      selectedComplaint.createdAt,
                    ).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                {selectedComplaint.messages.map((message) => {
                  const isInternalNote =
                    message.messageType === "INTERNAL_NOTE";
                  const isAdmin = message.senderType === "ADMIN";

                  const currentAdminId = getAdminIdFromAccessToken(
                    getAccessToken("ADMIN"),
                  );

                  const messageAge = Date.now() - new Date(message.createdAt).getTime();

                  const canRecallMessage =
                    !isInternalNote &&
                    message.messageType === "MESSAGE" &&
                    isAdmin &&
                    currentAdminId !== null &&
                    message.senderAdminId === currentAdminId &&
                    messageAge >= 0 &&
                    messageAge <= 5 * 60 * 1000 &&
                    selectedComplaint.status !== "RESOLVED" &&
                    selectedComplaint.status !== "REJECTED";

                  if (isInternalNote) {
                    return (
                      <div
                        className="admin-support-message internal-note"
                        key={message.id}
                      >
                        <div className="admin-support-message-avatar">
                          AD
                        </div>

                        <div className="admin-support-message-body">
                          <div className="admin-support-message-meta">
                            <strong>
                              Admin #{message.senderAdminId ?? ""}
                            </strong>
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString(
                                "vi-VN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          <div className="admin-support-bubble">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={`admin-support-message ${isAdmin ? "admin" : "customer"
                        }`}
                      key={message.id}
                    >
                      <div className="admin-support-message-avatar">
                        {isAdmin
                          ? "AD"
                          : selectedComplaint.ticketCode.slice(-2) || "KH"}
                      </div>

                      <div className="admin-support-message-body">
                        <div className="admin-support-message-meta">
                          <strong>
                            {isAdmin
                              ? `Admin #${message.senderAdminId ?? ""}`
                              : `Thành viên #${message.senderAccountId ??
                              selectedComplaint.accountId
                              }`}
                          </strong>
                          <span>
                            {new Date(message.createdAt).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>

                        <div className="admin-support-bubble">
                          {message.content}
                        </div>

                        {canRecallMessage && (
                          <div className="admin-support-message-actions">
                            <button
                              type="button"
                              onClick={() => void handleRecallMessage(message.id)}
                              disabled={recallingMessageId !== null}
                            >
                              {recallingMessageId === message.id
                                ? "Đang thu hồi..."
                                : "Thu hồi tin nhắn"}
                            </button>

                            {recallError?.messageId === message.id && (
                              <p role="alert" className="admin-support-error">
                                {recallError.text}
                              </p>
                            )}
                          </div>
                        )}

                        {message.attachments.map((attachment) => (
                          <div
                            className="admin-support-attachment"
                            key={attachment.id}
                          >
                            <div className="admin-support-file-icon">
                              {attachment.originalName
                                .split(".")
                                .pop()
                                ?.slice(0, 4)
                                .toUpperCase() ?? "FILE"}
                            </div>

                            <div>
                              <strong>{attachment.originalName}</strong>
                              <span>
                                {(
                                  attachment.sizeBytes / 1024
                                ).toLocaleString("vi-VN", {
                                  maximumFractionDigits: 1,
                                })}{" "}
                                KB
                              </span>
                            </div>

                            <button
                              type="button"
                              className="admin-support-file-action"
                              aria-label={`Tải tệp ${attachment.originalName}`}
                              title="Tải tệp xuống"
                              onClick={() =>
                                void handleDownloadAttachment(
                                  attachment.id,
                                  attachment.originalName,
                                )
                              }
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="admin-support-composer">
            <div className="admin-support-composer-toolbar">
              <span>
                {messageType === "INTERNAL_NOTE"
                  ? "Ghi chú nội bộ"
                  : "Trả lời thành viên"}
              </span>

              <span className="admin-support-composer-hint">
                {messageType === "INTERNAL_NOTE"
                  ? "Chỉ Admin nhìn thấy ghi chú này"
                  : "Phản hồi sẽ hiển thị với người gửi"}
              </span>
            </div>

            {messageError && (
              <p role="alert" className="admin-support-error">
                {messageError}
              </p>
            )}

            <textarea
              placeholder={
                messageType === "INTERNAL_NOTE"
                  ? "Nhập ghi chú nội bộ..."
                  : "Nhập tin nhắn phản hồi..."
              }
              rows={3}
              aria-label={
                messageType === "INTERNAL_NOTE"
                  ? "Nội dung ghi chú nội bộ"
                  : "Nội dung phản hồi"
              }
              value={messageContent}
              onChange={(event) =>
                setMessageContent(event.target.value)
              }
              disabled={
                !selectedComplaint ||
                detailLoading ||
                sendingMessage ||
                Boolean(isComplaintClosed)
              }
            />

            <div className="admin-support-composer-footer">
              <div className="admin-support-composer-tools">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedAttachment(file);
                    setMessageError("");
                  }}
                />

                <button
                  type="button"
                  aria-label="Đính kèm tệp"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={
                    !selectedComplaint ||
                    detailLoading ||
                    sendingMessage ||
                    Boolean(isComplaintClosed) ||
                    messageType === "INTERNAL_NOTE"
                  }
                  title={
                    messageType === "INTERNAL_NOTE"
                      ? "Chuyển sang trả lời thành viên để đính kèm tệp"
                      : "Chọn tệp đính kèm"
                  }
                >
                  ⊕ <span>Đính kèm</span>
                </button>

                {selectedAttachment && (
                  <div className="admin-support-selected-file">
                    <span title={selectedAttachment.name}>
                      {selectedAttachment.name}
                    </span>

                    <button
                      type="button"
                      aria-label="Bỏ tệp đính kèm"
                      onClick={() => {
                        setSelectedAttachment(null);

                        if (attachmentInputRef.current) {
                          attachmentInputRef.current.value = "";
                        }
                      }}
                      disabled={sendingMessage}
                    >
                      ×
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  aria-label="Ghi chú nội bộ"
                  aria-pressed={messageType === "INTERNAL_NOTE"}
                  onClick={() => {
                    setMessageType((current) =>
                      current === "INTERNAL_NOTE"
                        ? "MESSAGE"
                        : "INTERNAL_NOTE",
                    );
                    setMessageError("");
                  }}
                  disabled={
                    !selectedComplaint ||
                    detailLoading ||
                    sendingMessage ||
                    Boolean(isComplaintClosed)
                  }
                >
                  ▤{" "}
                  <span>
                    {messageType === "INTERNAL_NOTE"
                      ? "Chuyển sang trả lời"
                      : "Ghi chú nội bộ"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                className="admin-support-send-button"
                onClick={() => void handleSendMessage()}
                disabled={
                  !selectedComplaint ||
                  detailLoading ||
                  sendingMessage ||
                  !messageContent.trim() ||
                  Boolean(isComplaintClosed)
                }
              >
                {sendingMessage ? "Đang gửi..." : "Gửi phản hồi"}
                {!sendingMessage && <span> ➤</span>}
              </button>
            </div>
          </div>
        </section>

        <aside className="admin-support-details">
          <div className="admin-support-details-header">
            <h2>Thông tin xử lý</h2>
          </div>

          <div className="admin-support-profile">
            <div className="admin-support-avatar profile">
              {selectedComplaint
                ? selectedComplaint.ticketCode.slice(-2)
                : "KH"}
            </div>

            <h3>
              {selectedComplaint
                ? `Thành viên #${selectedComplaint.accountId}`
                : "Chưa chọn thành viên"}
            </h3>

            <span>Người gửi khiếu nại</span>
          </div>

          <div className="admin-support-detail-section">
            <h3>Phân loại</h3>

            <div className="admin-support-detail-field">
              <label>Nhãn khiếu nại</label>
              <div className="admin-support-fake-select">
                {selectedComplaint ? (
                  <span
                    className={`admin-support-tag ${getComplaintCategoryClass(
                      selectedComplaint.category,
                    )}`}
                  >
                    {getComplaintCategoryLabel(
                      selectedComplaint.category,
                    )}
                  </span>
                ) : (
                  <span>Chưa có dữ liệu</span>
                )}
              </div>
            </div>

            <div className="admin-support-detail-field">
              <label>Trạng thái</label>

              <div className="admin-support-status-panel">
                <div className="admin-support-fake-select">
                  {selectedComplaint ? (
                    <span
                      className={`admin-support-status ${getComplaintStatusClass(
                        selectedComplaint.status,
                      )}`}
                    >
                      {getComplaintStatusLabel(
                        selectedComplaint.status,
                      )}
                    </span>
                  ) : (
                    <span>Chưa có dữ liệu</span>
                  )}
                </div>


                {selectedComplaint &&
                  !isComplaintClosed &&
                  selectedComplaint.status === "IN_PROGRESS" && (
                    <div className="admin-support-status-actions">
                      <button
                        type="button"
                        className="admin-support-action-button admin-support-action-success"
                        disabled={statusLoading || detailLoading}
                        onClick={() => {
                          setStatusAction("RESOLVED");
                          setResolutionReasonInput("");
                          setStatusError("");
                          setStatusSuccess("");
                        }}
                      >
                        Giải quyết
                      </button>

                      <button
                        type="button"
                        className="admin-support-action-button admin-support-action-danger"
                        disabled={statusLoading || detailLoading}
                        onClick={() => {
                          setStatusAction("REJECTED");
                          setResolutionReasonInput("");
                          setStatusError("");
                          setStatusSuccess("");
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  )}


                {statusAction && selectedComplaint && (
                  <div className="admin-support-status-editor">
                    <label htmlFor="admin-support-resolution-reason">
                      {statusAction === "RESOLVED"
                        ? "Lý do giải quyết"
                        : "Lý do từ chối"}
                    </label>

                    {statusAction !== "IN_PROGRESS" && (
                      <textarea
                        id="admin-support-resolution-reason"
                        className="admin-support-resolution-textarea"
                        value={resolutionReasonInput}
                        onChange={(event) =>
                          setResolutionReasonInput(event.target.value)
                        }
                        placeholder="Nhập lý do xử lý..."
                        rows={4}
                        disabled={statusLoading}
                      />
                    )}

                    {statusError && (
                      <p className="admin-support-status-feedback is-error">
                        {statusError}
                      </p>
                    )}

                    <div className="admin-support-status-editor-actions">
                      <button
                        type="button"
                        className="admin-support-action-button admin-support-action-primary"
                        disabled={statusLoading}
                        onClick={() =>
                          void handleUpdateComplaintStatus()
                        }
                      >
                        {statusLoading
                          ? "Đang cập nhật..."
                          : "Xác nhận"}
                      </button>

                      <button
                        type="button"
                        className="admin-support-action-button admin-support-action-secondary"
                        disabled={statusLoading}
                        onClick={() => {
                          setStatusAction(null);
                          setResolutionReasonInput("");
                          setStatusError("");
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {statusError && !statusAction && (
                  <p className="admin-support-status-feedback is-error">
                    {statusError}
                  </p>
                )}

                {statusSuccess && (
                  <p className="admin-support-status-feedback is-success">
                    {statusSuccess}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="admin-support-detail-section">
            <h3>Kết quả xử lý</h3>

            <div className="admin-support-detail-field">
              <label>
                {selectedComplaint?.status === "REJECTED"
                  ? "Lý do từ chối"
                  : "Lý do giải quyết"}
              </label>

              <div
                className={`admin-support-note-preview ${selectedComplaint?.resolutionReason
                  ? "has-resolution"
                  : "is-empty"
                  }`}
              >
                {selectedComplaint?.resolutionReason ||
                  "Chưa có kết luận cuối cùng."}
              </div>
            </div>
          </div>



          {selectedComplaint?.status !== "RESOLVED" && (
            <div className="admin-support-detail-section">
              <h3>Điều chỉnh số dư</h3>

              {!selectedComplaint ? (
                <p>Chọn một khiếu nại để lập phiếu điều chỉnh.</p>
              ) : (
                <>
                  <div className="admin-support-info-row">
                    <span>Tài khoản nhận</span>
                    <strong>
                      {selectedComplaint.account.platform} #
                      {selectedComplaint.accountId}
                    </strong>
                  </div>

                  {adjustmentTicket ? (
                    <>
                      <div className="admin-support-info-row">
                        <span>Mã phiếu điều chỉnh</span>
                        <strong>{adjustmentTicket.ticketCode}</strong>
                      </div>

                      <div className="admin-support-info-row">
                        <span>Loại điều chỉnh</span>
                        <strong>
                          {adjustmentTicket.direction === "CREDIT"
                            ? "Cộng tiền"
                            : "Trừ tiền"}
                        </strong>
                      </div>

                      <div className="admin-support-info-row">
                        <span>Số tiền</span>
                        <strong>
                          {Number(adjustmentTicket.amount).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          ₫
                        </strong>
                      </div>

                      <div className="admin-support-info-row">
                        <span>Trạng thái</span>
                        <strong>
                          {adjustmentTicket.status === "PENDING"
                            ? "Chờ xác nhận"
                            : adjustmentTicket.status === "COMPLETED"
                              ? "Đã hoàn tất"
                              : "Đã hết hạn"}
                        </strong>
                      </div>

                      {adjustmentTicket.status === "PENDING" && (
                        <div className="admin-support-detail-field">
                          <label htmlFor="adjustment-admin-password">
                            Nhập lại mật khẩu ADMIN
                          </label>
                          <input
                            id="adjustment-admin-password"
                            type="password"
                            autoComplete="current-password"
                            value={adjustmentPassword}
                            onChange={(event) =>
                              setAdjustmentPassword(event.target.value)
                            }
                            disabled={adjustmentLoading}
                            placeholder="Mật khẩu tài khoản ADMIN"
                          />
                          <button
                            type="button"
                            onClick={() => void handleConfirmAdjustment()}
                            disabled={
                              adjustmentLoading || !adjustmentPassword
                            }
                          >
                            {adjustmentLoading
                              ? "Đang xác nhận..."
                              : "Xác nhận điều chỉnh"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!showAdjustmentForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustmentError("");
                            setAdjustmentSuccess("");
                            setShowAdjustmentForm(true);
                          }}
                          disabled={adjustmentLoading}
                        >
                          Lập phiếu điều chỉnh
                        </button>
                      ) : (
                        <>
                          <div className="admin-support-detail-field">
                            <label htmlFor="adjustment-direction">
                              Loại điều chỉnh
                            </label>
                            <select
                              id="adjustment-direction"
                              value={adjustmentDirection}
                              onChange={(event) =>
                                setAdjustmentDirection(
                                  event.target.value as FinancialAdjustmentDirection,
                                )
                              }
                              disabled={adjustmentLoading}
                            >
                              <option value="CREDIT">Cộng tiền</option>
                              <option value="DEBIT">Trừ tiền</option>
                            </select>
                          </div>

                          <div className="admin-support-detail-field">
                            <label htmlFor="adjustment-amount">
                              Số tiền (VNĐ)
                            </label>
                            <input
                              id="adjustment-amount"
                              type="number"
                              min="1"
                              step="1"
                              value={adjustmentAmount}
                              onChange={(event) =>
                                setAdjustmentAmount(event.target.value)
                              }
                              disabled={adjustmentLoading}
                              placeholder="Nhập số tiền"
                            />
                          </div>

                          <div className="admin-support-detail-field">
                            <label htmlFor="adjustment-reason">Lý do</label>
                            <select
                              id="adjustment-reason"
                              value={adjustmentReason}
                              onChange={(event) =>
                                setAdjustmentReason(
                                  event.target.value as FinancialAdjustmentReason,
                                )
                              }
                              disabled={adjustmentLoading}
                            >
                              <option value="LATE_BANK_TRANSFER">
                                Chuyển khoản đến trễ
                              </option>
                              <option value="MEMBER_COMPLAINT">
                                Khiếu nại Member
                              </option>
                              <option value="FRANCHISE_COMPLAINT">
                                Khiếu nại Franchise
                              </option>
                              <option value="COMPENSATION">Bồi thường</option>
                              <option value="TRANSACTION_CORRECTION">
                                Điều chỉnh sai lệch giao dịch
                              </option>
                              <option value="OTHER">Lý do khác</option>
                            </select>
                          </div>

                          <div className="admin-support-detail-field">
                            <label htmlFor="adjustment-note">
                              Ghi chú{" "}
                              {adjustmentReason === "OTHER"
                                ? "(bắt buộc)"
                                : "(không bắt buộc)"}
                            </label>
                            <textarea
                              id="adjustment-note"
                              value={adjustmentNote}
                              onChange={(event) =>
                                setAdjustmentNote(event.target.value)
                              }
                              disabled={adjustmentLoading}
                              rows={3}
                              placeholder="Ghi rõ căn cứ điều chỉnh"
                            />
                          </div>

                          <div className="admin-support-detail-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAdjustmentForm(false);
                                setAdjustmentError("");
                              }}
                              disabled={adjustmentLoading}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCreateAdjustment()}
                              disabled={adjustmentLoading}
                            >
                              {adjustmentLoading
                                ? "Đang tạo phiếu..."
                                : "Tạo phiếu chờ xác nhận"}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {adjustmentError && (
                    <p role="alert" className="admin-support-error">
                      {adjustmentError}
                    </p>
                  )}

                  {adjustmentSuccess && (
                    <p
                      role="status"
                      className="admin-support-status-feedback is-success"
                    >
                      {adjustmentSuccess}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="admin-support-detail-section">
            <h3>Thông tin phiếu</h3>


            <div className="admin-support-info-row">
              <span>Mã phiếu</span>
              <strong>{selectedComplaint?.ticketCode || "—"}</strong>
            </div>

            <div className="admin-support-info-row">
              <span>Ngày tạo</span>
              <strong>
                {selectedComplaint
                  ? formatComplaintTime(selectedComplaint.createdAt)
                  : "—"}
              </strong>
            </div>

            <div className="admin-support-info-row">
              <span>Số tin nhắn</span>
              <strong>
                {selectedComplaint?.messages.length ?? "—"}
              </strong>
            </div>

            <div className="admin-support-info-row">
              <span>Người phụ trách</span>
              <strong>
                {selectedComplaint
                  ? selectedComplaint.assignments.length > 0
                    ? selectedComplaint.assignments
                      .map(
                        (assignment) =>
                          `Admin #${assignment.adminId}`,
                      )
                      .join(", ")
                    : "Chưa phân công"
                  : "—"}
              </strong>
            </div>

            <div className="admin-support-info-row">
              <span>Phản hồi đầu tiên</span>
              <strong>
                {selectedComplaint?.firstResponseAt
                  ? formatComplaintTime(
                    selectedComplaint.firstResponseAt,
                  )
                  : "Chưa phản hồi"}
              </strong>
            </div>

            <div className="admin-support-info-row">
              <span>Đóng phiếu lúc</span>
              <strong>
                {selectedComplaint?.closedAt
                  ? formatComplaintTime(selectedComplaint.closedAt)
                  : "Chưa đóng"}
              </strong>
            </div>
          </div>

          <div className="admin-support-detail-section">
            <h3>Lịch sử hoạt động</h3>
            <div className="admin-support-history-list">
              {!selectedComplaint ? (
                <p>Chọn một phiếu để xem lịch sử.</p>
              ) : selectedComplaint.histories.length === 0 ? (
                <p>Chưa có lịch sử hoạt động.</p>
              ) : (
                selectedComplaint.histories.map((history, index) => (
                  <div
                    className="admin-support-info-row"
                    key={`${history.createdAt}-${index}`}
                  >
                    <span>
                      {history.action}
                      <br />
                      {formatComplaintTime(history.createdAt)}
                    </span>

                    <strong>
                      {history.actorType === "ADMIN"
                        ? `Admin #${history.actorAdminId ?? ""}`
                        : `Thành viên #${history.actorAccountId ?? ""
                        }`}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-support-close-area">
            <p>
              Trạng thái chỉ được thay đổi sau khi thực hiện thao tác xử lý
              qua API.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AdminMemberSupportPage;
