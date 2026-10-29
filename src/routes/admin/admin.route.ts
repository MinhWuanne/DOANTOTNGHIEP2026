
import { FastifyInstance } from "fastify";
import { AdminRole } from "../../generated/prisma/enums.js";
import { adminController } from "../../controllers/admin/admin.controller.js";
import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";
import { superAdminMiddleware } from "../../middlewares/admin/super-admin.middleware.js";
import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";

export async function adminRoutes(app: FastifyInstance) {
  const superAdminAuth = {
    preHandler: [
      adminAuthMiddleware,
      superAdminMiddleware,
    ],
  };

  // POST /admins
  app.post(
    "/admins",
    superAdminAuth,
    async (request, reply) => {
      try {
        const body = request.body as {
          username: string;
          email: string;
          password: string;
          role?: AdminRole;
        };

        const result =
          await adminController.createAdmin(
            body,
            request.adminAuth.adminId,
          );

        return reply.code(201).send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // GET /admins
  app.get(
    "/admins",
    superAdminAuth,
    async (_request, reply) => {
      try {
        const result =
          await adminController.getAdmins();

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // GET /admins/active
  // Danh sách ADMIN đang hoạt động cho chức năng phân công khiếu nại
  app.get(
    "/admins/active",
    {
      preHandler: [adminAuthMiddleware],
    },
    async (_request, reply) => {
      try {
        const result =
          await adminController.getActiveAdmins();

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // GET /admins/:id
  app.get(
    "/admins/:id",
    superAdminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const result =
          await adminController.getAdminById(
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // PATCH /admins/:id
  app.patch(
    "/admins/:id",
    superAdminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          username?: string;
          email?: string;
          password?: string;
          role?: AdminRole;
        };

        const result =
          await adminController.updateAdmin(
            params.id,
            body,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // PATCH /admins/:id/disable
  app.patch(
    "/admins/:id/disable",
    superAdminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const result =
          await adminController.disableAdmin(
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  // PATCH /admins/:id/enable
  app.patch(
    "/admins/:id/enable",
    superAdminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const result =
          await adminController.enableAdmin(
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );
}

function handleAdminError(
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
    USERNAME_REQUIRED: 400,
    EMAIL_REQUIRED: 400,
    PASSWORD_REQUIRED: 400,

    CREATOR_NOT_FOUND: 404,
    CREATOR_NOT_ACTIVE: 403,
    INVALID_ID: 400,
    INVALID_INPUT: 400,
    NO_FIELDS_TO_UPDATE: 400,
    PASSWORD_TOO_SHORT: 400,

    SUPER_ADMIN_CREATOR_REQUIRED: 403,
    SUPER_ADMIN_CREATION_NOT_ALLOWED: 403,
    SUPER_ADMIN_ROLE_CHANGE_NOT_ALLOWED: 403,
    SUPER_ADMIN_CANNOT_BE_DISABLED: 403,

    USERNAME_ALREADY_EXISTS: 409,
    EMAIL_ALREADY_EXISTS: 409,

    ADMIN_NOT_FOUND: 404,
    ADMIN_ALREADY_DISABLED: 400,
    ADMIN_ALREADY_ACTIVE: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

