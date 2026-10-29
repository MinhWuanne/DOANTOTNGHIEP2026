import { prisma } from "../../lib/prisma.js";
import { AccountPlatform } from "../../generated/prisma/enums.js";

export interface CreatePersonInput {
  fullName: string;
}

export interface UpdatePersonInput {
  fullName?: string;
}

export class PersonService {
  /**
   * Create a new Person.
   *
   * Person represents one real human.
   * A Person can later own:
   * - one MEMBER account
   * - one FRANCHISE account
   *
   * Person itself does not contain platform information.
   */
  async createPerson(input: CreatePersonInput) {
    const fullName = input.fullName.trim();

    if (!fullName) {
      throw new Error("FULL_NAME_REQUIRED");
    }

    return prisma.person.create({
      data: {
        fullName,
      },
      include: {
        accounts: {
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            memberProfile: true,
            franchiseProfile: true,
          },
        },
      },
    });
  }

  /**
   * Get a Person by ID.
   */
  async getPersonById(id: bigint | number) {
    return prisma.person.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        accounts: {
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            memberProfile: true,
            franchiseProfile: true,
          },
          orderBy: {
            platform: "asc",
          },
        },
      },
    });
  }

  /**
   * Update Person information.
   *
   * Platform/account information is not changed here.
   */
  async updatePerson(
    id: bigint | number,
    input: UpdatePersonInput,
  ) {
    const personId = BigInt(id);

    const person = await prisma.person.findUnique({
      where: {
        id: personId,
      },
    });

    if (!person) {
      throw new Error("PERSON_NOT_FOUND");
    }

    const data: UpdatePersonInput = {};

    if (input.fullName !== undefined) {
      const fullName = input.fullName.trim();

      if (!fullName) {
        throw new Error("FULL_NAME_REQUIRED");
      }

      data.fullName = fullName;
    }

    return prisma.person.update({
      where: {
        id: personId,
      },
      data,
      include: {
        accounts: {
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            memberProfile: true,
            franchiseProfile: true,
          },
        },
      },
    });
  }

  /**
   * Get all accounts belonging to the same Person.
   *
   * This is the key method for identifying:
   *
   * Person A
   * ├── MEMBER account
   * └── FRANCHISE account
   *
   * It does NOT create referral relationships
   * and does NOT create commission relationships.
   */
  async getAccountsByPersonId(
    personId: bigint | number,
  ) {
    const person = await prisma.person.findUnique({
      where: {
        id: BigInt(personId),
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new Error("PERSON_NOT_FOUND");
    }

    return prisma.userAccount.findMany({
      where: {
        personId: person.id,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        memberProfile: true,
        franchiseProfile: true,
      },
      orderBy: {
        platform: "asc",
      },
    });
  }

  /**
   * Get the account of a Person on a specific platform.
   */
  async getAccountByPersonAndPlatform(
    personId: bigint | number,
    platform: AccountPlatform,
  ) {
    const person = await prisma.person.findUnique({
      where: {
        id: BigInt(personId),
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new Error("PERSON_NOT_FOUND");
    }

    return prisma.userAccount.findUnique({
      where: {
        personId_platform: {
          personId: person.id,
          platform,
        },
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        memberProfile: true,
        franchiseProfile: true,
      },
    });
  }

  /**
   * Check whether a Person has both MEMBER and FRANCHISE accounts.
   *
   * This only establishes identity mapping.
   * It does not imply referral or commission relationships.
   */
  async getPlatformIdentity(
    personId: bigint | number,
  ) {
    const accounts =
      await this.getAccountsByPersonId(personId);

    const memberAccount =
      accounts.find(
        (account) =>
          account.platform === AccountPlatform.MEMBER,
      ) ?? null;

    const franchiseAccount =
      accounts.find(
        (account) =>
          account.platform === AccountPlatform.FRANCHISE,
      ) ?? null;

    return {
      personId: BigInt(personId),
      memberAccount,
      franchiseAccount,
      hasMemberAccount: memberAccount !== null,
      hasFranchiseAccount: franchiseAccount !== null,
      hasBothPlatforms:
        memberAccount !== null &&
        franchiseAccount !== null,
    };
  }

  /**
   * Delete a Person only when the Person has no UserAccount.
   *
   * This protects the identity mapping from accidental deletion.
   */
  async deletePerson(id: bigint | number) {
    const personId = BigInt(id);

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

    const accountCount =
      await prisma.userAccount.count({
        where: {
          personId,
        },
      });

    if (accountCount > 0) {
      throw new Error("PERSON_HAS_ACCOUNTS");
    }

    return prisma.person.delete({
      where: {
        id: personId,
      },
    });
  }
}

export const personService = new PersonService();