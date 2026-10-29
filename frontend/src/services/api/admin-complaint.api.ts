import { API_BASE_URL } from "./api-config";

export type ComplaintCategory =
  | "ORDER"
  | "PAYMENT"
  | "RETURN"
  | "WALLET"
  | "COMMISSION"
  | "WITHDRAWAL"
  | "ACCOUNT"
  | "FEEDBACK"
  | "REF"
  | "OTHER";

export type ComplaintStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export type ComplaintMessageType =
  | "MESSAGE"
  | "INTERNAL_NOTE";

export type ComplaintActorType =
  | "ACCOUNT"
  | "ADMIN";

export interface AdminComplaintListItem {
  id: string;
  ticketCode: string;
  accountId: string;
  category: ComplaintCategory;
  subject: string;
  status: ComplaintStatus;
  responsePending: boolean;
  responseDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  _count: {
    messages: number;
  };
}

export interface AdminComplaintListResult {
  items: AdminComplaintListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminComplaintAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AdminComplaintMessage {
  id: string;
  senderType: ComplaintActorType;
  senderAccountId: string | null;
  senderAdminId: string | null;
  messageType: ComplaintMessageType;
  content: string;
  createdAt: string;
  attachments: AdminComplaintAttachment[];
}

export interface ActiveAdminOption {
  id: number;
  username: string;
  email: string;
}

export interface AdminComplaintAssignment {
  adminId: string;
  assignedAt: string;
}

export interface AdminComplaintHistory {
  actorType: ComplaintActorType;
  actorAccountId: string | null;
  actorAdminId: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface AdminComplaintDetail {
  id: string;
  ticketCode: string;
  accountId: string;
  account: {
    platform: "MEMBER" | "FRANCHISE";
  };
  category: ComplaintCategory;
  subject: string;
  status: ComplaintStatus;
  resolutionReason: string | null;
  firstResponseAt: string | null;
  lastMemberMessageAt: string | null;
  lastAdminReplyAt: string | null;
  responseDueAt: string | null;
  responsePending: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: AdminComplaintMessage[];
  assignments: AdminComplaintAssignment[];
  histories: AdminComplaintHistory[];
}

export interface AdminComplaintListParams {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SendAdminComplaintMessageInput {
  content: string;
  messageType?: ComplaintMessageType;
}

export interface UpdateAdminComplaintStatusInput {
  status: "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  resolutionReason?: string;
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Ignore invalid JSON response.
  }

  return fallback;
}

async function parseResponse<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, fallback),
    );
  }

  const data = await response.json();

  return data.data as T;
}

export async function getAdminComplaints(
  accessToken: string,
  params: AdminComplaintListParams = {},
): Promise<AdminComplaintListResult> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.category) {
    query.set("category", params.category);
  }

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.pageSize !== undefined) {
    query.set("pageSize", String(params.pageSize));
  }

  const queryString = query.toString();

  const response = await fetch(
    `${API_BASE_URL}/admin/complaints${queryString ? `?${queryString}` : ""
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseResponse<AdminComplaintListResult>(
    response,
    "COMPLAINT_LIST_FAILED",
  );
}

export async function getAdminComplaintById(
  accessToken: string,
  id: string,
): Promise<AdminComplaintDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseResponse<AdminComplaintDetail>(
    response,
    "COMPLAINT_DETAIL_FAILED",
  );
}

export async function assignAdminToComplaint(
  accessToken: string,
  complaintId: string,
  adminId: string,
): Promise<AdminComplaintDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/assignments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ adminId }),
    },
  );

  return parseResponse<AdminComplaintDetail>(
    response,
    "COMPLAINT_ASSIGN_FAILED",
  );
}

export async function getActiveAdmins(
  accessToken: string,
): Promise<ActiveAdminOption[]> {
  const response = await fetch(
    `${API_BASE_URL}/admins/active`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseResponse<ActiveAdminOption[]>(
    response,
    "ACTIVE_ADMINS_FETCH_FAILED",
  );
}

export async function sendAdminComplaintMessage(
  accessToken: string,
  complaintId: string,
  input: SendAdminComplaintMessageInput,
): Promise<AdminComplaintMessage> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<AdminComplaintMessage>(
    response,
    "COMPLAINT_MESSAGE_SEND_FAILED",
  );
}

export async function recallAdminComplaintMessage(
  accessToken: string,
  complaintId: string,
  messageId: string,
): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseResponse<unknown>(
    response,
    "COMPLAINT_MESSAGE_RECALL_FAILED",
  );
}

export async function sendAdminComplaintMessageWithAttachment(
  accessToken: string,
  complaintId: string,
  content: string,
  file: File,
): Promise<AdminComplaintMessage> {
  const formData = new FormData();

  formData.append("content", content);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/messages/attachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  return parseResponse<AdminComplaintMessage>(
    response,
    "COMPLAINT_ATTACHMENT_SEND_FAILED",
  );
}

export async function updateAdminComplaintStatus(
  accessToken: string,
  complaintId: string,
  input: UpdateAdminComplaintStatusInput,
): Promise<AdminComplaintDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<AdminComplaintDetail>(
    response,
    "COMPLAINT_STATUS_UPDATE_FAILED",
  );
}

export async function downloadAdminComplaintAttachment(
  accessToken: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/admin/complaints/attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "COMPLAINT_ATTACHMENT_DOWNLOAD_FAILED",
      ),
    );
  }

  return response.blob();
}
