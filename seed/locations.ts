import type { PrismaClient } from "@prisma/client";
import fs from "fs";
import readline from "readline";
import http from "http";
import path from "path";
import unzipper from "unzipper";

const DATA_DIR = "./seed/data/";
const CITIES_ZIP_URL = "http://download.geonames.org/export/dump/cities500.zip";
const CITIES_ZIP_PATH = path.join(DATA_DIR, "cities500.zip");
const CITIES_FILE_PATH = path.join(DATA_DIR, "cities500.txt");
const ALT_NAMES_URL =
    "http://download.geonames.org/export/dump/alternateNames.zip";
const ALT_NAMES_ZIP_PATH = path.join(DATA_DIR, "alternateNames.zip");
const ALT_NAMES_FILE_PATH = path.join(DATA_DIR, "alternateNames.txt");

interface CityData {
    geonameid: string;
    defaultCityName: string;
    countryCode: string;
    // Filled in at the 2nd step, when reading alternateNames.txt
    preferredName: string | null;
    altNames: string[];
    lat?: number;
    lng?: number;
}

const EUROPEAN_COUNTRIES: Set<String> = new Set([
    "AD",
    "AT",
    "BE",
    "BG",
    "BY",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "LT",
    "LU",
    "LV",
    "MC",
    "MD",
    "ME",
    "MK",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SI",
    "SK",
    "SM",
    "UA",
    "VA",
]);

async function downloadFile(url: string, outputPath: string) {
    if (fs.existsSync(outputPath)) {
        console.log(`✔ File already exists: ${outputPath}`);
        return;
    }

    console.log(`⬇ Downloading: ${url}`);
    const file = fs.createWriteStream(outputPath);

    return new Promise<void>((resolve, reject) => {
        http.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(
                    new Error(
                        `Failed to download ${url}. Status: ${response.statusCode}`
                    )
                );
                return;
            }
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                console.log(`✔ Downloaded: ${outputPath}`);
                resolve();
            });
        }).on("error", (err) => {
            fs.unlink(outputPath, () => {});
            console.error(`❌ Download failed: ${err.message}`);
            reject(err);
        });
    });
}

async function extractZip(zipPath: string, outputDir: string) {
    console.log(`📦 Extracting ${zipPath}...`);
    await fs
        .createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputDir }))
        .promise();
    console.log(`✔ Extraction complete.`);
}

/**
 * Step 0: Download the cities500.txt and alternateNames.txt files
 */
async function setupDataFiles() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    // Download and extract cities500.zip
    if (!fs.existsSync(CITIES_FILE_PATH)) {
        await downloadFile(CITIES_ZIP_URL, CITIES_ZIP_PATH);
        await extractZip(CITIES_ZIP_PATH, DATA_DIR);
    } else {
        console.log(
            `${CITIES_FILE_PATH} already exists, will not download/extract it.`
        );
    }

    // Download and extract alternateNames.zip
    if (!fs.existsSync(ALT_NAMES_FILE_PATH)) {
        await downloadFile(ALT_NAMES_URL, ALT_NAMES_ZIP_PATH);
        await extractZip(ALT_NAMES_ZIP_PATH, DATA_DIR);
    } else {
        console.log(
            `${ALT_NAMES_FILE_PATH} already exists, will not download/extract it.`
        );
    }
}

/**
 * Step 1: Reading cities from the Geonames cities500.txt file
 */
async function parseCitiesFile(): Promise<Map<string, CityData>> {
    console.log("Reading cities500.txt...");
    const cities = new Map<string, CityData>();
    const fileStream = fs.createReadStream(CITIES_FILE_PATH);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        // Expected columns (as per Geonames docs):
        // [0] geonameid, [1] name, ... [8] country code, etc.
        const geonameid = parts[0];
        const defaultCityName = parts[1];
        const lat = parseFloat(parts[4]);
        const lng = parseFloat(parts[5]);
        const countryCode = parts[8];

        // We want only EU countries.. If for some reason in the future
        // we want all cities, just remove this line
        if (!EUROPEAN_COUNTRIES.has(countryCode)) continue;

        cities.set(geonameid, {
            geonameid,
            defaultCityName,
            countryCode,
            preferredName: null,
            altNames: [],
            lat,
            lng,
        });
    }
    return cities;
}

/**
 * Step 2: Stream through alternateNames.txt.
 * For each line that belongs to one of our cities, save the alternate name.
 * If the name is marked as preferred (column 4 === "1") and no preferred name
 * has been set yet, use it as the city’s local name.
 */
async function parseAlternateNames(
    cities: Map<string, CityData>
): Promise<void> {
    console.log("Reading alternateNames.txt...");
    const fileStream = fs.createReadStream(ALT_NAMES_FILE_PATH);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length < 5) continue;

        const geonameid = parts[1];
        // Skip alternate names for cities not in our map.
        if (!cities.has(geonameid)) continue;

        const name = parts[3];
        const isPreferred = parts[4] === "1";
        const city = cities.get(geonameid)!;

        if (isPreferred && !city.preferredName) {
            city.preferredName = name;
        }
        city.altNames.push(name);
    }
}

/**
 * Step 3: Seed the database.
 */
async function seedDatabase(
    prisma: PrismaClient,
    cities: Map<string, CityData>
): Promise<void> {
    console.log("Seeding database...");

    try {
        // Step 2: Prepare cities for batch insert
        const cityDataArray = Array.from(cities.entries()).map(
            ([geonameid, cityData]) => ({
                id: geonameid,
                name: cityData.preferredName || cityData.defaultCityName,
                countryCode: cityData.countryCode,
                lng: cityData.lng,
                lat: cityData.lat,
            })
        );

        await prisma.city.createMany({
            data: cityDataArray,
            skipDuplicates: true,
        });

        // Step 3: Prepare alternate names
        const alternateNamesArray: { name: string; cityId: string }[] = [];
        for (const [geonameid, cityData] of cities) {
            const cityName = cityData.preferredName || cityData.defaultCityName;
            cityData.altNames
                .filter((name) => name !== cityName)
                .forEach((altName) => {
                    alternateNamesArray.push({
                        name: altName,
                        cityId: geonameid,
                    });
                });
        }

        if (alternateNamesArray.length > 0) {
            await prisma.alternateName.createMany({
                data: alternateNamesArray,
                skipDuplicates: true,
            });
        }

        console.log("Database seeding completed successfully.");
    } catch (error: any) {
        console.error("Error during database seeding:", error.message || error);
    }
}

async function seedLocations(prisma: PrismaClient) {
    await setupDataFiles();
    const cities = await parseCitiesFile();
    await parseAlternateNames(cities);
    await seedDatabase(prisma, cities);
}

export { seedLocations };
