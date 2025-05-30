import type { Prisma, PrismaClient } from "@prisma/client";
import type { BidDto } from "../dto/bid";

export default class BidRepository {
    constructor(private prisma: PrismaClient) {}

    public async asTxn<T>(
        fn: (txn: Prisma.TransactionClient) => Promise<T>
    ): Promise<T> {
        return this.prisma.$transaction(fn);
    }

    public createForAuctionTxn = async (
        txn: Prisma.TransactionClient,
        auctionId: string,
        bidderId: string,
        dto: BidDto
    ) => {
        return txn.bid.create({
            data: {
                amount: dto.amount,
                auctionId,
                bidderId,
            },
        });
    };

    public findCurrentBidForAuctionTxn = async (
        txn: Prisma.TransactionClient,
        auctionId: string
    ) => {
        return txn.bid.findFirst({
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

    public markAsWinningBid = async (id: string) => {
        return this.prisma.bid.update({
            where: {
                id,
            },
            data: {
                isWinning: new Date(),
            },
        });
    };
}
