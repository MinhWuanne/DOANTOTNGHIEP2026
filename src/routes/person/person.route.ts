import { FastifyInstance } from "fastify";

import { AccountPlatform } from "../../generated/prisma/enums.js";
import { personController } from "../../controllers/person/person.controller.js";

import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { personOwnershipMiddleware } from "../../middlewares/auth/person-ownership.middleware.js";

import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";

export async function personRoutes(app: FastifyInstance) {
  // ============================================================
  // USER ROUTES
  // ============================================================

  // GET /persons/:id
  // User can only access their own Person.
  app.get(
    "/persons/:id",
    {
      preHandler: [
        authMiddleware,
        personOwnershipMiddleware("id"),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const person =
          await personController.getPersonById(params.id);

        if (!person) {
          return reply.code(404).send({
            success: false,
            error: "PERSON_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: person,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );

  // PATCH /persons/:id
  // User can only update their own Person.
  app.patch(
    "/persons/:id",
    {
      preHandler: [
        authMiddleware,
        personOwnershipMiddleware("id"),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          fullName?: string;
        };

        const person =
          await personController.updatePerson(
            params.id,
            body,
          );

        return reply.send({
          success: true,
          data: person,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );

  // GET /persons/:personId/accounts
  // User can only access accounts belonging to their own Person.
  app.get(
    "/persons/:personId/accounts",
    {
      preHandler: [
        authMiddleware,
        personOwnershipMiddleware("personId"),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          personId: string;
        };

        const accounts =
          await personController.getAccountsByPersonId(
            params.personId,
          );

        return reply.send({
          success: true,
          data: accounts,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );

  // GET /persons/:personId/platform-identity
  // User can only inspect their own platform identity.
  app.get(
    "/persons/:personId/platform-identity",
    {
      preHandler: [
        authMiddleware,
        personOwnershipMiddleware("personId"),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          personId: string;
        };

        const identity =
          await personController.getPlatformIdentity(
            params.personId,
          );

        return reply.send({
          success: true,
          data: identity,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );

  // ============================================================
  // ADMIN ROUTES
  // ============================================================

  // POST /persons
  // Person creation is an administrative/internal operation.
  app.post(
    "/persons",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          fullName: string;
        };

        const person =
          await personController.createPerson(body);

        return reply.code(201).send({
          success: true,
          data: person,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );

  // DELETE /persons/:id
  // Only ADMIN / SUPER_ADMIN can delete a Person.
  app.delete(
    "/persons/:id",
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

        const person =
          await personController.deletePerson(
            params.id,
          );

        return reply.send({
          success: true,
          data: person,
        });
      } catch (error) {
        return handlePersonError(reply, error);
      }
    },
  );
}

function handlePersonError(
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
    PERSON_NOT_FOUND: 404,
    FULL_NAME_REQUIRED: 400,
    PERSON_HAS_ACCOUNTS: 409,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}