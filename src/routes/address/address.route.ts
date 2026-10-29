
import { FastifyInstance } from "fastify";
import { AddressType } from "../../generated/prisma/enums.js";
import { addressController } from "../../controllers/address/address.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { memberOnlyMiddleware } from "../../middlewares/auth/platform.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";
import type { UpdateAddressInput } from "../../services/address/address.service.js";

export async function addressRoutes(
  app: FastifyInstance,
) {
  // GET /accounts/:accountId/addresses
  app.get(
    "/accounts/:accountId/addresses",
    {
      preHandler: [
        authMiddleware,
        memberOnlyMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const account = await getAccountPersonId(
          params.accountId,
        );

        const addresses =
          await addressController.getAddressesByPersonId(
            account.personId.toString(),
          );

        return reply.send({
          success: true,
          data: addresses,
        });
      } catch (error) {
        return handleAddressError(reply, error);
      }
    },
  );

  // GET /accounts/:accountId/addresses/:id
  app.get(
    "/accounts/:accountId/addresses/:id",
    {
      preHandler: [
        authMiddleware,
        memberOnlyMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
          id: string;
        };

        const account = await getAccountPersonId(
          params.accountId,
        );

        const address =
          await addressController.getAddressById(
            account.personId.toString(),
            params.id,
          );

        return reply.send({
          success: true,
          data: address,
        });
      } catch (error) {
        return handleAddressError(reply, error);
      }
    },
  );

  // POST /accounts/:accountId/addresses
  app.post(
    "/accounts/:accountId/addresses",
    {
      preHandler: [
        authMiddleware,
        memberOnlyMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const body = request.body as {
          type?: AddressType;
          receiverName: string;
          phone: string;
          addressLine: string;
          ward?: string;
          district?: string;
          province: string;
          isDefault?: boolean;
        };

        const account = await getAccountPersonId(
          params.accountId,
        );

        const address =
          await addressController.createAddress({
            personId: account.personId,
            type: body.type,
            receiverName: body.receiverName,
            phone: body.phone,
            addressLine: body.addressLine,
            ward: body.ward,
            district: body.district,
            province: body.province,
            isDefault: body.isDefault,
          });

        return reply.code(201).send({
          success: true,
          data: address,
        });
      } catch (error) {
        return handleAddressError(reply, error);
      }
    },
  );

  // PATCH /accounts/:accountId/addresses/:id
  app.patch(
    "/accounts/:accountId/addresses/:id",
    {
      preHandler: [
        authMiddleware,
        memberOnlyMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
          id: string;
        };

        const body = request.body as UpdateAddressInput;

        const account = await getAccountPersonId(
          params.accountId,
        );

        const address =
          await addressController.updateAddress(
            account.personId.toString(),
            params.id,
            body,
          );

        return reply.send({
          success: true,
          data: address,
        });
      } catch (error) {
        return handleAddressError(reply, error);
      }
    },
  );

  // DELETE /accounts/:accountId/addresses/:id
  app.delete(
    "/accounts/:accountId/addresses/:id",
    {
      preHandler: [
        authMiddleware,
        memberOnlyMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
          id: string;
        };

        const account = await getAccountPersonId(
          params.accountId,
        );

        const result =
          await addressController.deleteAddress(
            account.personId.toString(),
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAddressError(reply, error);
      }
    },
  );
}

async function getAccountPersonId(
  accountId: string,
) {
  const { prisma } = await import(
    "../../lib/prisma.js"
  );

  const account =
    await prisma.userAccount.findUnique({
      where: {
        id: BigInt(accountId),
      },
      select: {
        id: true,
        personId: true,
      },
    });

  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  return account;
}

function handleAddressError(
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

    INVALID_RECEIVER_NAME: 400,
    INVALID_PHONE: 400,
    INVALID_ADDRESS_LINE: 400,
    INVALID_PROVINCE: 400,
    NO_FIELDS_TO_UPDATE: 400,

    ACCOUNT_NOT_FOUND: 404,
    PERSON_NOT_FOUND: 404,
    ADDRESS_NOT_FOUND: 404,

    MEMBER_PLATFORM_REQUIRED: 403,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

