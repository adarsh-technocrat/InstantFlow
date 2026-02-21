import { PrismaClient } from "@prisma/client";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function ensureDefaultProject() {
  await prisma.project.upsert({
    where: { id: DEFAULT_PROJECT_ID },
    create: { id: DEFAULT_PROJECT_ID },
    update: {},
  });
}
