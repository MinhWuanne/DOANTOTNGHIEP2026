import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export class PasswordService {
  async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verify(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}

export const passwordService = new PasswordService();