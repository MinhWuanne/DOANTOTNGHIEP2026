import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function referralAccessOwnershipMiddleware(
request: FastifyRequest,
reply: FastifyReply,
) {
if (!request.auth) {
return reply.code(401).send({
success: false,
error: "AUTHORIZATION_REQUIRED",
});
}

const params = request.params as {
id?: string;
};

const referralId = params?.id;

if (!referralId) {
return reply.code(400).send({
success: false,
error: "REFERRAL_ID_REQUIRED",
});
}

const referral = await prisma.referralRelationship.findUnique({
where: {
id: BigInt(referralId),
},
select: {
sourceAccountId: true,
targetAccountId: true,
},
});

if (!referral) {
return reply.code(404).send({
success: false,
error: "REFERRAL_NOT_FOUND",
});
}

const accountId = BigInt(request.auth.accountId);

const isSource =
referral.sourceAccountId !== null &&
referral.sourceAccountId === accountId;

const isTarget =
referral.targetAccountId === accountId;

if (!isSource && !isTarget) {
return reply.code(403).send({
success: false,
error: "REFERRAL_ACCESS_FORBIDDEN",
});
}
}
