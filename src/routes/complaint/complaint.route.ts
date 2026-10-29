
import {
  FastifyInstance,
} from "fastify";

import {
  complaintController,
} from "../../controllers/complaint/complaint.controller.js";

import {
  authMiddleware,
} from "../../middlewares/auth/auth.middleware.js";

import {
  adminAuthMiddleware,
} from "../../middlewares/admin/admin-auth.middleware.js";

import {
  adminOnlyMiddleware,
} from "../../middlewares/admin/admin-only.middleware.js";

export async function complaintRoutes(
  app: FastifyInstance,
) {
  // POST /complaints
  app.post(
    "/complaints",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;

        const body = request.body as {
          category: string;
          subject: string;
          content: string;
        };

        const complaint =
          await complaintController.create(
            auth.accountId,
            auth.platform,
            {
              category: body?.category,
              subject: body?.subject,
              content: body?.content,
            },
          );

        return reply.code(201).send({
          success: true,
          data: complaint,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /complaints
  app.get(
    "/complaints",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;

        const complaints =
          await complaintController.listOwn(
            auth.accountId,
            auth.platform,
          );

        return reply.send({
          success: true,
          data: complaints,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /complaints/attachments/:attachmentId
  app.get(
    "/complaints/attachments/:attachmentId",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;
        const params = request.params as {
          attachmentId: string;
        };

        if (!/^[1-9]\d*$/.test(params.attachmentId)) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_ID",
          });
        }

        const attachment =
          await complaintController.downloadCustomerAttachment(
            params.attachmentId,
            auth.accountId,
            auth.platform,
          );

        const fallbackName = attachment.originalName
          .replace(/[^\x20-\x7E]/g, "_")
          .replace(/["\\]/g, "_");

        return reply
          .type(attachment.mimeType)
          .header("X-Content-Type-Options", "nosniff")
          .header(
            "Content-Disposition",
            `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
          )
          .send(attachment.buffer);
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /admin/complaints/attachments/:attachmentId
  app.get(
    "/admin/complaints/attachments/:attachmentId",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const auth = request.adminAuth!;
        const params = request.params as {
          attachmentId: string;
        };

        if (!/^[1-9]\d*$/.test(params.attachmentId)) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_ID",
          });
        }

        const attachment =
          await complaintController.downloadAdminAttachment(
            params.attachmentId,
            auth.adminId,
          );

        const fallbackName = attachment.originalName
          .replace(/[^\x20-\x7E]/g, "_")
          .replace(/["\\]/g, "_");

        return reply
          .type(attachment.mimeType)
          .header("X-Content-Type-Options", "nosniff")
          .header(
            "Content-Disposition",
            `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
          )
          .send(attachment.buffer);
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /complaints/:id
  app.get(
    "/complaints/:id",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;
        const params = request.params as {
          id: string;
        };

        if (!/^\d+$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        const complaint =
          await complaintController.getOwn(
            auth.accountId,
            auth.platform,
            params.id,
          );

        return reply.send({
          success: true,
          data: complaint,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // POST /complaints/:id/messages
  app.post(
    "/complaints/:id/messages",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;
        const params = request.params as {
          id: string;
        };
        const body = request.body as {
          content?: string;
        };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        if (
          typeof body?.content !== "string" ||
          !body.content.trim() ||
          body.content.trim().length > 10000
        ) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_CONTENT",
          });
        }

        const message =
          await complaintController.sendCustomerMessage(
            params.id,
            auth.accountId,
            auth.platform,
            {
              content: body.content,
            },
          );

        return reply.code(201).send({
          success: true,
          data: message,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // POST /complaints/:id/messages/attachment
  app.post(
    "/complaints/:id/messages/attachment",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const auth = request.auth!;
        const params = request.params as { id: string };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        const input = await readComplaintMultipart(request);

        const message =
          await complaintController.sendCustomerMessageWithAttachment(
            params.id,
            auth.accountId,
            auth.platform,
            input,
          );

        return reply.code(201).send({
          success: true,
          data: message,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /admin/complaints
  app.get(
    "/admin/complaints",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          status?: string;
          category?: string;
          search?: string;
          page?: string;
          pageSize?: string;
        };

        const parseOptionalInteger = (
          value: string | undefined,
        ): number | undefined => {
          if (value === undefined) {
            return undefined;
          }

          if (!/^\d+$/.test(value)) {
            throw new Error("COMPLAINT_INVALID_PAGINATION");
          }

          const parsed = Number(value);

          if (!Number.isSafeInteger(parsed)) {
            throw new Error("COMPLAINT_INVALID_PAGINATION");
          }

          return parsed;
        };

        const result = await complaintController.listAdmin({
          status: query.status,
          category: query.category,
          search: query.search,
          page: parseOptionalInteger(query.page),
          pageSize: parseOptionalInteger(query.pageSize),
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // GET /admin/complaints/:id
  app.get(
    "/admin/complaints/:id",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        if (!/^\d+$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        const complaint =
          await complaintController.getAdmin(params.id);

        return reply.send({
          success: true,
          data: complaint,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // POST /admin/complaints/:id/assignments
  app.post(
    "/admin/complaints/:id/assignments",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          adminId?: string | number;
        };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        if (
          !(
            typeof body?.adminId === "string" &&
            /^[1-9]\d*$/.test(body.adminId)
          ) &&
          !(
            typeof body?.adminId === "number" &&
            Number.isSafeInteger(body.adminId) &&
            body.adminId > 0
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_ID",
          });
        }

        const auth = request.adminAuth!;

        const assignment =
          await complaintController.assignAdmin(
            params.id,
            String(body.adminId),
            auth.adminId,
          );

        return reply.code(201).send({
          success: true,
          data: assignment,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // POST /admin/complaints/:id/messages
  app.post(
    "/admin/complaints/:id/messages",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          content?: string;
          messageType?: string;
        };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        if (
          typeof body?.content !== "string" ||
          (
            body.messageType !== undefined &&
            body.messageType !== "MESSAGE" &&
            body.messageType !== "INTERNAL_NOTE"
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_CONTENT",
          });
        }

        const auth = request.adminAuth!;

        const message =
          await complaintController.sendAdminMessage(
            params.id,
            auth.adminId,
            {
              content: body.content,
              messageType:
                body.messageType as
                | "MESSAGE"
                | "INTERNAL_NOTE"
                | undefined,
            },
          );

        return reply.code(201).send({
          success: true,
          data: message,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // DELETE /admin/complaints/:id/messages/:messageId
  app.delete(
    "/admin/complaints/:id/messages/:messageId",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
          messageId: string;
        };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        if (!/^[1-9]\d*$/.test(params.messageId)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_MESSAGE_ID",
          });
        }

        const auth = request.adminAuth!;

        const result =
          await complaintController.recallAdminMessage(
            params.id,
            params.messageId,
            auth.adminId,
          );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // POST /admin/complaints/:id/messages/attachment
  app.post(
    "/admin/complaints/:id/messages/attachment",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const auth = request.adminAuth!;
        const params = request.params as { id: string };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        const input = await readComplaintMultipart(request);

        const message =
          await complaintController.sendAdminMessageWithAttachment(
            params.id,
            auth.adminId,
            input,
          );

        return reply.code(201).send({
          success: true,
          data: message,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

  // PATCH /admin/complaints/:id/status
  app.patch(
    "/admin/complaints/:id/status",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = (request.body ?? {}) as {
          status?: string;
          resolutionReason?: string;
        };

        if (!/^[1-9]\d*$/.test(params.id)) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMPLAINT_ID",
          });
        }

        if (
          body?.status !== "IN_PROGRESS" &&
          body?.status !== "RESOLVED" &&
          body?.status !== "REJECTED"
        ) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_INVALID_STATUS",
          });
        }

        if (
          body.resolutionReason !== undefined &&
          typeof body.resolutionReason !== "string"
        ) {
          return reply.code(400).send({
            success: false,
            error: "COMPLAINT_RESOLUTION_REASON_REQUIRED",
          });
        }

        const auth = request.adminAuth!;

        const complaint =
          await complaintController.updateStatus(
            params.id,
            auth.adminId,
            {
              status: body.status,
              resolutionReason: body.resolutionReason,
            },
          );

        return reply.send({
          success: true,
          data: complaint,
        });
      } catch (error) {
        return handleComplaintError(reply, error);
      }
    },
  );

}


async function readComplaintMultipart(request: any): Promise<{
  content: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}> {
  let content = "";
  let file: {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  } | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (file) {
        throw new Error("COMPLAINT_ATTACHMENT_INVALID_TYPE");
      }

      file = {
        originalName: part.filename,
        mimeType: part.mimetype,
        buffer: await part.toBuffer(),
      };
    } else if (part.fieldname === "content") {
      if (typeof part.value !== "string") {
        throw new Error("COMPLAINT_INVALID_CONTENT");
      }

      content = part.value;
    }
  }

  if (!content.trim() || content.trim().length > 10000) {
    throw new Error("COMPLAINT_INVALID_CONTENT");
  }

  if (!file || file.buffer.length === 0) {
    throw new Error("COMPLAINT_ATTACHMENT_EMPTY_FILE");
  }

  return {
    content: content.trim(),
    ...file,
  };
}


function handleComplaintError(
  reply: any,
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    COMPLAINT_NOT_FOUND: 404,

    COMPLAINT_INVALID_SUBJECT: 400,
    COMPLAINT_INVALID_CONTENT: 400,
    COMPLAINT_INVALID_CATEGORY: 400,
    INVALID_COMPLAINT_ID: 400,

    COMPLAINT_PLATFORM_NOT_ALLOWED: 403,
    COMPLAINT_ACCOUNT_NOT_ALLOWED: 403,
    COMPLAINT_INVALID_STATUS: 400,
    COMPLAINT_INVALID_PAGINATION: 400,

    COMPLAINT_INVALID_ID: 400,
    COMPLAINT_ALREADY_CLOSED: 409,
    COMPLAINT_ADMIN_ALREADY_ASSIGNED: 409,
    COMPLAINT_MAX_ASSIGNEES_REACHED: 409,
    COMPLAINT_ASSIGNEE_NOT_ACTIVE: 400,
    COMPLAINT_ACTOR_NOT_ACTIVE: 403,

    COMPLAINT_INVALID_MESSAGE_TYPE: 400,
    COMPLAINT_ADMIN_NOT_ASSIGNED: 403,

    COMPLAINT_MESSAGE_NOT_FOUND: 404,
    COMPLAINT_MESSAGE_NOT_RECALLABLE: 400,
    COMPLAINT_MESSAGE_NOT_OWNED: 403,
    COMPLAINT_MESSAGE_RECALL_WINDOW_EXPIRED: 400,

    COMPLAINT_RESOLUTION_REASON_REQUIRED: 400,
    COMPLAINT_ATTACHMENT_NOT_FOUND: 404,
    COMPLAINT_ATTACHMENT_INVALID_NAME: 400,
    COMPLAINT_ATTACHMENT_EMPTY_FILE: 400,
    COMPLAINT_ATTACHMENT_TOO_LARGE: 400,
    COMPLAINT_ATTACHMENT_INVALID_TYPE: 400,
    COMPLAINT_ATTACHMENT_INVALID_STORAGE_KEY: 400,

    FST_REQ_FILE_TOO_LARGE: 400,
    FST_FILES_LIMIT: 400,
    FST_PARTS_LIMIT: 400,
    FST_FIELDS_LIMIT: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error:
      statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : error.message,
  });
}


