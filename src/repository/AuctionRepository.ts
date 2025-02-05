import type {
    AuctionCarInformationDto,
    AuctionContactDetailsDto,
} from "../dto/auction";
import {
    AuctionState,
    type Prisma,
    type PrismaClient,
    type Auction,
    ImageGroup,
} from "@prisma/client";

export default class AuctionRepository {
    constructor(private prisma: PrismaClient) {}

    public createWithStateSubmitted = async (
        sellerId: string,
        carInformationDto: AuctionCarInformationDto,
        contactDetailsDto: AuctionContactDetailsDto
    ) => {
        return this.prisma.$transaction(async (tx) => {
            // Create car information table row
            const { id: carInformationId } =
                await tx.auctionCarInformation.create({
                    data: {
                        ...carInformationDto,
                    },
                });

            // Create contact details table row
            const { id: contactDetailsId } = await tx.contactDetails.create({
                data: {
                    ...contactDetailsDto,
                },
            });

            // Create auction table row
            const auction = await tx.auction.create({
                data: {
                    state: AuctionState.SUBMITTED,
                    sellerId,
                    carInformationId,
                    contactDetailsId,
                },
            });

            return auction;
        });
    };

    public findAllWhereStateIsSubmittedOrUnder_ReviewLimit10OrderByUpdatedAtIncludeAll =
        async () => {
            return this.prisma.auction.findMany({
                where: {
                    state: {
                        in: [AuctionState.SUBMITTED, AuctionState.UNDER_REVIEW],
                    },
                },
                include: {
                    carInformation: true,
                    contactDetails: true,
                    media: {
                        orderBy: [
                            {
                                // TODO: Verify that this actually works, since group is an enum
                                group: "asc",
                            },
                            {
                                order: "asc",
                            },
                        ],
                    },
                    seller: {
                        select: {
                            username: true,
                        },
                    },
                },
                take: 10,
                orderBy: {
                    updatedAt: "desc",
                },
            });
        };

    public findById = async (id: string) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
            },
        });
    };

    public findByIdIncludeCarInformation = async (id: string) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
            },
            include: {
                carInformation: true,
            },
        });
    };

    /**
     * This method locks the Auction row (pessimistic locking)
     * It uses FOR NO KEY UPDATE, so that you can still create rows in other tables with foreign keys in Auction (like Bids)
     */
    public findByIdLockRow = async (
        tx: Prisma.TransactionClient,
        id: string
    ) => {
        return (
            await tx.$queryRaw<Auction[]>`
                    SELECT *
                    FROM "Auction"
                    WHERE id = ${id}
                    FOR NO KEY UPDATE
                `
        )[0];
    };

    public findByIdAndSellerId = async (id: string, sellerId: string) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
                sellerId,
            },
        });
    };

    public findByIdAndSellerIdAndState = async (
        id: string,
        sellerId: string,
        state: AuctionState
    ) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
                sellerId,
                state,
            },
        });
    };

    public findByIdIncludeAll = async (id: string) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
            },
            include: {
                carInformation: true,
                contactDetails: true,
                media: {
                    orderBy: [
                        {
                            // TODO: Verify that this actually works, since group is an enum
                            group: "asc",
                        },
                        {
                            order: "asc",
                        },
                    ],
                },
                seller: {
                    select: {
                        username: true,
                    },
                },
            },
        });
    };

    public updateStateById = async (id: string, newState: AuctionState) => {
        return this.prisma.auction.update({
            data: {
                state: newState,
            },
            where: {
                id,
            },
        });
    };

    public updateStateToLiveAndPrettyId = async (
        id: string,
        prettyId: string
    ) => {
        return this.prisma.auction.update({
            data: {
                state: AuctionState.LIVE,
                prettyId,
            },
            where: {
                id,
            },
        });
    };

    public findBySellerIdIncludeAll = async (sellerId: string) => {
        return this.prisma.auction.findMany({
            where: {
                sellerId,
            },
            include: {
                carInformation: true,
                contactDetails: true,
                media: {
                    orderBy: [
                        {
                            // TODO: Verify that this actually works, since group is an enum
                            group: "asc",
                        },
                        {
                            order: "asc",
                        },
                    ],
                },
            },
        });
    };

    public findByPrettyIdIncludeCarInformationAndMediaAndSeller = async (
        prettyId: string
    ) => {
        return this.prisma.auction.findUnique({
            where: {
                prettyId,
            },
            include: {
                carInformation: true,
                media: {
                    orderBy: [
                        {
                            // TODO: Verify that this actually works, since group is an enum
                            group: "asc",
                        },
                        {
                            order: "asc",
                        },
                    ],
                },
                seller: {
                    select: {
                        username: true,
                        createdAt: true,
                    },
                },
            },
        });
    };

    public findManyWhereStateLiveIncludeCarInformationAndCurrentBidAndCoverPhoto =
        async () => {
            return this.prisma.auction.findMany({
                where: {
                    state: AuctionState.LIVE,
                },
                include: {
                    carInformation: true,
                    bids: {
                        orderBy: {
                            amount: "desc",
                        },
                        take: 1,
                    },
                    media: {
                        where: {
                            group: ImageGroup.EXTERIOR,
                        },
                        orderBy: {
                            order: "asc",
                        },
                        take: 1,
                    },
                },
            });
        };
}
