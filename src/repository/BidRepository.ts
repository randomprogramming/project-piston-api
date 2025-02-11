import type { Prisma, PrismaClient } from "@prisma/client";
import type { BidDto } from "../dto/bid";

export default class BidRepository {
    constructor(private prisma: PrismaClient) {}

    public async asTransaction<T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>
    ): Promise<T> {
        return this.prisma.$transaction(fn);
    }

    public createForAuction = async (
        auctionId: string,
        bidderId: string,
        dto: BidDto,
        tx?: Prisma.TransactionClient
    ) => {
        let client: PrismaClient | Prisma.TransactionClient = this.prisma;
        if (tx) {
            client = tx;
        }

        return client.bid.create({
            data: {
                amount: dto.amount,
                auctionId,
                bidderId,
            },
        });
    };

    public findCurrentBidForAuction = async (auctionId: string) => {
        return this.prisma.bid.findFirst({
            where: {
                auctionId,
            },
            orderBy: {
                amount: "desc",
            },
        });
    };

    public findCurrentBidForAuctionIncludeBidder = async (
        auctionId: string
    ) => {
        return this.prisma.bid.findFirst({
            where: {
                auctionId,
            },
            orderBy: {
                amount: "desc",
            },
            include: {
                bidder: {
                    select: {
                        username: true,
                    },
                },
            },
        });
    };

    public findManyForAuctionIdIncludeBidderOrderByCreatedAtDesc = async (
        auctionId: string
    ) => {
        return this.prisma.bid.findMany({
            where: {
                auctionId,
            },
            include: {
                bidder: {
                    select: {
                        username: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    };
}
