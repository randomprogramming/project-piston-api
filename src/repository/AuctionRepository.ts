import { AuctionState, type PrismaClient } from "@prisma/client";
import type {
    AuctionCarInformationDto,
    AuctionContactDetailsDto,
} from "../dto/auction";

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
                    media: true,
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

    public findByIdIncludeAll = async (id: string) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
            },
            include: {
                carInformation: true,
                contactDetails: true,
                media: true,
                seller: {
                    select: {
                        username: true,
                    },
                },
            },
        });
    };

    // public updateById = async (id: string, data: AuctionPatchData) => {
    //     return this.prisma.auction.update({
    //         data: {
    //             carInformation: {
    //                 update: {
    //                     ...data.carInformation,
    //                 },
    //             },
    //         },
    //         where: {
    //             id,
    //         },
    //     });
    // };

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

    public findBySellerIdIncludeAll = async (sellerId: string) => {
        return this.prisma.auction.findMany({
            where: {
                sellerId,
            },
            include: {
                carInformation: true,
                contactDetails: true,
                media: true,
            },
        });
    };
}
