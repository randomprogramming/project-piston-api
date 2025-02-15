import type { Auction, AuctionCarInformation, Media } from "@prisma/client";

interface AuctionWithCarInformationAndMediaAndSeller extends Auction {
    carInformation: AuctionCarInformation;
    media: Media[];
    seller: {
        username: string | null;
        createdAt: string | Date;
    };
}
export function mapAuction(a: AuctionWithCarInformationAndMediaAndSeller) {
    return {
        id: a.id,
        prettyId: a.prettyId,
        state: a.state,
        startDate: a.startDate,
        endDate: a.endDate,
        carInformation: {
            ueCarBrand: a.carInformation.ueCarBrand,
            ueCarModel: a.carInformation.ueCarModel,
            modelYear: a.carInformation.modelYear,
            trim: a.carInformation.trim,
            mileage: a.carInformation.mileage,
            carModelName: a.carInformation.carModelName,
            carBrandName: a.carInformation.carBrandName,
        },
        seller: {
            username: a.seller.username,
            createdAt: a.seller.createdAt,
        },
        media: a.media.map((m) => ({
            id: m.id,
            url: m.url,
            group: m.group,
            order: m.order,
            createdAt: m.createdAt,
        })),
    };
}
