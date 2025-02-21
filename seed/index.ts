import { PrismaClient } from "@prisma/client";
import { seedLocations } from "./locations";
import { seedCarBrands } from "./models";

const prisma = new PrismaClient();

try {
    await seedLocations(prisma);
    await seedCarBrands(prisma);
} catch (e) {
    console.error(e);
} finally {
    await prisma.$disconnect();
}
