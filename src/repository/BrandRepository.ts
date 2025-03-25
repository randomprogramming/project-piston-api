import type { Prisma, PrismaClient } from "@prisma/client";

export default class BrandRepository {
    constructor(private prisma: PrismaClient) {}

    public findManyBrandsByName = async (name: string) => {
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
    };

    public findManyModelsForBrand = async (brandName: string) => {
        return this.prisma.carModel.findMany({
            select: {
                name: true,
            },
            where: {
                carBrandName: brandName,
            },
        });
    };

    /**
     * Search for brands and models based on the input query
     * Will match for multiple words in the query, for istance if q is "Porsche 911", it will return
     * both the brand and the model(with the brand) for that car.
     * Returned results ordered by "relevance" (how well they match to the q)
     */
    public search = async (q: string) => {
        q = q.toLowerCase();

        // Split the query into individual non-empty words (tokens)
        // Use OR statements to look for each of the tokens, either in the brand name or the model name
        const queryTokens = q.split(" ").filter(Boolean);

        const brands = await this.prisma.carBrand.findMany({
            where: {
                OR: [
                    ...queryTokens.map((t) => ({
                        name: {
                            contains: t,
                            mode: "insensitive" as Prisma.QueryMode,
                        },
                    })),
                ],
            },
            take: 10,
        });

        const models = await this.prisma.carModel.findMany({
            where: {
                OR: [
                    ...queryTokens.map((t) => ({
                        name: {
                            contains: t,
                            mode: "insensitive" as Prisma.QueryMode,
                        },
                    })),
                    ...queryTokens.map((t) => ({
                        brand: {
                            name: {
                                contains: t,
                                mode: "insensitive" as Prisma.QueryMode,
                            },
                        },
                    })),
                ],
            },
            include: { brand: true },
            take: 10,
        });

        type Result =
            | { type: "brand"; name: string }
            | { type: "model"; name: string; brand: string };

        // Combine both results into one array
        const results: Result[] = [
            ...brands.map(
                (brand) => ({ type: "brand", name: brand.name } as const)
            ),
            ...models.map(
                (model) =>
                    ({
                        type: "model",
                        name: model.name,
                        brand: model.brand.name,
                    } as const)
            ),
        ];

        // Sort by relevance
        results.sort((a, b) => {
            const getFullName = (item: {
                type: string;
                name: string;
                brand?: string;
            }) =>
                item.type === "brand"
                    ? item.name.toLowerCase()
                    : `${item.brand} ${item.name}`.toLowerCase();

            const aFull = getFullName(a);
            const bFull = getFullName(b);

            const getRelevance = (fullName: string) =>
                fullName === q
                    ? 3 // Exact match → highest priority
                    : fullName.startsWith(q)
                    ? 2 // Starts with → high priority
                    : fullName.includes(q)
                    ? 1 // Partial match → lower priority
                    : 0;

            return getRelevance(bFull) - getRelevance(aFull);
        });

        return results.slice(0, 10);
    };
}
