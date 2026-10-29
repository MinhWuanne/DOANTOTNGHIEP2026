import { FastifyInstance } from "fastify";
import { adminFranchiseController } from "../../../controllers/admin/franchise/admin-franchise.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminFranchiseRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  app.get(
    "/admin/franchises",
    adminAuth,
    async (_request, reply) => {
      try {
        const franchises =
          await adminFranchiseController.getFranchises();

        return reply.send({
          success: true,
          data: franchises,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );

  app.get(
    "/admin/franchises/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const franchise =
          await adminFranchiseController.getFranchiseById(
            params.id,
          );

        return reply.send({
          success: true,
          data: franchise,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );

  app.patch(
    "/admin/franchises/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          fullName?: string;
          email?: string;
          phone?: string;
        };

        const franchise =
          await adminFranchiseController.updateFranchise(
            params.id,
            body,
          );

        return reply.send({
          success: true,
          data: franchise,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );

  /**
   * Quản lý FranchiseProfile.status.
   *
   * Không phải UserAccount.status.
   *
   * Hỗ trợ:
   * ACTIVE -> SUSPENDED
   * SUSPENDED -> ACTIVE
   * ACTIVE -> LOCKED
   */
  app.patch(
    "/admin/franchises/:id/status",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          status?: string;
        };

        if (
          body.status !== "ACTIVE" &&
          body.status !== "SUSPENDED" &&
          body.status !== "LOCKED"
        ) {
          throw new Error(
            "INVALID_FRANCHISE_STATUS",
          );
        }

        const franchise =
          await adminFranchiseController.updateFranchiseStatus(
            params.id,
            body.status,
          );

        return reply.send({
          success: true,
          data: franchise,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );

  /**
   * Khóa UserAccount của Franchise.
   *
   * ACTIVE -> LOCKED
   */
  app.patch(
    "/admin/franchises/:id/lock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const franchise =
          await adminFranchiseController.lockFranchise(
            params.id,
          );

        return reply.send({
          success: true,
          data: franchise,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );

  /**
   * Mở khóa UserAccount của Franchise.
   *
   * LOCKED -> ACTIVE
   */
  app.patch(
    "/admin/franchises/:id/unlock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const franchise =
          await adminFranchiseController.unlockFranchise(
            params.id,
          );

        return reply.send({
          success: true,
          data: franchise,
        });
      } catch (error) {
        return handleAdminFranchiseError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminFranchiseError(
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
    INVALID_ID: 400,

    FRANCHISE_NOT_FOUND: 404,
    FRANCHISE_PROFILE_NOT_FOUND: 404,

    FRANCHISE_ALREADY_LOCKED: 400,
    FRANCHISE_ALREADY_ACTIVE: 400,

    FRANCHISE_STATUS_ALREADY_SET: 400,
    FRANCHISE_STATUS_LOCKED: 400,
    FRANCHISE_STATUS_TERMINATED: 400,
    INVALID_FRANCHISE_STATUS: 400,
    INVALID_FRANCHISE_STATUS_TRANSITION: 400,

    INVALID_UPDATE_FIELDS: 400,
    NO_FIELDS_TO_UPDATE: 400,

    FULL_NAME_REQUIRED: 400,
    EMAIL_REQUIRED: 400,
    PHONE_REQUIRED: 400,

    EMAIL_ALREADY_EXISTS: 400,
    PHONE_ALREADY_EXISTS: 400,
    DUPLICATE_FRANCHISE_DATA: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}