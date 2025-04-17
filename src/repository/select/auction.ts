import { type Prisma, ImageGroup } from "@prisma/client";

export const BASIC_AUCTION_SELECT: Prisma.AuctionSelect = {
    id: true,
    prettyId: true,
    endDate: true,
    startDate: true,
    state: true,
    carInformation: {
        // TODO: Omit VIN everywhere...
        omit: {
            vin: true,
        },
        include: {
            city: true,
        },
    },
    bids: {
        orderBy: { amount: "desc" },
        take: 1,
        select: {
            amount: true,
            bidder: {
                select: {
                    username: true,
                },
            },
        },
    },
    media: {
        where: { group: ImageGroup.EXTERIOR },
        orderBy: { order: "asc" },
        take: 1,
    },
} satisfies Prisma.AuctionSelect;
