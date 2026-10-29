
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

export type ComplaintActorType = "ACCOUNT" | "ADMIN";

export interface MemberComplaintAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MemberComplaintMessage {
  id: string;
  senderType: ComplaintActorType;
  senderAccountId: string | null;
  senderAdminId: string | null;
  messageType: "MESSAGE";
  content: string;
  createdAt: string;
  attachments?: MemberComplaintAttachment[];
}

export interface MemberComplaintListItem {
  id: string;
  ticketCode: string;
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

export interface MemberComplaintDetail extends MemberComplaintListItem {
  resolutionReason: string | null;
  firstResponseAt: string | null;
  messages: MemberComplaintMessage[];
  histories: {
    action: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
  }[];
}

export interface CreateMemberComplaintInput {
  category: ComplaintCategory;
  subject: string;
  content: string;
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
    throw new Error(await getErrorMessage(response, fallback));
  }

  const data = await response.json();
  return data.data as T;
}

/** Láº¥y danh sÃ¡ch khiáº¿u náº¡i cá»§a tÃ i khoáº£n Ä‘ang Ä‘Äƒng nháº­p. */
export async function getMemberComplaints(
  accessToken: string,
): Promise<MemberComplaintListItem[]> {
  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse<MemberComplaintListItem[]>(
    response,
    "COMPLAINT_LIST_FAILED",
  );
}

/** Láº¥y chi tiáº¿t má»™t khiáº¿u náº¡i thuá»™c tÃ i khoáº£n hiá»‡n táº¡i. */
export async function getMemberComplaintById(
  accessToken: string,
  complaintId: string,
): Promise<MemberComplaintDetail> {
  const response = await fetch(
    `${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseResponse<MemberComplaintDetail>(
    response,
    "COMPLAINT_DETAIL_FAILED",
  );
}

/** Táº¡o khiáº¿u náº¡i má»›i. */
export async function createMemberComplaint(
  accessToken: string,
  input: CreateMemberComplaintInput,
): Promise<MemberComplaintListItem> {
  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<MemberComplaintListItem>(
    response,
    "COMPLAINT_CREATE_FAILED",
  );
}

/** Gá»­i tin nháº¯n vÄƒn báº£n vÃ o khiáº¿u náº¡i Ä‘ang má»Ÿ. */
export async function sendMemberComplaintMessage(
  accessToken: string,
  complaintId: string,
  content: string,
): Promise<MemberComplaintMessage> {
  const response = await fetch(
    `${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
    },
  );

  return parseResponse<MemberComplaintMessage>(
    response,
    "COMPLAINT_MESSAGE_SEND_FAILED",
  );
}

/** Gá»­i tin nháº¯n kÃ¨m má»™t tá»‡p theo quy táº¯c multipart cá»§a backend. */
export async function sendMemberComplaintMessageWithAttachment(
  accessToken: string,
  complaintId: string,
  content: string,
  file: File,
): Promise<MemberComplaintMessage> {
  const formData = new FormData();

  formData.append("content", content);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/messages/attachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  return parseResponse<MemberComplaintMessage>(
    response,
    "COMPLAINT_ATTACHMENT_SEND_FAILED",
  );
}

/** Táº£i tá»‡p Ä‘Ã­nh kÃ¨m thuá»™c khiáº¿u náº¡i cá»§a tÃ i khoáº£n hiá»‡n táº¡i. */
export async function downloadMemberComplaintAttachment(
  accessToken: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/complaints/attachments/${encodeURIComponent(attachmentId)}`,
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

