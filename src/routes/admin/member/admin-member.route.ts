import { FastifyInstance } from "fastify";
import { adminMemberController } from "../../../controllers/admin/member/admin-member.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminMemberRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET ALL MEMBERS
  app.get(
    "/admin/members",
    adminAuth,
    async (_request, reply) => {
      try {
        const members =
          await adminMemberController.getMembers();

        return reply.send({
          success: true,
          data: members,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );

  // GET MEMBER DETAIL
  app.get(
    "/admin/members/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const member =
          await adminMemberController.getMemberById(
            params.id,
          );

        return reply.send({
          success: true,
          data: member,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );

  // GET MEMBER REFERRAL TREE
  app.get(
    "/admin/members/:id/referral-tree",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const referralTree =
          await adminMemberController.getMemberReferralTree(
            params.id,
          );

        return reply.send({
          success: true,
          data: referralTree,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );

  // UPDATE MEMBER
  app.patch(
    "/admin/members/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body =
          request.body as {
            fullName?: string;
            email?: string;
            phone?: string;
          };

        const member =
          await adminMemberController.updateMember(
            params.id,
            body,
          );

        return reply.send({
          success: true,
          data: member,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );

  // LOCK MEMBER
  app.patch(
    "/admin/members/:id/lock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const member =
          await adminMemberController.lockMember(
            params.id,
          );

        return reply.send({
          success: true,
          data: member,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );

  // UNLOCK MEMBER
  app.patch(
    "/admin/members/:id/unlock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const member =
          await adminMemberController.unlockMember(
            params.id,
          );

        return reply.send({
          success: true,
          data: member,
        });
      } catch (error) {
        return handleAdminMemberError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminMemberError(
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

    MEMBER_NOT_FOUND: 404,

    MEMBER_ALREADY_LOCKED: 400,
    MEMBER_ALREADY_ACTIVE: 400,
    INVALID_MEMBER_STATUS: 400,

    INVALID_UPDATE_FIELDS: 400,
    NO_FIELDS_TO_UPDATE: 400,
    FULL_NAME_REQUIRED: 400,
    EMAIL_REQUIRED: 400,
    PHONE_REQUIRED: 400,

    EMAIL_ALREADY_EXISTS: 400,
    PHONE_ALREADY_EXISTS: 400,
    DUPLICATE_MEMBER_DATA: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}