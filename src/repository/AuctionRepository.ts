import { AuctionState, type PrismaClient, ImageGroup } from "@prisma/client";

export default class AuctionRepository {
    constructor(private prisma: PrismaClient) {}

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
}
