import { z } from "zod";
import { mileage, modelYear, nullableString } from "./sharedValidators";
import { ContactType } from "@prisma/client";

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

const PaginatedAuctionQuerySchema = z.object({
    featured: z
        .string()
        .optional()
        .transform((value) =>
            value === undefined ? undefined : value.toLowerCase() === "true"
        ),
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
