import {
  addressService,
  CreateAddressInput,
  UpdateAddressInput,
} from "../../services/address/address.service.js";

import { parsePositiveId } from "../../utils/parse-positive-id.js";

export class AddressController {
  async getAddressesByPersonId(
    personId: string | number,
  ) {
    return addressService.getAddressesByPersonId(
      BigInt(personId),
    );
  }

  async getAddressById(
    personId: string | number,
    addressId: string | number,
  ) {
    return addressService.getAddressById(
      BigInt(personId),
      parsePositiveId(addressId.toString()),
    );
  }

  async createAddress(
    input: CreateAddressInput,
  ) {
    return addressService.createAddress(input);
  }

  async updateAddress(
    personId: string | number,
    addressId: string | number,
    input: UpdateAddressInput,
  ) {
    return addressService.updateAddress(
      BigInt(personId),
      parsePositiveId(addressId.toString()),
      input,
    );
  }

  async deleteAddress(
    personId: string | number,
    addressId: string | number,
  ) {
    return addressService.deleteAddress(
      BigInt(personId),
      parsePositiveId(addressId.toString()),
    );
  }
}

export const addressController =
  new AddressController();