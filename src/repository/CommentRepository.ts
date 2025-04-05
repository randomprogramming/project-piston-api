import type { CommentDto } from "../dto/commentOrBid";
import { Prisma, type PrismaClient } from "@prisma/client";

export default class CommentRepository {
    constructor(private prisma: PrismaClient) {}

    public create = async (
        accountId: string,
        auctionId: string,
        dto: CommentDto
    ) => {
        return this.prisma.comment.create({
            data: {
                ...dto,
                accountId,
                auctionId,
            },
        });
    };

    /**
     * Create a union of comments and bids for an auction, because we want to show them in the same place sorted by createdAt
     */
    public getCommentsAndBids = async (
        auctionId: string,
        take: number,
        cursor?: string
    ) => {
        const countRes = await this.prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*)::int AS count
            FROM (
                SELECT "id", "createdAt" FROM "Comment" WHERE "auctionId" = ${auctionId}
                UNION ALL
                SELECT "id", "createdAt" FROM "Bid" WHERE "auctionId" = ${auctionId}
            ) AS total_entries
        `;
        const count = countRes.at(0)?.count;

        const data = await this.prisma.$queryRaw`
            SELECT 
                c."id", 
                c."auctionId", 
                c."content", 
                a."username", 
                c."createdAt", 
                'comment' AS type
            FROM "Comment" c
            JOIN "Account" a ON c."accountId" = a."id"
            WHERE c."auctionId" = ${auctionId}

            UNION ALL

            SELECT 
                b."id", 
                b."auctionId",
                CAST(b."amount" AS TEXT) AS "content", 
                a."username", 
                b."createdAt", 
                'bid' AS type
            FROM "Bid" b
            JOIN "Account" a ON b."bidderId" = a."id"
            WHERE b."auctionId" = ${auctionId}
            
            ORDER BY "createdAt" DESC
            LIMIT ${take}
            ${
                cursor
                    ? Prisma.sql`OFFSET (
                        SELECT COUNT(*) FROM (
                            SELECT "id", "createdAt" FROM "Comment" WHERE "auctionId" = ${auctionId}
                            UNION ALL
                            SELECT "id", "createdAt" FROM "Bid" WHERE "auctionId" = ${auctionId}
                        ) AS all_activities WHERE "createdAt" >= ${cursor}::TIMESTAMP
                    )`
                    : Prisma.empty
            }
        `;

        return {
            count,
            data,
        };
    };
}
