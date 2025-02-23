import type { ImageGroup, PrismaClient } from "@prisma/client";
import type { MediaDto } from "../dto/media";

export default class MediaRepository {
    constructor(private prisma: PrismaClient) {}

    public createManyForAuction = async (
        auctionId: string,
        group: ImageGroup,
        media: MediaDto[],
        existingMediaCount: number
    ) => {
        return this.prisma.media.createMany({
            data: media.map((m) => ({
                auctionId,
                group,
                url: m.url,
                order: existingMediaCount++,
            })),
        });
    };

    public countForAuctionAndGroup = async (
        auctionId: string,
        group: ImageGroup
    ) => {
        return this.prisma.media.count({
            where: {
                auctionId,
                group,
            },
        });
    };
}
