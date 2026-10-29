import { FastifyReply, FastifyRequest } from "fastify";
import { AccountPlatform } from "../../generated/prisma/enums.js";

export async function memberOnlyMiddleware(
request: FastifyRequest,
reply: FastifyReply,
) {
if (!request.auth) {
return reply.code(401).send({
success: false,
error: "AUTHORIZATION_REQUIRED",
});
}

if (request.auth.platform !== AccountPlatform.MEMBER) {
return reply.code(403).send({
success: false,
error: "MEMBER_PLATFORM_REQUIRED",
});
}
}

export async function franchiseOnlyMiddleware(
request: FastifyRequest,
reply: FastifyReply,
) {
if (!request.auth) {
return reply.code(401).send({
success: false,
error: "AUTHORIZATION_REQUIRED",
});
}

if (
request.auth.platform !== AccountPlatform.FRANCHISE
) {
return reply.code(403).send({
success: false,
error: "FRANCHISE_PLATFORM_REQUIRED",
});
}
}
