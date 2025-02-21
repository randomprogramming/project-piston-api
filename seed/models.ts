import type { Prisma, PrismaClient } from "@prisma/client";

async function fetchBrands() {
    try {
        const response = await fetch(
            "https://www.carqueryapi.com/api/0.3/?callback=?&cmd=getMakes"
        );

        if (!response.ok) {
            throw new Error("Failed to fetch car brands");
        }
        const data = await response.text();
        const jsonResponse = JSON.parse(data.slice(2, -2)); // Remove the JSONP wrapper
        return jsonResponse.Makes;
    } catch (error) {
        console.error("Error fetching car data:", error);
        return [];
    }
}

export async function seedCarBrands(prisma: PrismaClient) {
    const carBrandsData = await fetchBrands();

    if (!carBrandsData.length) {
        console.error("No car brands fetched. Exiting seed process.");
        return;
    }
    console.log(`Found ${carBrandsData.length} brands, seeding DB...`);

    const toInsert: Prisma.CarBrandCreateManyInput[] = carBrandsData.map(
        (cb: any) => {
            return {
                name: cb.make_display,
            };
        }
    );

    await prisma.carBrand.createMany({
        data: toInsert,
        skipDuplicates: true,
    });

    console.log("Car Brand seeding completed!");
}
