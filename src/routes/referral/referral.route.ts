import { FastifyInstance } from "fastify";
import { referralController } from "../../controllers/referral/referral.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";
import { referralSourceOwnershipMiddleware } from "../../middlewares/auth/referral-source-ownership.middleware.js";
import { referralAccessOwnershipMiddleware } from "../../middlewares/auth/referral-access-ownership.middleware.js";

export async function referralRoutes(app: FastifyInstance) {
// POST /referrals
app.post(
"/referrals",
{
preHandler: [
authMiddleware,
referralSourceOwnershipMiddleware,
],
},
async (request, reply) => {
try {
const body = request.body as {
sourceAccountId?: string | number | null;
targetAccountId: string | number;
};


    const referral =
      await referralController.createReferral(body);

    return reply.code(201).send({
      success: true,
      data: referral,
    });
  } catch (error) {
    return handleReferralError(reply, error);
  }
},


);

// GET /referrals/:id
app.get(
"/referrals/:id",
{
preHandler: [
authMiddleware,
referralAccessOwnershipMiddleware,
],
},
async (request, reply) => {
try {
const params = request.params as {
id: string;
};


    const referral =
      await referralController.getReferralById(params.id);

    if (!referral) {
      return reply.code(404).send({
        success: false,
        error: "REFERRAL_NOT_FOUND",
      });
    }

    return reply.send({
      success: true,
      data: referral,
    });
  } catch (error) {
    return handleReferralError(reply, error);
  }
},


);

// GET /accounts/:accountId/referral
app.get(
"/accounts/:accountId/referral",
{
preHandler: [
authMiddleware,
accountOwnershipMiddleware,
],
},
async (request, reply) => {
try {
const params = request.params as {
accountId: string;
};


    const referral =
      await referralController.getReferralByTargetAccountId(
        params.accountId,
      );

    if (!referral) {
      return reply.code(404).send({
        success: false,
        error: "REFERRAL_NOT_FOUND",
      });
    }

    return reply.send({
      success: true,
      data: referral,
    });
  } catch (error) {
    return handleReferralError(reply, error);
  }
},


);
}

function handleReferralError(
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
TARGET_ACCOUNT_NOT_FOUND: 404,
SOURCE_ACCOUNT_NOT_FOUND: 404,
TARGET_ALREADY_HAS_REFERRER: 409,
SELF_REFERRAL_NOT_ALLOWED: 400,
REFERRAL_TARGET_MUST_BE_MEMBER: 400,
};

const statusCode =
statusMap[error.message] ?? 500;

return reply.code(statusCode).send({
success: false,
error: error.message,
});
}
