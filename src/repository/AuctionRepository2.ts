import type {
    AuctionCarInformationDto,
    AuctionContactDetailsDto,
    PaginatedAuctionQueryDto,
} from "../dto/auction";
import type { BasicAuction } from "./types";
import {
    AuctionState,
    type Prisma,
    type PrismaClient,
    type Auction,
    ImageGroup,
} from "@prisma/client";
import { Err, Ok, type Result } from "../result";
import { BASIC_AUCTION_SELECT } from "./select/auction";

/**
 * This repo gives more control to the caller than the original auctionrepo, because the method names were getting stupidly long
 * "Basic" Auction is an auction with just the basic data, used as a "card". With data like the last bid, only 1 photo, etc.
 * "Full" Auction is all the data of the auction, to be shown when you open up a specific auction
 */
export default class AuctionRepository2 {
    constructor(private prisma: PrismaClient) {}

    // TODO: Why do we have a `submit` and a `create` method??
    public submit = async (
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

            // Fill in the auctionId in the AuctionCarInformation schema
            await tx.auctionCarInformation.update({
                where: { id: carInformationId },
                data: {
                    auctionId: auction.id,
                },
            });

            return auction;
        });
    };

    /**
     * This method by defaults includes only LIVE auctions where the endDate has not been reached yet, i.e. auctions which can be bid on
     */
    public async findManyLiveBasicPaginated(query?: PaginatedAuctionQueryDto) {
        // TODO: In the filters include a "ended", "not_started" fields, based on which we will include LIVE auctions which have either not yet started or already ended
        const where: Prisma.AuctionWhereInput = {
            state: AuctionState.LIVE,
            featured: query?.featured,
            carInformation: {
                city: {
                    countryCode: {
                        in: query?.countries,
                    },
                },
                carBrandName: query?.brand,
                carModelName: query?.model,
            },
        };

        const select: typeof BASIC_AUCTION_SELECT = {
            ...BASIC_AUCTION_SELECT,
            // We need some extra media for the featured auctions
            media: query?.featured
                ? {
                      where: {
                          group: {
                              in: [ImageGroup.EXTERIOR, ImageGroup.INTERIOR],
                          },
                      },
                      orderBy: { order: "asc" },
                      take: 8,
                  }
                : BASIC_AUCTION_SELECT.media,
        };

        const [auctions, totalCount] = (await Promise.all([
            this.prisma.auction.findMany({
                select,
                where,
                take: 24,
                // TODO: Implement cursor based pagination...
                skip: 0,
            }),
            this.prisma.auction.count({
                where,
            }),
        ])) as [unknown, unknown] as [BasicAuction[], number];

        return { auctions, totalCount };
    }

    /**
     * Don't paginate live auctions, as there shouldn't be too many of them for one specific user
     */
    public async findLiveAuctionsForSeller(sellerId: string) {
        return this.prisma.auction.findMany({
            select: BASIC_AUCTION_SELECT,
            where: {
                state: AuctionState.LIVE,
                sellerId,
            },
            orderBy: {
                endDate: "asc",
            },
        }) as unknown as Promise<BasicAuction[]>;
    }

    // TODO: Can we rename and use findManyLiveBasicPaginated instead of this?
    public async findEndedAuctionsForSellerPaginated(
        sellerId: string,
        cursorId?: string
    ) {
        const take = 10;

        const results = await this.prisma.auction.findMany({
            select: BASIC_AUCTION_SELECT,
            where: {
                state: AuctionState.ENDED,
                sellerId,
            },
            orderBy: {
                endDate: "asc",
            },
            take: take + 1,
            cursor: cursorId ? { id: cursorId } : undefined,
            skip: cursorId ? 1 : undefined, // skip the cursor itself
        });

        let next: string | null = null;
        if (results.length > take) {
            const nextItem = results.pop(); // remove the extra item
            next = nextItem!.id;
        }

        return {
            data: results as unknown as BasicAuction[],
            next,
        };
    }

    public async findManyFullPaginated(whereParam?: Prisma.AuctionWhereInput) {
        const where: Prisma.AuctionWhereInput = {
            ...whereParam,
        };

        const [auctions, totalCount] = await Promise.all([
            this.prisma.auction.findMany({
                include: {
                    carInformation: {
                        include: {
                            city: true,
                        },
                    },
                    contactDetails: true,
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
                contactDetails: {
                    select: {
                        type: true,
                        dealerName: true,
                    },
                },
                _count: {
                    select: {
                        bids: true,
                        comments: true,
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
                        id: true,
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
    public findByIdLockRowTxn = async (
        txn: Prisma.TransactionClient,
        id: string
    ): Promise<Auction | undefined> => {
        return (
            await txn.$queryRaw<Auction[]>`
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

    /**
     * Accept media uploads only for auctions which are in PENDING_CHANGES or SUBMITTED state
     */
    public findAuctionForUploadingMedia = async (
        id: string,
        sellerId: string
    ) => {
        return this.prisma.auction.findFirst({
            where: {
                id,
                sellerId,
                state: {
                    in: [AuctionState.PENDING_CHANGES, AuctionState.SUBMITTED],
                },
            },
            include: {
                _count: {
                    select: {
                        media: true,
                    },
                },
            },
        });
    };

    /**
     * Finds auctions which should be in ENDED state, rather, whose endDate has passed
     * One caveat, we check if the end date has passed by at least 5 seconds.
     * This is to prevent any sort of funny shenanigans from happeninng with the system for preventing sniping
     * and this system for ending auctions
     */
    public findAuctionsToEnd = async () => {
        return this.prisma.auction.findMany({
            where: {
                endDate: {
                    // TODO: Add a circuit breaker to the placing bid function, so that it NEVER exceeds 5 seconds
                    // Or maybe 3 seconds?
                    // Because if it does, then again we can have very weird situations where for instance
                    // The auction ends at the same time when a person submits a new bid where the endTime was supposed to increase...
                    lt: new Date(Date.now() - 5000),
                },
                state: AuctionState.LIVE,
            },
            take: 10,
        });
    };

    /**
     * Update the auction state to ENDED, this will only work for an auction in the LIVE state, this acts as sort of a
     * optimistic lock, since we might have multiple processes trying to process and "close" an auction
     */
    public updateAuctionStateToEnded = async (id: string) => {
        return this.prisma.auction.updateMany({
            where: {
                id,
                state: AuctionState.LIVE,
            },
            data: {
                state: AuctionState.ENDED,
            },
        });
    };
}
