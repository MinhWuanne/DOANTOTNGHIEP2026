
import { prisma } from "../../lib/prisma.js";
import { AddressType } from "../../generated/prisma/enums.js";

export interface CreateAddressInput {
  personId: bigint | number;
  type?: AddressType;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  province: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  type?: AddressType;
  receiverName?: string;
  phone?: string;
  addressLine?: string;
  ward?: string | null;
  district?: string | null;
  province?: string;
  isDefault?: boolean;
}

export class AddressService {
  private validateRequiredString(
    value: unknown,
    errorCode: string,
  ): string {
    if (typeof value !== "string") {
      throw new Error(errorCode);
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error(errorCode);
    }

    return trimmed;
  }

  private validateUpdateFields(
    input: UpdateAddressInput,
  ) {
    if (Object.keys(input).length === 0) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }
  }

  async getAddressesByPersonId(
    personId: bigint | number,
  ) {
    const id = BigInt(personId);

    const person = await prisma.person.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new Error("PERSON_NOT_FOUND");
    }

    return prisma.address.findMany({
      where: {
        personId: id,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          id: "asc",
        },
      ],
    });
  }

  async getAddressById(
    personId: bigint | number,
    addressId: bigint | number,
  ) {
    const personIdBigInt = BigInt(personId);
    const addressIdBigInt = BigInt(addressId);

    const address = await prisma.address.findFirst({
      where: {
        id: addressIdBigInt,
        personId: personIdBigInt,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    return address;
  }

  async createAddress(
    input: CreateAddressInput,
  ) {
    const receiverName =
      this.validateRequiredString(
        input.receiverName,
        "INVALID_RECEIVER_NAME",
      );

    const phone =
      this.validateRequiredString(
        input.phone,
        "INVALID_PHONE",
      );

    const addressLine =
      this.validateRequiredString(
        input.addressLine,
        "INVALID_ADDRESS_LINE",
      );

    const province =
      this.validateRequiredString(
        input.province,
        "INVALID_PROVINCE",
      );

    const personId = BigInt(input.personId);

    const person = await prisma.person.findUnique({
      where: {
        id: personId,
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new Error("PERSON_NOT_FOUND");
    }

    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.address.updateMany({
          where: {
            personId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const existingAddressCount =
        await tx.address.count({
          where: {
            personId,
          },
        });

      return tx.address.create({
        data: {
          personId,
          type: input.type ?? AddressType.HOME,
          receiverName,
          phone,
          addressLine,
          ward: input.ward,
          district: input.district,
          province,
          isDefault:
            input.isDefault === true ||
            existingAddressCount === 0,
        },
      });
    });
  }

  async updateAddress(
    personId: bigint | number,
    addressId: bigint | number,
    input: UpdateAddressInput,
  ) {
    this.validateUpdateFields(input);

    const personIdBigInt = BigInt(personId);
    const addressIdBigInt = BigInt(addressId);

    const existingAddress =
      await prisma.address.findFirst({
        where: {
          id: addressIdBigInt,
          personId: personIdBigInt,
        },
        select: {
          id: true,
        },
      });

    if (!existingAddress) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    const receiverName =
      input.receiverName !== undefined
        ? this.validateRequiredString(
            input.receiverName,
            "INVALID_RECEIVER_NAME",
          )
        : undefined;

    const phone =
      input.phone !== undefined
        ? this.validateRequiredString(
            input.phone,
            "INVALID_PHONE",
          )
        : undefined;

    const addressLine =
      input.addressLine !== undefined
        ? this.validateRequiredString(
            input.addressLine,
            "INVALID_ADDRESS_LINE",
          )
        : undefined;

    const province =
      input.province !== undefined
        ? this.validateRequiredString(
            input.province,
            "INVALID_PROVINCE",
          )
        : undefined;

    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.address.updateMany({
          where: {
            personId: personIdBigInt,
            isDefault: true,
            id: {
              not: addressIdBigInt,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.update({
        where: {
          id: addressIdBigInt,
        },
        data: {
          ...(input.type !== undefined && {
            type: input.type,
          }),

          ...(receiverName !== undefined && {
            receiverName,
          }),

          ...(phone !== undefined && {
            phone,
          }),

          ...(addressLine !== undefined && {
            addressLine,
          }),

          ...(input.ward !== undefined && {
            ward: input.ward,
          }),

          ...(input.district !== undefined && {
            district: input.district,
          }),

          ...(province !== undefined && {
            province,
          }),

          ...(input.isDefault !== undefined && {
            isDefault: input.isDefault,
          }),
        },
      });
    });
  }

  async deleteAddress(
    personId: bigint | number,
    addressId: bigint | number,
  ) {
    const personIdBigInt = BigInt(personId);
    const addressIdBigInt = BigInt(addressId);

    const existingAddress =
      await prisma.address.findFirst({
        where: {
          id: addressIdBigInt,
          personId: personIdBigInt,
        },
        select: {
          id: true,
          isDefault: true,
        },
      });

    if (!existingAddress) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    await prisma.address.delete({
      where: {
        id: addressIdBigInt,
      },
    });

    return {
      success: true,
      addressId: existingAddress.id,
    };
  }
}

export const addressService =
  new AddressService();

