import type {
    Auction,
    AuctionCarInformation,
    AuctionState,
    Bid,
    City,
    ImageGroup,
    Media,
} from "@prisma/client";

type AuctionCarInformationNoVin = Omit<AuctionCarInformation, "vin">;

interface FullAuction extends Auction {
    carInformation: AuctionCarInformationNoVin & { city: City };
    media: Media[];
    seller: {
        username: string | null;
        createdAt: string | Date;
    };
    _count: {
        comments: number;
        bids: number;
    };
}
export function mapAuction(a: FullAuction) {
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
            city: {
                name: a.carInformation.city.name,
                countryCode: a.carInformation.city.countryCode,
            },
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
        bidCount: a._count.bids,
        commentCount: a._count.comments,
    };
}

interface BasicAuction {
    id: string;
    prettyId: string | null;
    state: AuctionState;
    startDate: Date | null;
    endDate: Date | null;
    media: {
        id: string;
        auctionId: string | null;
        updatedAt: Date;
        url: string;
        group: ImageGroup | null;
        order: number | null;
        createdAt: Date;
    }[];
    bids: {
        amount: number;
        bidder: { username: string | null };
    }[];
    carInformation: AuctionCarInformationNoVin & { city: City };
}

export function mapBasicAuction(a: BasicAuction) {
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
            carModelName: a.carInformation.carModelName,
            carBrandName: a.carInformation.carBrandName,
            mileage: a.carInformation.mileage,
            city: {
                name: a.carInformation.city.name,
                countryCode: a.carInformation.city.countryCode,
            },
        },
        currentBid:
            a.bids.length > 0 ? { amount: a.bids[0].amount } : undefined,
        coverPhoto: a.media.length > 0 ? a.media[0].url : undefined,
        media: a.media,
    };
}

export function mapBasicAuctions(a: BasicAuction[]) {
    return a.map(mapBasicAuction);
}
