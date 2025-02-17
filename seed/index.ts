import { PrismaClient } from "@prisma/client";
import { seedLocations } from "./locations";

const prisma = new PrismaClient();

try {
    await seedLocations(prisma);
} catch (e) {
    console.error(e);
} finally {
    await prisma.$disconnect();
}
