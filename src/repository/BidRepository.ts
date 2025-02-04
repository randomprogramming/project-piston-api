import type { Bid, Prisma, PrismaClient } from "@prisma/client";
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
        dto: BidDto
    ) => {
        return this.prisma.bid.create({
            data: {
                amount: dto.amount,
                auctionId,
                bidderId,
            },
        });
    };

    public findHighestBidForAuction = async (
        auctionId: string
    ): Promise<Bid | null> => {
        return this.prisma.bid.findFirst({
            where: {
                auctionId,
            },
            orderBy: {
                amount: "desc",
            },
        });
    };
}
