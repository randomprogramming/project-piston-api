import { z } from "zod";
import { nullableString } from "./sharedValidators";

const AuctionCarInformationSchema = z.object({
    vin: z.string(),
    ueCarBrand: z.string(),
    ueCarModel: z.string(),
    modelYear: z.coerce.number().min(1885).max(3000),
    trim: nullableString(),
    mileage: z.coerce.number().min(0),
    carModelName: nullableString(),
    carBrandName: nullableString(),
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
