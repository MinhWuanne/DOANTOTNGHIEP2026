import { FastifyReply, FastifyRequest } from "fastify";

export function personOwnershipMiddleware(
  paramName: "id" | "personId",
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (!request.auth) {
      return reply.code(401).send({
        success: false,
        error: "AUTHORIZATION_REQUIRED",
      });
    }

    const params = request.params as {
      id?: string;
      personId?: string;
    };

    const personId = params[paramName];

    if (!personId) {
      return reply.code(400).send({
        success: false,
        error: "PERSON_ID_REQUIRED",
      });
    }

    if (personId !== request.auth.personId) {
      return reply.code(403).send({
        success: false,
        error: "PERSON_ACCESS_FORBIDDEN",
      });
    }
  };
}