import type { ImageGroup, PrismaClient } from "@prisma/client";
import type { MediaDto } from "../dto/media";

export default class MediaRepository {
    constructor(private prisma: PrismaClient) {}

    public createForAuction = async (
        auctionId: string,
        group: ImageGroup,
        media: MediaDto
    ) => {
        return this.prisma.media.create({
            data: {
                auctionId,
                group,
                url: media.url,
                order: media.order,
            },
        });
    };

    public createManyForAuction = async (
        auctionId: string,
        group: ImageGroup,
        media: MediaDto[]
    ) => {
        return this.prisma.media.createMany({
            data: media.map((m) => ({
                auctionId,
                group,
                url: m.url,
                order: m.order,
            })),
        });
    };
}
