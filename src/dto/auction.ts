import { z } from "zod";
import { mileage, modelYear, nullableString } from "./sharedValidators";

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

// TODO: Make sure that name is present if type is PRIVATE and same for DEALER and dealerName
const AuctionContactDetailsSchema = z.object({
    name: nullableString(),
    dealerName: nullableString(),
    type: z.enum(["PRIVATE", "DEALER"]),
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

// const PatchableCarInformationSchema = z.object({
//     vin: z.optional(z.string()),
//     modelYear: z.optional(modelYear()),
//     trim: z.optional(nullableString()),
//     mileage: z.optional(mileage()),
//     carModelName: z.optional(nullableString()),
//     carBrandName: z.optional(nullableString()),
// });

// const PatchableAuctionSchema = z.object({
//     carInformation: z.lazy(() => PatchableCarInformationSchema),
// });

// export function parseAuctionPatchData(obj: any) {
//     return PatchableAuctionSchema.parse(obj);
// }
// export type AuctionPatchData = z.infer<typeof PatchableAuctionSchema>;
