import type {
    Auction,
    AuctionCarInformation,
    Bid,
    Media,
} from "@prisma/client";

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

interface AuctionWithBids extends Auction {
    bids: Bid[];
    media: Media[];
    carInformation: AuctionCarInformation;
}
export function mapLiveAuctionBasic(a: AuctionWithBids) {
    const currentBid = a.bids[0];
    const coverPhoto = a.media[0];

    return {
        id: a.id,
        prettyId: a.prettyId,
        carInformation: {
            ueCarBrand: a.carInformation.ueCarBrand,
            ueCarModel: a.carInformation.ueCarModel,
            modelYear: a.carInformation.modelYear,
            trim: a.carInformation.trim,
            carModelName: a.carInformation.carModelName,
            carBrandName: a.carInformation.carBrandName,
        },
        currentBid: currentBid
            ? {
                  amount: currentBid.amount,
              }
            : null,
        coverPhoto: coverPhoto ? coverPhoto.url : null,
    };
}
export function mapLiveAuctionsBasic(a: AuctionWithBids[]) {
    return a.map(mapLiveAuctionBasic);
}
