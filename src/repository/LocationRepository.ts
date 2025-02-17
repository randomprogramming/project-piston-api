import type { PrismaClient } from "@prisma/client";

export default class LocationRepository {
    constructor(private prisma: PrismaClient) {}

    public findCitiesByQuery = async (q: string) => {
        q = q.toLowerCase();

        const cities = await this.prisma.city.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    {
                        alternateNames: {
                            some: {
                                name: { contains: q, mode: "insensitive" },
                            },
                        },
                    },
                ],
            },
            include: {
                alternateNames: true,
            },
            take: 50,
        });

        // Manual ranking to prioritize results
        const rankedCities = cities.map((city) => {
            let rank = 0;

            // Exact match for city name
            if (city.name.toLowerCase() === q) {
                rank += 3;
            }

            // Exact match for alternate names
            if (
                city.alternateNames.some((alt) => alt.name.toLowerCase() === q)
            ) {
                rank += 2;
            }

            // Partial match for city name
            if (city.name.toLowerCase().includes(q)) {
                rank += 1;
            }

            // Partial match for alternate names
            if (
                city.alternateNames.some((alt) =>
                    alt.name.toLowerCase().includes(q)
                )
            ) {
                rank += 1;
            }

            return { ...city, rank };
        });

        return rankedCities.sort((a, b) => b.rank - a.rank).splice(0, 24);
    };
}
