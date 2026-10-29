import { FastifyInstance } from "fastify";
import { adminAuthController } from "../../../controllers/admin/auth/admin-auth.controller.js";

export async function adminAuthRoutes(app: FastifyInstance) {
  // POST /admin/auth/login
  app.post("/admin/auth/login", async (request, reply) => {
    try {
      const body = request.body as {
        username?: string | null;
        email?: string | null;
        password: string;
      };

      const result = await adminAuthController.login(body);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }
  });
}

function handleAdminAuthError(reply: any, error: unknown) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    USERNAME_OR_EMAIL_REQUIRED: 400,
    INVALID_ADMIN_CREDENTIALS: 401,
    ADMIN_ACCOUNT_NOT_ACTIVE: 403,
  };

  const statusCode = statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}