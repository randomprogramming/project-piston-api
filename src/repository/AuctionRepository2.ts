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
import { Err, Ok, type Result } from "../result";

/**
 * This repo gives more control to the caller than the original auctionrepo, because the method names were getting stupidly long
 * "Basic" Auction is an auction with just the basic data, used as a "card". With data like the last bid, only 1 photo, etc.
 * "Full" Auction is all the data of the auction, to be shown when you open up a specific auction
 */
export default class AuctionRepository2 {
    constructor(private prisma: PrismaClient) {}

    /**
     * This method by defaults includes only LIVE auctions where the endDate has not been reached yet, i.e. auctions which can be bid on
     */
    public async findManyBasicPaginated(whereParam?: Prisma.AuctionWhereInput) {
        // TODO: In the filters include a "ended", "not_started" fields, based on which we will include LIVE auctions which have either not yet started or already ended
        const where: Prisma.AuctionWhereInput = {
            state: AuctionState.LIVE,
            endDate: {
                gt: new Date(),
            },
            ...whereParam,
        };

        let media: Prisma.MediaFindManyArgs = {};
        if (whereParam?.featured) {
            // For featured auctions, we have a couple of extra images to show, so we need to adapt the query
            media = {
                where: {
                    group: {
                        in: [ImageGroup.EXTERIOR, ImageGroup.INTERIOR],
                    },
                },
                orderBy: { order: "asc" },
                take: 8,
            };
        } else {
            media = {
                where: { group: ImageGroup.EXTERIOR },
                orderBy: { order: "asc" },
                take: 1,
            };
        }

        const [auctions, totalCount] = await Promise.all([
            this.prisma.auction.findMany({
                select: {
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
                    media,
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
                carInformation: {
                    omit: {
                        vin: true,
                    },
                },
            },
        });
    };

    public auctionGoLive = async (
        id: string,
        data: {
            prettyId: string;
            startDate: Date;
            endDate: Date;
            featured: boolean;
        }
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

    public getFull = async (where: Prisma.AuctionWhereUniqueInput) => {
        return this.prisma.auction.findUnique({
            where,
            include: {
                carInformation: {
                    include: {
                        city: true,
                    },
                    omit: {
                        vin: true,
                    },
                },
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

    /**
     * Accept a submitted auction. Meaning, move it to "PENDING_CHANGES" but only if it was in the "SUBMITTED" state
     */
    public acceptSubmittedAndCreateCarModel = async (
        id: string
    ): Promise<Result<Auction, string>> => {
        return this.prisma.$transaction(async (tx) => {
            const auction = await tx.auction.findUnique({
                where: { id, state: AuctionState.SUBMITTED },
            });
            if (!auction) {
                return Err("auction_not_found");
            }

            const carInformation = await tx.auctionCarInformation.findUnique({
                where: {
                    id: auction.carInformationId,
                },
            });
            if (!carInformation) {
                return Err("carInformation_not_found");
            }

            let carBrand = await tx.carBrand.findUnique({
                where: {
                    name: carInformation.ueCarBrand,
                },
            });
            if (!carBrand) {
                carBrand = await tx.carBrand.create({
                    data: {
                        name: carInformation.ueCarBrand,
                    },
                });
            }
            if (!carBrand) {
                return Err("carBrand_failed_create");
            }

            let carModel = await tx.carModel.findUnique({
                where: {
                    name_carBrandName: {
                        carBrandName: carBrand.name,
                        name: carInformation.ueCarModel,
                    },
                },
            });
            if (!carModel) {
                carModel = await tx.carModel.create({
                    data: {
                        carBrandName: carBrand.name,
                        name: carInformation.ueCarModel,
                    },
                });
            }
            if (!carModel) {
                return Err("carModel_failed_create");
            }

            await tx.auctionCarInformation.update({
                where: {
                    id: auction.carInformationId,
                },
                data: {
                    carModel: {
                        connect: {
                            name_carBrandName: {
                                carBrandName: carBrand.name,
                                name: carInformation.ueCarModel,
                            },
                        },
                    },
                },
            });

            const updatedAuction = await tx.auction.update({
                data: {
                    state: AuctionState.PENDING_CHANGES,
                },
                where: {
                    id: auction.id,
                },
            });
            return Ok(updatedAuction);
        });
    };

    public countLiveFeaturedAuctions = async () => {
        return this.prisma.auction.count({
            where: {
                featured: true,
                state: AuctionState.LIVE,
                endDate: {
                    gt: new Date(),
                },
            },
        });
    };
}
