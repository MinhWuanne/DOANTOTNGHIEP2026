import { FastifyInstance } from "fastify";

import { demoClockController } from "../../controllers/demo-clock/demo-clock.controller.js";
import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";

export async function demoClockRoutes(app: FastifyInstance) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  app.get(
    "/admin/demo-clock",
    adminAuth,
    async (_request, reply) => {
      try {
        const result = await demoClockController.getNow();

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleDemoClockError(reply, error);
      }
    },
  );

  app.post(
    "/admin/demo-clock/advance",
    adminAuth,
    async (request, reply) => {
      try {
        const body = request.body as {
          hours: number;
        };

        const result =
          await demoClockController.advanceHours(
            body.hours,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleDemoClockError(reply, error);
      }
    },
  );

  app.post(
    "/admin/demo-clock/set",
    adminAuth,
    async (request, reply) => {
      try {
        const body = request.body as {
          dateTime: string;
        };

        const result =
          await demoClockController.setTime(
            body.dateTime,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleDemoClockError(reply, error);
      }
    },
  );

  app.post(
    "/admin/demo-clock/reset",
    adminAuth,
    async (_request, reply) => {
      try {
        const result =
          await demoClockController.reset();
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleDemoClockError(reply, error);
      }
    },
  );
}

function handleDemoClockError(
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
    INVALID_HOURS: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}