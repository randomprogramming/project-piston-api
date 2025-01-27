import { AuctionState, type PrismaClient } from "@prisma/client";
import type {
    AuctionCarInformationDto,
    AuctionContactDetailsDto,
} from "../dto/auction";

export default class AuctionRepository {
    constructor(private prisma: PrismaClient) {}

    public createWithStateSubmitted = async (
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

            return auction;
        });
    };

    public findAllWhereStateIsSubmittedOrUnder_ReviewLimit10OrderByUpdatedAtIncludeAll =
        async () => {
            return this.prisma.auction.findMany({
                where: {
                    state: {
                        in: [AuctionState.SUBMITTED, AuctionState.UNDER_REVIEW],
                    },
                },
                include: {
                    carInformation: true,
                    contactDetails: true,
                    media: true,
                    seller: {
                        omit: {
                            password: true,
                            provider: true,
                            role: true,
                        },
                    },
                },
                take: 10,
                orderBy: {
                    updatedAt: "desc",
                },
            });
        };
}
