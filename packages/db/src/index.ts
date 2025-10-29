import pkg from "@prisma/client";
const { PrismaClient } = pkg as unknown as { PrismaClient: new () => any };

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

export default prisma;



