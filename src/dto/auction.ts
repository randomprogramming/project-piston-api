import { z } from "zod";
import { mileage, modelYear, nullableString } from "./sharedValidators";
import {
    ContactType,
    CarFuel,
    CarTitle,
    CarTransmission,
    CarDrivetrain,
    CarType,
} from "@prisma/client";

const AuctionCarInformationSchema = z.object({
    vin: z.string(),
    ueCarBrand: z.string(),
    ueCarModel: z.string(),
    modelYear: modelYear(),
    trim: nullableString(),
    mileage: mileage(),
    carModelName: nullableString(),
    carBrandName: nullableString(),
    cityId: z.string(),
    title: z.nativeEnum(CarTitle).optional(),
    power: z.coerce.number().int().nonnegative().optional(),
    fuel: z.nativeEnum(CarFuel).optional(),
    transmission: z.nativeEnum(CarTransmission).optional(),
    drivetrain: z.nativeEnum(CarDrivetrain).optional(),
    type: z.nativeEnum(CarType).optional(),
    exteriorColor: z.string().max(120).optional(),
    interiorColor: z.string().max(120).optional(),
});
export type AuctionCarInformationDto = z.infer<
    typeof AuctionCarInformationSchema
>;

const AuctionContactDetailsSchema = z.object({
    name: nullableString(),
    dealerName: nullableString(),
    type: z.nativeEnum(ContactType),
    phone: z.string(),
});
export type AuctionContactDetailsDto = z.infer<
    typeof AuctionContactDetailsSchema
>;

const AuctionSchema = z.object({
    carInformation: z.lazy(() => AuctionCarInformationSchema),
    contactDetails: z.lazy(() => AuctionContactDetailsSchema),
});

export function parseAuctionDto(obj: any) {
    return AuctionSchema.parse(obj);
}
export type AuctionDto = z.infer<typeof AuctionSchema>;

const PaginatedAuctionQuerySchema = z
    .object({
        featured: z
            .string()
            .optional()
            .transform((value) =>
                value === undefined ? undefined : value.toLowerCase() === "true"
            ),
        countries: z
            .string()
            .optional()
            .transform((value) =>
                value
                    ? value
                          .split(",")
                          .map((country) => country.trim().toUpperCase())
                    : undefined
            ),
        brand: z.string().optional(),
        model: z.string().optional(),
    })
    .superRefine((data) => {
        // If 'model' is set but 'brand' is missing, set 'model' to undefined
        if (data.model && !data.brand) {
            data.model = undefined;
        }
    });
export function parsePaginatedAuctionQuery(obj: any) {
    return PaginatedAuctionQuerySchema.parse(obj);
}
export type PaginatedAuctionQueryDto = z.infer<
    typeof PaginatedAuctionQuerySchema
>;

const AuctionPatchDataSchema = z.object({
    carInformation: z.lazy(() => AuctionCarInformationSchema.partial()),
    contactDetails: z.lazy(() => AuctionContactDetailsSchema.partial()),
});
export function parseAuctionPatchData(obj: any) {
    return AuctionPatchDataSchema.parse(obj);
}
export type AuctionPatchData = z.infer<typeof AuctionPatchDataSchema>;
