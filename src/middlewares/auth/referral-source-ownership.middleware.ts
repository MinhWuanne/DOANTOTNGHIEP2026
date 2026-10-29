import { FastifyReply, FastifyRequest } from "fastify";

export async function referralSourceOwnershipMiddleware(
request: FastifyRequest,
reply: FastifyReply,
) {
if (!request.auth) {
return reply.code(401).send({
success: false,
error: "AUTHORIZATION_REQUIRED",
});
}

const body = request.body as {
sourceAccountId?: string | number | null;
};

const sourceAccountId = body?.sourceAccountId;

// MEMBER / FRANCHISE thông thường
// không được tạo referral với source = NULL.
// NULL → MEMBER sẽ dành cho Admin/System.
if (sourceAccountId === undefined || sourceAccountId === null) {
return reply.code(403).send({
success: false,
error: "REFERRAL_SOURCE_REQUIRED",
});
}

if (String(sourceAccountId) !== request.auth.accountId) {
return reply.code(403).send({
success: false,
error: "REFERRAL_SOURCE_ACCESS_FORBIDDEN",
});
}
}
