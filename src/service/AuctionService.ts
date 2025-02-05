import type AuctionRepository from "../repository/AuctionRepository";
import { AuctionState, type AuctionCarInformation } from "@prisma/client";
import { Err, Ok, type Result } from "../result";
import logger from "../logger";
import { hashDate } from "../util/date";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";
import { sanitizeURLString } from "../util/url";

export default class AuctionService {
    constructor(private auctionRepo: AuctionRepository) {}

    private generatePrettyId = (info: AuctionCarInformation) => {
        // TODO: Right now we are using user-entry brand and model because we don't have the system in place to
        // Convert them from user entry to actual brand and model fields.. When we do, we should use that here
        const str = `${info.modelYear}-${info.ueCarBrand}-${info.ueCarModel}-${
            info.trim
        }-${hashDate(info.createdAt)}`;
        const sanitized = sanitizeURLString(str);
        return sanitized.toLowerCase();
    };

    public auctionGoLive = async (
        id: string
    ): Promise<Result<undefined, string>> => {
        const auction = await this.auctionRepo.findByIdIncludeCarInformation(
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
        await this.auctionRepo.updateStateToLiveAndPrettyId(id, prettyId);
        logger.info(
            `Auction '${auction.id}' is live with prettyId '${auction.prettyId}'`
        );
        return Ok();
    };
}
