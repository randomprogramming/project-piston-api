import type { PrismaClient } from "@prisma/client";

export default class BrandRepository {
    constructor(private prisma: PrismaClient) {}

    public async findManyBrandsByName(name: string) {
        return this.prisma.carBrand.findMany({
            select: {
                name: true,
            },
            where: {
                name: {
                    contains: name,
                    mode: "insensitive",
                },
            },
        });
    }

    public async findManyModelsForBrand(brandName: string) {
        return this.prisma.carModel.findMany({
            select: {
                name: true,
            },
            where: {
                carBrandName: brandName,
            },
        });
    }
}
