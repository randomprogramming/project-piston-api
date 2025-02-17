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

/**
 * This repo gives more control to the caller than the original auctionrepo, because the method names were getting stupidly long
 * "Basic" Auction is an auction with just the basic data, used as a "card". With data like the last bid, only 1 photo, etc.
 * "Full" Auction is all the data of the auction, to be shown when you open up a specific auction
 */
export default class AuctionRepository2 {
    constructor(private prisma: PrismaClient) {}

    public async findManyBasicPaginated() {
        // TODO: In the filters include a "ended", "not_started" fields, based on which we will include LIVE auctions which have either not yet started or already ended
        const where: Prisma.AuctionWhereInput = {
            state: AuctionState.LIVE,
        };

        const [auctions, totalCount] = await Promise.all([
            this.prisma.auction.findMany({
                select: {
                    prettyId: true,
                    endDate: true,
                    startDate: true,
                    state: true,
                    carInformation: true,
                    bids: {
                        orderBy: { amount: "desc" },
                        take: 1,
                        select: { amount: true },
                    },
                    media: {
                        where: { group: ImageGroup.EXTERIOR },
                        orderBy: { order: "asc" },
                        take: 1,
                    },
                },
                where,
                take: 24,
                skip: 0,
            }),
            this.prisma.auction.count({
                where,
            }),
        ]);

        return { auctions, totalCount };
    }

    public async create(
        sellerId: string,
        carInformationDto: AuctionCarInformationDto,
        contactDetailsDto: AuctionContactDetailsDto
    ) {
        return this.prisma.$transaction(async (tx) => {
            const carInformation = await tx.auctionCarInformation.create({
                data: { ...carInformationDto },
            });

            const contactDetails = await tx.contactDetails.create({
                data: { ...contactDetailsDto },
            });

            return tx.auction.create({
                data: {
                    state: AuctionState.SUBMITTED,
                    sellerId,
                    carInformationId: carInformation.id,
                    contactDetailsId: contactDetails.id,
                },
            });
        });
    }

    public async findMany(
        filters: Partial<{
            state: AuctionState | AuctionState[];
            sellerId: string;
            prettyId: string;
        }>,
        options: Partial<{
            include: Prisma.AuctionInclude;
            orderBy: Prisma.AuctionOrderByWithRelationInput;
            limit: number;
        }>
    ) {
        return this.prisma.auction.findMany({
            where: {
                state: filters.state
                    ? {
                          in: Array.isArray(filters.state)
                              ? filters.state
                              : [filters.state],
                      }
                    : undefined,
                sellerId: filters.sellerId,
                prettyId: filters.prettyId,
            },
            include: options.include,
            orderBy: options.orderBy,
            take: options.limit,
        });
    }

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

    public auctionGoLive = async (
        id: string,
        data: { prettyId: string; startDate: Date; endDate: Date }
    ) => {
        return this.prisma.auction.update({
            data: {
                state: AuctionState.LIVE,
                ...data,
            },
            where: {
                id,
            },
        });
    };

    public getFull = async (prettyId: string) => {
        return this.prisma.auction.findUnique({
            where: {
                prettyId,
            },
            include: {
                carInformation: true,
                _count: {
                    select: {
                        bids: true,
                    },
                },
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

    public async updateAuction(
        id: string,
        data: Partial<Prisma.AuctionUpdateInput>
    ) {
        return this.prisma.auction.update({
            where: { id },
            data,
        });
    }

    /**
     * This method locks the Auction row (pessimistic locking)
     * It uses FOR NO KEY UPDATE, so that you can still create rows in other tables with foreign keys in Auction (like Bids)
     */
    public findByIdLockRow = async (
        tx: Prisma.TransactionClient,
        id: string
    ): Promise<Auction | undefined> => {
        return (
            await tx.$queryRaw<Auction[]>`
                SELECT * FROM "Auction" WHERE id = ${id} FOR NO KEY UPDATE
            `
        )[0];
    };
}
