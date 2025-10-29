import pkg from "@prisma/client";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
const { PrismaClient } = pkg as unknown as { PrismaClient: new () => PrismaClientType };

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClientType | undefined;
}

export const prisma: PrismaClientType = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

export default prisma;



