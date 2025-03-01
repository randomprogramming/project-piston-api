import type AuctionRepository2 from "../repository/AuctionRepository2";
import type { AuctionDto, PaginatedAuctionQueryDto } from "../dto/auction";
import type { MediaUploadDto } from "../dto/media";
import type MediaRepository from "../repository/MediaRepository";
import {
    AuctionState,
    ContactType,
    type AuctionCarInformation,
} from "@prisma/client";
import { Err, Ok, type Result } from "../result";
import logger from "../logger";
import { hashDate } from "../util/date";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";
import { sanitizeURLString } from "../util/url";
import { FEATURED_AUCTIONS_COUNT } from "../env";

export default class AuctionService {
    constructor(
        private auctionRepo: AuctionRepository2,
        private mediaRepo: MediaRepository
    ) {}

    private generatePrettyId = (info: Omit<AuctionCarInformation, "vin">) => {
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

    public submitAuction = async (dto: AuctionDto, sellerId: string) => {
        if (
            dto.contactDetails.type === ContactType.DEALER &&
            (dto.contactDetails.dealerName ?? "").length === 0
        ) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("dealerName", "missing")
                    .log(
                        "contactDetails is DEALER, but dealerName isn't supplied.",
                        "submitAuction"
                    )
                    .getMessage()
            );
        } else if ((dto.contactDetails.name ?? "").length === 0) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("name", "missing")
                    .log(
                        "contactDetails is PRIVATE, but nane isn't supplied.",
                        "submitAuction"
                    )
                    .getMessage()
            );
        }

        const auction = await this.auctionRepo.submit(
            sellerId,
            dto.carInformation,
            dto.contactDetails
        );

        return Ok(auction);
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
                    .log(`Couldn't find auction '${id}'`, "auctionGoLive")
                    .getMessage()
            );
        }

        if (auction.state !== AuctionState.UNDER_REVIEW) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("invalid_state")
                    .log(
                        `Expected state UNDER_REVIEW, found '${auction.state}'`,
                        "auctionGoLive"
                    )
                    .getMessage()
            );
        }

        const liveFeaturedAuctionCount =
            await this.auctionRepo.countLiveFeaturedAuctions();

        const prettyId = this.generatePrettyId(auction.carInformation);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        await this.auctionRepo.auctionGoLive(id, {
            prettyId,
            startDate,
            endDate,
            // If we don't have enough featured auctions live right now, by default make this new one featured
            featured: liveFeaturedAuctionCount < FEATURED_AUCTIONS_COUNT,
        });
        logger.info(
            `Auction '${auction.id}' is live with prettyId '${prettyId}'`
        );
        return Ok();
    };

    /**
     * Get the public view of an auction.
     */
    public getAuction = async (prettyId: string) => {
        return this.auctionRepo.getFull({ prettyId });
    };

    public getAuctionById = async (id: string) => {
        return this.auctionRepo.getFull({ id });
    };

    public getAuctionsPaginated = async (q: PaginatedAuctionQueryDto) => {
        return this.auctionRepo.findManyLiveBasicPaginated(q);
    };

    public getAuctionsOfSeller = async (sellerId: string) => {
        return this.auctionRepo.findManyFullPaginated({
            sellerId,
        });
    };

    /**
     * Accept a submitted auction. Meaning, move it to "PENDING_CHANGES" but only if it was in the "SUBMITTED" state
     * Also update the car brand and car model fields in the AuctionCarInformation
     * This will create the car model or car brand rows in the db if they don't already exist for that model/brand
     */
    public acceptSubbmittedAuction = async (id: string) => {
        return this.auctionRepo.acceptSubmittedAndCreateCarModel(id);
    };

    public addMedia = async (
        id: string,
        sellerId: string,
        mediaUploadDto: MediaUploadDto
    ): Promise<Result<undefined, string>> => {
        const auction = await this.auctionRepo.findAuctionForUploadingMedia(
            id,
            sellerId
        );
        if (!auction) {
            return Err("not_found");
        }
        // Submitted auctions may only have 1 photo in the beggining, and then we later ask for more photos
        if (
            auction.state === AuctionState.SUBMITTED &&
            auction._count.media > 0
        ) {
            return Err("submitted_auction_already_has_media");
        }
        // TODO: Make this 200 a env variable
        if (auction._count.media + mediaUploadDto.media.length > 200) {
            return Err("too_many_photos");
        }

        const existingMediaCount = await this.mediaRepo.countForAuctionAndGroup(
            auction.id,
            mediaUploadDto.group
        );
        await this.mediaRepo.createManyForAuction(
            id,
            mediaUploadDto.group,
            mediaUploadDto.media,
            existingMediaCount
        );
        return Ok();
    };
}
