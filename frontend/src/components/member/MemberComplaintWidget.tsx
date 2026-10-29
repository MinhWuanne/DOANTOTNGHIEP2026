import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import { getAccessToken } from "../../utils/auth";
import {
    createMemberComplaint,
    downloadMemberComplaintAttachment,
    getMemberComplaintById,
    getMemberComplaints,
    sendMemberComplaintMessage,
    sendMemberComplaintMessageWithAttachment,
    type ComplaintCategory,
    type ComplaintStatus,
    type MemberComplaintDetail,
    type MemberComplaintListItem,
} from "../../services/api/member-complaint.api";

import "./MemberComplaintWidget.css";

type WidgetView = "list" | "create" | "detail";

const CATEGORY_OPTIONS: {
    value: ComplaintCategory;
    label: string;
}[] = [
        { value: "ORDER", label: "Đơn hàng" },
        { value: "PAYMENT", label: "Thanh toán" },
        { value: "RETURN", label: "Đổi trả / hoàn tiền" },
        { value: "WALLET", label: "Ví thành viên" },
        { value: "COMMISSION", label: "Hoa hồng" },
        { value: "WITHDRAWAL", label: "Rút tiền" },
        { value: "ACCOUNT", label: "Tài khoản" },
        { value: "REF", label: "Giới thiệu thành viên" },
        { value: "FEEDBACK", label: "Góp ý dịch vụ" },
        { value: "OTHER", label: "Vấn đề khác" },
    ];

const STATUS_LABELS: Record<ComplaintStatus, string> = {
    PENDING: "Chờ tiếp nhận",
    IN_PROGRESS: "Đang xử lý",
    RESOLVED: "Đã giải quyết",
    REJECTED: "Từ chối",
};

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryLabel(category: ComplaintCategory): string {
    return (
        CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
        category
    );
}

function getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
        return "Đã xảy ra lỗi. Vui lòng thử lại.";
    }

    const messages: Record<string, string> = {
        COMPLAINT_LIST_FAILED: "Không thể tải danh sách khiếu nại.",
        COMPLAINT_DETAIL_FAILED: "Không thể tải chi tiết khiếu nại.",
        COMPLAINT_CREATE_FAILED: "Không thể tạo khiếu nại.",
        COMPLAINT_MESSAGE_SEND_FAILED: "Không thể gửi tin nhắn.",
        COMPLAINT_ATTACHMENT_SEND_FAILED: "Không thể gửi tin nhắn kèm tệp.",
        COMPLAINT_ATTACHMENT_DOWNLOAD_FAILED: "Không thể tải tệp đính kèm.",
    };

    return messages[error.message] ?? error.message;
}

function isComplaintClosed(status: ComplaintStatus): boolean {
    return status === "RESOLVED" || status === "REJECTED";
}

export default function MemberComplaintWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<WidgetView>("list");
    const [complaints, setComplaints] = useState<MemberComplaintListItem[]>([]);
    const [selectedComplaint, setSelectedComplaint] =
        useState<MemberComplaintDetail | null>(null);

    const [category, setCategory] = useState<ComplaintCategory>("ORDER");
    const [subject, setSubject] = useState("");
    const [initialContent, setInitialContent] = useState("");
    const [message, setMessage] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    //   const accessToken = getAccessToken("MEMBER");

    const loadComplaints = useCallback(async () => {
        const token = getAccessToken("MEMBER");

        if (!token) {
            setError("Vui lòng đăng nhập tài khoản Member để sử dụng hỗ trợ.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await getMemberComplaints(token);
            setComplaints(result);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const openComplaint = useCallback(async (complaintId: string) => {
        const token = getAccessToken("MEMBER");

        if (!token) {
            setError("Vui lòng đăng nhập lại tài khoản Member.");
            return;
        }

        setIsLoading(true);
        setError("");
        setNotice("");

        try {
            const detail = await getMemberComplaintById(token, complaintId);
            setSelectedComplaint(detail);
            setView("detail");
        } catch (detailError) {
            setError(getErrorMessage(detailError));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        void loadComplaints();
    }, [isOpen, loadComplaints]);

    useEffect(() => {
        if (!isOpen || document.visibilityState !== "visible") {
            return;
        }

        let cancelled = false;

        const refreshConversation = async () => {
            const token = getAccessToken("MEMBER");

            if (!token || cancelled) {
                return;
            }

            try {
                if (view === "detail" && selectedComplaint?.id) {
                    const latest = await getMemberComplaintById(
                        token,
                        selectedComplaint.id,
                    );

                    if (!cancelled) {
                        setSelectedComplaint((current) => {
                            if (current?.id !== latest.id) {
                                return current;
                            }

                            return latest;
                        });
                    }
                } else if (view === "list") {
                    const latest = await getMemberComplaints(token);

                    if (!cancelled) {
                        setComplaints(latest);
                    }
                }
            } catch {
                // Lỗi polling tạm thời không làm gián đoạn cuộc trò chuyện.
                // Người dùng vẫn có thể dùng nút làm mới hoặc gửi tin nhắn.
            }
        };

        const intervalMs = view === "detail" ? 3000 : 12000;

        const timerId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void refreshConversation();
            }
        }, intervalMs);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void refreshConversation();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            window.clearInterval(timerId);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [isOpen, view, selectedComplaint?.id]);

    const handleCreateComplaint = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const token = getAccessToken("MEMBER");

        if (!token) {
            setError("Vui lòng đăng nhập tài khoản Member để tạo khiếu nại.");
            return;
        }

        if (!subject.trim() || !initialContent.trim()) {
            setError("Vui lòng nhập tiêu đề và nội dung khiếu nại.");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setNotice("");

        try {
            const created = await createMemberComplaint(token, {
                category,
                subject: subject.trim(),
                content: initialContent.trim(),
            });

            setSubject("");
            setInitialContent("");
            setCategory("ORDER");

            await loadComplaints();
            await openComplaint(created.id);
            setNotice("Khiếu nại đã được gửi.");
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedComplaint) {
            return;
        }

        const token = getAccessToken("MEMBER");

        if (!token) {
            setError("Vui lòng đăng nhập lại tài khoản Member.");
            return;
        }

        if (isComplaintClosed(selectedComplaint.status)) {
            setError("Khiếu nại này đã kết thúc, không thể gửi thêm tin nhắn.");
            return;
        }

        if (!message.trim() && !attachment) {
            setError("Vui lòng nhập tin nhắn hoặc chọn tệp đính kèm.");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setNotice("");

        try {
            if (attachment) {
                await sendMemberComplaintMessageWithAttachment(
                    token,
                    selectedComplaint.id,
                    message.trim(),
                    attachment,
                );
            } else {
                await sendMemberComplaintMessage(
                    token,
                    selectedComplaint.id,
                    message.trim(),
                );
            }

            setMessage("");
            setAttachment(null);

            const fileInput = document.getElementById(
                "member-complaint-attachment",
            ) as HTMLInputElement | null;

            if (fileInput) {
                fileInput.value = "";
            }

            const updated = await getMemberComplaintById(
                token,
                selectedComplaint.id,
            );

            setSelectedComplaint(updated);
            await loadComplaints();
            setNotice("Tin nhắn đã được gửi.");
        } catch (sendError) {
            setError(getErrorMessage(sendError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadAttachment = async (
        attachmentId: string,
        originalName: string,
    ) => {
        const token = getAccessToken("MEMBER");

        if (!token) {
            setError("Vui lòng đăng nhập lại tài khoản Member.");
            return;
        }

        setError("");

        try {
            const blob = await downloadMemberComplaintAttachment(
                token,
                attachmentId,
            );

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = originalName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (downloadError) {
            setError(getErrorMessage(downloadError));
        }
    };

    const handleAttachmentChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        setAttachment(event.target.files?.[0] ?? null);
    };

    const goToList = () => {
        setView("list");
        setSelectedComplaint(null);
        setError("");
        setNotice("");
        void loadComplaints();
    };

    const goToCreate = () => {
        setCategory("ORDER");
        setSubject("");
        setInitialContent("");
        setError("");
        setNotice("");
        setView("create");
    };

    return (
        <div className="member-complaint-widget">
            {isOpen && (
                <section
                    className="member-complaint-panel"
                    aria-label="Trung tâm hỗ trợ khách hàng"
                >
                    <header className="member-complaint-header">
                        <div className="member-complaint-header-brand">
                            <span className="member-complaint-brand-mark">ID</span>

                            <div>
                                <h2>ICONDENIM SUPPORT</h2>
                                <p>Trung tâm hỗ trợ khách hàng</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="member-complaint-icon-button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Ẩn cửa sổ hỗ trợ"
                            title="Ẩn cửa sổ hỗ trợ"
                        >
                            ×
                        </button>
                    </header>

                    <div className="member-complaint-toolbar">
                        {view !== "list" && (
                            <button
                                type="button"
                                className="member-complaint-back"
                                onClick={goToList}
                            >
                                ← Danh sách khiếu nại
                            </button>
                        )}

                        {view === "list" && (
                            <button
                                type="button"
                                className="member-complaint-primary-button"
                                onClick={goToCreate}
                            >
                                + Tạo khiếu nại
                            </button>
                        )}

                        {view === "list" && (
                            <button
                                type="button"
                                className="member-complaint-refresh"
                                onClick={() => void loadComplaints()}
                                disabled={isLoading}
                                title="Làm mới danh sách"
                            >
                                ↻
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="member-complaint-alert member-complaint-alert-error">
                            {error}
                        </div>
                    )}

                    {notice && (
                        <div className="member-complaint-alert member-complaint-alert-success">
                            {notice}
                        </div>
                    )}

                    <div className="member-complaint-body">
                        {view === "list" && (
                            <div className="member-complaint-list-view">
                                <div className="member-complaint-section-heading">
                                    <h3>Yêu cầu hỗ trợ</h3>
                                    <p>Theo dõi các yêu cầu bạn đã gửi đến IconDenim.</p>
                                </div>

                                {isLoading && complaints.length === 0 ? (
                                    <div className="member-complaint-empty">
                                        Đang tải danh sách...
                                    </div>
                                ) : complaints.length === 0 ? (
                                    <div className="member-complaint-empty">
                                        <span className="member-complaint-empty-icon">✳</span>
                                        <strong>Bạn chưa có khiếu nại nào</strong>
                                        <p>
                                            Nếu cần hỗ trợ về đơn hàng hoặc tài khoản, hãy tạo yêu
                                            cầu mới.
                                        </p>
                                        <button
                                            type="button"
                                            className="member-complaint-primary-button"
                                            onClick={goToCreate}
                                        >
                                            Tạo yêu cầu đầu tiên
                                        </button>
                                    </div>
                                ) : (
                                    <div className="member-complaint-ticket-list">
                                        {complaints.map((complaint) => (
                                            <button
                                                type="button"
                                                className="member-complaint-ticket"
                                                key={complaint.id}
                                                onClick={() => void openComplaint(complaint.id)}
                                            >
                                                <div className="member-complaint-ticket-top">
                                                    <span className="member-complaint-ticket-code">
                                                        {complaint.ticketCode}
                                                    </span>

                                                    <span
                                                        className={`member-complaint-status status-${complaint.status.toLowerCase()}`}
                                                    >
                                                        {STATUS_LABELS[complaint.status]}
                                                    </span>
                                                </div>

                                                <strong>{complaint.subject}</strong>

                                                <span className="member-complaint-ticket-category">
                                                    {getCategoryLabel(complaint.category)}
                                                </span>

                                                <div className="member-complaint-ticket-bottom">
                                                    <span>{formatDate(complaint.updatedAt)}</span>
                                                    <span>
                                                        {complaint._count.messages} tin nhắn&nbsp; →
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {view === "create" && (
                            <form
                                className="member-complaint-create-form"
                                onSubmit={handleCreateComplaint}
                            >
                                <div className="member-complaint-section-heading">
                                    <h3>Gửi yêu cầu hỗ trợ</h3>
                                    <p>Mô tả rõ vấn đề để đội ngũ hỗ trợ xử lý nhanh hơn.</p>
                                </div>

                                <label htmlFor="member-complaint-category">
                                    Danh mục
                                </label>
                                <select
                                    id="member-complaint-category"
                                    value={category}
                                    onChange={(event) =>
                                        setCategory(event.target.value as ComplaintCategory)
                                    }
                                    disabled={isSubmitting}
                                    required
                                >
                                    {CATEGORY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <label htmlFor="member-complaint-subject">
                                    Tiêu đề
                                </label>
                                <input
                                    id="member-complaint-subject"
                                    value={subject}
                                    onChange={(event) => setSubject(event.target.value)}
                                    placeholder="Ví dụ: Tôi cần hỗ trợ về đơn hàng..."
                                    maxLength={200}
                                    disabled={isSubmitting}
                                    required
                                />

                                <label htmlFor="member-complaint-content">
                                    Nội dung chi tiết
                                </label>
                                <textarea
                                    id="member-complaint-content"
                                    value={initialContent}
                                    onChange={(event) => setInitialContent(event.target.value)}
                                    placeholder="Mô tả vấn đề bạn đang gặp phải..."
                                    rows={5}
                                    maxLength={5000}
                                    disabled={isSubmitting}
                                    required
                                />

                                <div className="member-complaint-form-footer">
                                    <span>{initialContent.length}/5000 ký tự</span>

                                    <button
                                        type="submit"
                                        className="member-complaint-primary-button"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Đang gửi..." : "Gửi khiếu nại"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {view === "detail" && selectedComplaint && (
                            <div className="member-complaint-detail-view">
                                <div className="member-complaint-detail-heading">
                                    <span className="member-complaint-ticket-code">
                                        {selectedComplaint.ticketCode}
                                    </span>

                                    <span
                                        className={`member-complaint-status status-${selectedComplaint.status.toLowerCase()}`}
                                    >
                                        {STATUS_LABELS[selectedComplaint.status]}
                                    </span>

                                    <h3>{selectedComplaint.subject}</h3>

                                    <p>
                                        {getCategoryLabel(selectedComplaint.category)} · Tạo lúc{" "}
                                        {formatDate(selectedComplaint.createdAt)}
                                    </p>
                                </div>

                                {selectedComplaint.resolutionReason && (
                                    <div className="member-complaint-resolution">
                                        <strong>Thông tin xử lý</strong>
                                        <p>{selectedComplaint.resolutionReason}</p>
                                    </div>
                                )}

                                <div className="member-complaint-messages">
                                    {selectedComplaint.messages.length === 0 ? (
                                        <div className="member-complaint-empty">
                                            Chưa có tin nhắn trao đổi.
                                        </div>
                                    ) : (
                                        selectedComplaint.messages.map((item) => {
                                            const isMemberMessage = item.senderType === "ACCOUNT";

                                            return (
                                                <article
                                                    className={`member-complaint-message ${isMemberMessage
                                                            ? "message-member"
                                                            : "message-support"
                                                        }`}
                                                    key={item.id}
                                                >
                                                    <div className="member-complaint-message-meta">
                                                        <strong>
                                                            {isMemberMessage
                                                                ? "Bạn"
                                                                : "Đội ngũ IconDenim"}
                                                        </strong>
                                                        <time>{formatDate(item.createdAt)}</time>
                                                    </div>

                                                    {item.content && <p>{item.content}</p>}

                                                    {item.attachments &&
                                                        item.attachments.length > 0 && (
                                                            <div className="member-complaint-attachments">
                                                                {item.attachments.map((file) => (
                                                                    <button
                                                                        type="button"
                                                                        key={file.id}
                                                                        className="member-complaint-attachment"
                                                                        onClick={() =>
                                                                            void handleDownloadAttachment(
                                                                                file.id,
                                                                                file.originalName,
                                                                            )
                                                                        }
                                                                    >
                                                                        <span aria-hidden="true">
                                                                            {file.mimeType.startsWith("image/")
                                                                                ? "▧"
                                                                                : "↧"}
                                                                        </span>
                                                                        <span className="member-complaint-attachment-info">
                                                                            <strong>{file.originalName}</strong>
                                                                            <small>
                                                                                {formatFileSize(file.sizeBytes)} · Tải
                                                                                xuống
                                                                            </small>
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                </article>
                                            );
                                        })
                                    )}
                                </div>

                                {isComplaintClosed(selectedComplaint.status) ? (
                                    <div className="member-complaint-closed-notice">
                                        Yêu cầu này đã kết thúc. Bạn không thể gửi thêm tin nhắn
                                        trong cuộc trao đổi này.
                                    </div>
                                ) : (
                                    <form
                                        className="member-complaint-message-form"
                                        onSubmit={handleSendMessage}
                                    >
                                        <textarea
                                            value={message}
                                            onChange={(event) => setMessage(event.target.value)}
                                            placeholder="Nhập nội dung trao đổi..."
                                            rows={3}
                                            maxLength={5000}
                                            disabled={isSubmitting}
                                            aria-label="Nội dung tin nhắn"
                                        />

                                        {attachment && (
                                            <div className="member-complaint-selected-file">
                                                <span>{attachment.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAttachment(null)}
                                                    disabled={isSubmitting}
                                                    aria-label="Bỏ tệp đính kèm"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}

                                        <div className="member-complaint-message-actions">
                                            <label
                                                className="member-complaint-attach-button"
                                                htmlFor="member-complaint-attachment"
                                                title="Đính kèm một tệp"
                                            >
                                                + Đính kèm
                                            </label>

                                            <input
                                                id="member-complaint-attachment"
                                                type="file"
                                                onChange={handleAttachmentChange}
                                                disabled={isSubmitting}
                                                className="member-complaint-file-input"
                                            />

                                            <button
                                                type="submit"
                                                className="member-complaint-primary-button"
                                                disabled={
                                                    isSubmitting ||
                                                    (!message.trim() && !attachment)
                                                }
                                            >
                                                {isSubmitting ? "Đang gửi..." : "Gửi tin nhắn"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>

                    <footer className="member-complaint-footer">
                        <span>ICONDENIM</span>
                        <span>Hỗ trợ khách hàng</span>
                    </footer>
                </section>
            )}

            <button
                type="button"
                className={`member-complaint-launcher ${isOpen ? "launcher-open" : ""
                    }`}
                onClick={() => {
                    setIsOpen((current) => !current);
                    setError("");
                    setNotice("");
                }}
                aria-label={isOpen ? "Ẩn hỗ trợ" : "Mở hỗ trợ khách hàng"}
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <span className="member-complaint-launcher-close">×</span>
                ) : (
                    <>
                        <svg
                            viewBox="0 0 24 24"
                            width="25"
                            height="25"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v7.5A2.75 2.75 0 0 1 17.25 16H10l-5.5 4v-4.5A2.7 2.7 0 0 1 4 13.75z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M8 8h8M8 11.5h5"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="member-complaint-launcher-label">Hỗ trợ</span>
                    </>
                )}
            </button>
        </div>
    );
}