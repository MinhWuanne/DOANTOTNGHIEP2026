import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET_REQUIRED");
}

export const authConfig = {
  jwtSecret,
  expiresIn: "7d",
} as const;