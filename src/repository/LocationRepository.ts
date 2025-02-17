import type { PrismaClient } from "@prisma/client";

export default class LocationRepository {
    constructor(private prisma: PrismaClient) {}

    public findCitiesByQuery = async (q: string) => {
        q = q.toLowerCase();

        const cities = await this.prisma.city.findMany({
            where: {
                name: { contains: q, mode: "insensitive" },
            },
            include: {
                alternateNames: true,
            },
            take: 24,
        });

        const alternateCities = await this.prisma.city.findMany({
            where: {
                alternateNames: {
                    some: {
                        name: { contains: q, mode: "insensitive" },
                    },
                },
                id: {
                    notIn: cities.map((c) => c.id),
                },
            },
            include: {
                alternateNames: true,
            },
            take: 24,
        });

        // Manual ranking to prioritize results
        const rankedCities = cities.concat(alternateCities).map((city) => {
            let rank = 0;

            // Exact match for city name
            if (city.name.toLowerCase() === q) {
                rank += 4;
            }

            // City name starts with query
            if (city.name.toLowerCase().startsWith(q)) {
                rank += 2;
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
