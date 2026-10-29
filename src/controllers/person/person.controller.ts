import {
  AccountPlatform,
} from "../../generated/prisma/enums.js";

import {
  personService,
  CreatePersonInput,
  UpdatePersonInput,
} from "../../services/person/person.service.js";

export interface CreatePersonRequest {
  fullName: string;
}

export interface UpdatePersonRequest {
  fullName?: string;
}

export class PersonController {
  async createPerson(input: CreatePersonRequest) {
    const data: CreatePersonInput = {
      fullName: input.fullName,
    };

    return personService.createPerson(data);
  }

  async getPersonById(id: string | number) {
    return personService.getPersonById(BigInt(id));
  }

  async updatePerson(
    id: string | number,
    input: UpdatePersonRequest,
  ) {
    const data: UpdatePersonInput = {
      fullName: input.fullName,
    };

    return personService.updatePerson(
      BigInt(id),
      data,
    );
  }

  async deletePerson(id: string | number) {
    return personService.deletePerson(BigInt(id));
  }

  async getAccountsByPersonId(
    personId: string | number,
  ) {
    return personService.getAccountsByPersonId(
      BigInt(personId),
    );
  }

  async getAccountByPersonAndPlatform(
    personId: string | number,
    platform: AccountPlatform,
  ) {
    return personService.getAccountByPersonAndPlatform(
      BigInt(personId),
      platform,
    );
  }

  async getPlatformIdentity(
    personId: string | number,
  ) {
    return personService.getPlatformIdentity(
      BigInt(personId),
    );
  }
}

export const personController =
  new PersonController();