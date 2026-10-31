
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import fs from "node:fs";
import path from "node:path";

const caPath = path.resolve(process.cwd(), "certs/aiven-ca.pem");
const ca = fs.readFileSync(caPath, "utf8");

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "ecommerce_platform",
  connectionLimit: 5,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
});

export const prisma = new PrismaClient({
  adapter,
});
