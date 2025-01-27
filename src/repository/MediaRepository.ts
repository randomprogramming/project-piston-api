import type { PrismaClient } from "@prisma/client";

export default class MediaRepository {
    constructor(private prisma: PrismaClient) {}

    public createForAuction = async (
        auctionId: string,
        path: string,
        url: string
    ) => {
        return this.prisma.media.create({
            data: {
                auctionId,
                path,
                url,
            },
        });
    };
}
