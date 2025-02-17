import type AuctionRepository from "../repository/AuctionRepository";
import type AuctionRepository2 from "../repository/AuctionRepository2";
import {
    AuctionState,
    ImageGroup,
    type AuctionCarInformation,
} from "@prisma/client";
import { Err, Ok, type Result } from "../result";
import logger from "../logger";
import { hashDate } from "../util/date";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";
import { sanitizeURLString } from "../util/url";

export default class AuctionService {
    constructor(
        private auctionRepo: AuctionRepository,
        private auctionRepo2: AuctionRepository2
    ) {}

    private generatePrettyId = (info: AuctionCarInformation) => {
        const nameArr: string[] = [];
        nameArr.push(info.modelYear.toString());
        // TODO: Right now we are using user-entry brand and model because we don't have the system in place to
        // Convert them from user entry to actual brand and model fields.. When we do, we should use that here
        nameArr.push(info.ueCarBrand);
        nameArr.push(info.ueCarModel);
        if (info.trim?.length) {
            nameArr.push(info.trim);
        }
        // Adding a random set of characters to the URL to avoid duplicates
        nameArr.push(hashDate(new Date()));

        const str = nameArr.join("-");
        const sanitized = sanitizeURLString(str);
        return sanitized.toLowerCase();
    };

    public auctionGoLive = async (
        id: string
    ): Promise<Result<undefined, string>> => {
        const auction = await this.auctionRepo2.findByIdIncludeCarInformation(
            id
        );

        if (!auction) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("not_found")
                    .log(`Couldn't find auction '${id}'`)
                    .getMessage()
            );
        }

        if (auction.state !== AuctionState.UNDER_REVIEW) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("invalid_state")
                    .log(
                        `Expected state UNDER_REVIEW, found '${auction.state}'`
                    )
                    .getMessage()
            );
        }

        const prettyId = this.generatePrettyId(auction.carInformation);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        await this.auctionRepo2.auctionGoLive(id, {
            prettyId,
            startDate,
            endDate,
        });
        logger.info(
            `Auction '${auction.id}' is live with prettyId '${auction.prettyId}'`
        );
        return Ok();
    };

    /**
     * Get the public view of an auction.
     */
    public getAuction = async (prettyId: string) => {
        return this.auctionRepo2.getFull(prettyId);
    };

    public getAuctionById = async (id: string) => {
        const auction = await this.auctionRepo2.findById(id);
        if (!auction || !auction.prettyId) {
            return null;
        }

        return this.getAuction(auction.prettyId);
    };

    public getAuctionsPaginated = async () => {
        return this.auctionRepo2.findManyBasicPaginated();
    };

    public getAuctionsOfSeller = async (sellerId: string) => {
        return this.auctionRepo2.findMany(
            { sellerId },
            {
                include: {
                    carInformation: true,
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
            }
        );
    };
}
