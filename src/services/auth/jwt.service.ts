import jwt from "jsonwebtoken";
import { authConfig } from "../../config/auth.config.js";
import { AccountPlatform } from "../../generated/prisma/enums.js";

export interface JwtPayload {
  accountId: string;
  personId: string;
  platform: AccountPlatform;
}

export class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(
      {
        accountId: payload.accountId,
        personId: payload.personId,
        platform: payload.platform,
      },
      authConfig.jwtSecret,
      {
        expiresIn: authConfig.expiresIn,
      },
    );
  }

  verify(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(
        token,
        authConfig.jwtSecret,
      ) as jwt.JwtPayload;

      if (
        typeof decoded.accountId !== "string" ||
        typeof decoded.personId !== "string" ||
        (decoded.platform !== AccountPlatform.MEMBER &&
          decoded.platform !== AccountPlatform.FRANCHISE)
      ) {
        throw new Error("INVALID_TOKEN_PAYLOAD");
      }

      return {
        accountId: decoded.accountId,
        personId: decoded.personId,
        platform: decoded.platform,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "INVALID_TOKEN_PAYLOAD"
      ) {
        throw error;
      }

      throw new Error("INVALID_TOKEN");
    }
  }
}

export const jwtService = new JwtService();